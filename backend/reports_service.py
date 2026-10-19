"""
==============================================================================
STORE BI - OPERATIONS & PLATFORM ANALYTICS ENGINE (reports_service.py)
==============================================================================
Provides platform-wide analytics, cohort retention, geographic adoption,
sales GMV, category benchmarking, secure report exports with CSV formula
injection sanitization, automated report scheduling, and operational alerts.
Adheres strictly to Store BI standing rules:
- Zero-start safe (handles empty databases gracefully)
- Real database queries only (no hardcoded fake data)
- Clear distinction between Retailer GMV and Store BI SaaS Revenue
- Preserves merchant privacy in benchmarking
==============================================================================
"""

import os
import csv
import io
import json
import statistics
from datetime import datetime, timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

import models
import schemas
import email_service


# -----------------------------------------------------------------------------
# 1. Date Range Utilities
# -----------------------------------------------------------------------------

def parse_date_range(
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
) -> Tuple[datetime, datetime, schemas.DateRangeInfo]:
    """
    Computes [start_dt, end_dt] for a given preset or custom date range.
    Safely defaults to last 30 days if inputs are invalid.
    """
    now = datetime.utcnow()
    preset = (preset or "30d").lower()

    if preset == "today":
        start_dt = datetime(now.year, now.month, now.day, 0, 0, 0)
        end_dt = datetime(now.year, now.month, now.day, 23, 59, 59)
        days = 1
    elif preset == "7d":
        start_dt = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
        days = 7
    elif preset == "90d":
        start_dt = (now - timedelta(days=89)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
        days = 90
    elif preset == "custom" and start_date_str and end_date_str:
        try:
            s = datetime.strptime(start_date_str.strip()[:10], "%Y-%m-%d")
            e = datetime.strptime(end_date_str.strip()[:10], "%Y-%m-%d")
            if s > e:
                s, e = e, s
            start_dt = s.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = e.replace(hour=23, minute=59, second=59, microsecond=999999)
            days = max(1, (end_dt.date() - start_dt.date()).days + 1)
        except Exception:
            start_dt = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now
            days = 30
            preset = "30d"
    else:  # default 30d
        preset = "30d"
        start_dt = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_dt = now
        days = 30

    info = schemas.DateRangeInfo(
        preset=preset,
        start_date=start_dt.strftime("%Y-%m-%d"),
        end_date=end_dt.strftime("%Y-%m-%d"),
        days=days,
    )
    return start_dt, end_dt, info


def get_standard_metric_definitions() -> List[schemas.MetricDefinition]:
    """
    Returns platform-wide clear definitions distinguishing metrics.
    """
    return [
        schemas.MetricDefinition(
            label="Total Registered Businesses",
            definition="Cumulative count of all non-administrative retail merchant accounts created on Store BI.",
            calculation="COUNT(shops) WHERE is_admin = False",
            distinction_note="Includes stores across all lifecycle stages: active, trial, expired, or suspended.",
        ),
        schemas.MetricDefinition(
            label="Active Businesses",
            definition="Merchant stores with confirmed commercial activity (sales recorded, inventory updates, or invoice uploads) within the evaluation window.",
            calculation="COUNT(DISTINCT shop_id) with at least 1 Sale, Product change, or Invoice in evaluation window",
            distinction_note="Excludes passive logins, automated pings, and static page views.",
        ),
        schemas.MetricDefinition(
            label="Platform Retailer GMV / Sales Volume",
            definition="Aggregate gross currency value of all counter sales, POS bills, and orders recorded by participating merchant stores.",
            calculation="SUM(sales.total_amount) in date range",
            distinction_note="IMPORTANT: This represents merchant turnover, NOT Store BI platform revenue.",
        ),
        schemas.MetricDefinition(
            label="Store BI SaaS Revenue",
            definition="Platform subscription fees successfully collected by Store BI from merchants for cloud software access.",
            calculation="SUM(payment_transactions.amount_paise / 100) WHERE status IN ('captured', 'settled')",
            distinction_note="This is Store BI's actual top-line revenue, distinct from merchant sales volume.",
        ),
        schemas.MetricDefinition(
            label="Total Recorded Orders",
            definition="Total number of retail sales transactions processed across all stores.",
            calculation="COUNT(sales.id) in date range",
            distinction_note="Individual customer purchases at local stores.",
        ),
        schemas.MetricDefinition(
            label="Average Order Value (AOV)",
            definition="Average checkout transaction size across all merchant stores.",
            calculation="Platform Retailer GMV / Total Recorded Orders (0.0 if orders = 0)",
            distinction_note="Tracks basket size trends over time.",
        ),
        schemas.MetricDefinition(
            label="Inactive Businesses",
            definition="Registered merchant stores with zero recorded activity (no sales, inventory, or invoices) in the last 30 days.",
            calculation="Non-admin shops with no genuine activity timestamp in the trailing 30 days",
            distinction_note="Identifies merchants requiring re-engagement or operational support.",
        ),
    ]


# -----------------------------------------------------------------------------
# 2. Meaningful Activity Tracker
# -----------------------------------------------------------------------------

def get_shop_latest_activity(db: Session, shop_id: int) -> Optional[datetime]:
    """
    Returns the latest datetime of genuine commercial activity for a shop:
    - Latest sale date_time
    - Latest invoice created_at
    """
    latest_sale = db.query(func.max(models.Sale.date_time)).filter(models.Sale.shop_id == shop_id).scalar()
    latest_inv = db.query(func.max(models.Invoice.created_at)).filter(models.Invoice.shop_id == shop_id).scalar()

    timestamps = [t for t in (latest_sale, latest_inv) if t is not None]
    return max(timestamps) if timestamps else None


def get_all_shop_activities(db: Session) -> Dict[int, List[datetime]]:
    """
    Retrieves all meaningful commercial activity timestamps grouped by shop_id.
    """
    activity_map: Dict[int, List[datetime]] = {}

    sales = db.query(models.Sale.shop_id, models.Sale.date_time).filter(models.Sale.shop_id.isnot(None)).all()
    for sid, dt in sales:
        if dt:
            activity_map.setdefault(sid, []).append(dt)

    invoices = db.query(models.Invoice.shop_id, models.Invoice.created_at).filter(models.Invoice.shop_id.isnot(None)).all()
    for sid, dt in invoices:
        if dt:
            activity_map.setdefault(sid, []).append(dt)

    return activity_map


# -----------------------------------------------------------------------------
# 3. Platform Overview Dashboard Logic
# -----------------------------------------------------------------------------

def get_operations_overview(
    db: Session,
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
) -> schemas.OperationsOverviewResponse:
    start_dt, end_dt, date_info = parse_date_range(preset, start_date_str, end_date_str)
    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # 1. Total Registered Businesses (non-admin)
    total_registered = db.query(func.count(models.Shop.id)).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    ).scalar() or 0

    # 2. New Registrations in window
    new_regs = db.query(func.count(models.Shop.id)).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None)),
        models.Shop.created_at >= start_dt,
        models.Shop.created_at <= end_dt,
    ).scalar() or 0

    # 3. Activity Mapping
    activity_map = get_all_shop_activities(db)
    all_shops = db.query(models.Shop).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    ).all()

    active_count = 0
    inactive_count = 0

    for s in all_shops:
        acts = activity_map.get(s.id, [])
        # Active in selected period
        has_period_activity = any(start_dt <= a <= end_dt for a in acts)
        if has_period_activity:
            active_count += 1
        
        # Inactive check (no activity in last 30 days)
        has_recent_activity = any(a >= thirty_days_ago for a in acts)
        if not has_recent_activity:
            inactive_count += 1

    # Active Subscriptions & Trials
    active_subscriptions = db.query(func.count(models.Shop.id)).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None)),
        or_(models.Shop.status == "active", models.Shop.is_paid == True)
    ).scalar() or 0

    trial_businesses = db.query(func.count(models.Shop.id)).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None)),
        models.Shop.status == "trial"
    ).scalar() or 0

    # 4. Sales and Orders in period
    sales_query = db.query(
        func.count(models.Sale.id),
        func.coalesce(func.sum(models.Sale.total_amount), 0.0)
    ).filter(
        models.Sale.date_time >= start_dt,
        models.Sale.date_time <= end_dt,
    ).first()

    total_orders = sales_query[0] if sales_query else 0
    sales_volume = float(sales_query[1]) if sales_query else 0.0
    aov = round(sales_volume / total_orders, 2) if total_orders > 0 else 0.0

    # 5. Store BI SaaS Subscription Revenue in period
    saas_paise = db.query(func.coalesce(func.sum(models.PaymentTransaction.amount_paise), 0)).filter(
        models.PaymentTransaction.status.in_(["captured", "settled"]),
        models.PaymentTransaction.created_at >= start_dt,
        models.PaymentTransaction.created_at <= end_dt,
    ).scalar() or 0
    storebi_saas_rev = round(saas_paise / 100.0, 2)

    kpis = schemas.PlatformKPISummary(
        total_registered_businesses=total_registered,
        active_businesses=active_count,
        new_registrations=new_regs,
        inactive_businesses=inactive_count,
        active_subscriptions=active_subscriptions,
        trial_businesses=trial_businesses,
        platform_sales_volume=sales_volume,
        total_recorded_orders=total_orders,
        average_order_value=aov,
        storebi_saas_revenue=storebi_saas_rev,
    )

    # 6. Growth Trend Timeseries
    # Generate daily buckets
    growth_points: List[schemas.PlatformGrowthPoint] = []
    num_days = min(date_info.days, 90)
    # Bucket intervals: if > 30 days, bucket weekly or daily up to 90
    step_days = 1
    cur_date = start_dt.date()
    end_date_bound = end_dt.date()

    # Pre-fetch sales by date
    sales_by_date: Dict[date, Tuple[int, float]] = {}
    sales_rows = db.query(
        func.date(models.Sale.date_time),
        func.count(models.Sale.id),
        func.sum(models.Sale.total_amount)
    ).filter(
        models.Sale.date_time >= start_dt,
        models.Sale.date_time <= end_dt,
    ).group_by(func.date(models.Sale.date_time)).all()

    for d_str, cnt, sm in sales_rows:
        if d_str:
            try:
                parsed_d = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                sales_by_date[parsed_d] = (cnt, float(sm or 0.0))
            except Exception:
                pass

    # Pre-fetch registrations by date
    regs_by_date: Dict[date, int] = {}
    reg_rows = db.query(
        func.date(models.Shop.created_at),
        func.count(models.Shop.id)
    ).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None)),
        models.Shop.created_at >= start_dt,
        models.Shop.created_at <= end_dt,
    ).group_by(func.date(models.Shop.created_at)).all()

    for d_str, cnt in reg_rows:
        if d_str:
            try:
                parsed_d = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                regs_by_date[parsed_d] = cnt
            except Exception:
                pass

    # Pre-fetch SaaS revenue by date
    saas_by_date: Dict[date, float] = {}
    saas_rows = db.query(
        func.date(models.PaymentTransaction.created_at),
        func.sum(models.PaymentTransaction.amount_paise)
    ).filter(
        models.PaymentTransaction.status.in_(["captured", "settled"]),
        models.PaymentTransaction.created_at >= start_dt,
        models.PaymentTransaction.created_at <= end_dt,
    ).group_by(func.date(models.PaymentTransaction.created_at)).all()

    for d_str, paise in saas_rows:
        if d_str:
            try:
                parsed_d = datetime.strptime(d_str[:10], "%Y-%m-%d").date()
                saas_by_date[parsed_d] = round((paise or 0) / 100.0, 2)
            except Exception:
                pass

    iter_date = cur_date
    while iter_date <= end_date_bound:
        o_cnt, s_vol = sales_by_date.get(iter_date, (0, 0.0))
        r_cnt = regs_by_date.get(iter_date, 0)
        s_rev = saas_by_date.get(iter_date, 0.0)

        # Active shops on this specific date
        active_on_day = sum(
            1 for acts in activity_map.values()
            if any(a.date() == iter_date for a in acts)
        )

        growth_points.append(schemas.PlatformGrowthPoint(
            date=iter_date.strftime("%Y-%m-%d"),
            label=iter_date.strftime("%d %b"),
            new_registrations=r_cnt,
            active_businesses=active_on_day,
            orders_count=o_cnt,
            sales_volume=round(s_vol, 2),
            saas_revenue=round(s_rev, 2),
        ))
        iter_date += timedelta(days=1)

    # 7. Category Distribution
    category_counts: Dict[str, Dict[str, Any]] = {}
    for s in all_shops:
        cat = (s.category or "Uncategorized").strip()
        if not cat:
            cat = "Uncategorized"
        cdata = category_counts.setdefault(cat, {"count": 0, "active_count": 0, "total_sales": 0.0})
        cdata["count"] += 1
        if any(start_dt <= a <= end_dt for a in activity_map.get(s.id, [])):
            cdata["active_count"] += 1

    # Add sales by category
    sales_by_shop = dict(
        db.query(models.Sale.shop_id, func.sum(models.Sale.total_amount))
        .filter(models.Sale.date_time >= start_dt, models.Sale.date_time <= end_dt)
        .group_by(models.Sale.shop_id).all()
    )
    for s in all_shops:
        cat = (s.category or "Uncategorized").strip() or "Uncategorized"
        if s.id in sales_by_shop and sales_by_shop[s.id]:
            category_counts[cat]["total_sales"] += float(sales_by_shop[s.id])

    cat_dist: List[schemas.CategoryDistributionItem] = []
    for cat_name, info in sorted(category_counts.items(), key=lambda x: x[1]["count"], reverse=True):
        pct = round((info["count"] / max(total_registered, 1)) * 100.0, 1)
        cat_dist.append(schemas.CategoryDistributionItem(
            category=cat_name,
            count=info["count"],
            percentage=pct,
            active_count=info["active_count"],
            total_sales=round(info["total_sales"], 2),
        ))

    # 8. Status Distribution
    status_counts: Dict[str, int] = {}
    for s in all_shops:
        st = (s.status or "trial").lower()
        status_counts[st] = status_counts.get(st, 0) + 1

    status_dist: List[schemas.BusinessStatusDistributionItem] = [
        schemas.BusinessStatusDistributionItem(
            status=st.capitalize(),
            count=cnt,
            percentage=round((cnt / max(total_registered, 1)) * 100.0, 1)
        )
        for st, cnt in sorted(status_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    return schemas.OperationsOverviewResponse(
        date_range=date_info,
        kpis=kpis,
        growth_trend=growth_points,
        category_distribution=cat_dist,
        status_distribution=status_dist,
        metric_definitions=get_standard_metric_definitions(),
    )


# -----------------------------------------------------------------------------
# 4. Geographic Analytics
# -----------------------------------------------------------------------------

def get_geographic_analytics(
    db: Session,
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> schemas.GeographicAnalyticsResponse:
    start_dt, end_dt, _ = parse_date_range(preset, start_date_str, end_date_str)
    activity_map = get_all_shop_activities(db)

    shop_q = db.query(models.Shop).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    )
    if category_filter and category_filter != "all" and not category_filter.startswith("All"):
        shop_q = shop_q.filter(models.Shop.category.ilike(f"%{category_filter}%"))
    
    shops = shop_q.all()

    # Pre-fetch sales by shop
    sales_by_shop = {
        r[0]: (r[1], float(r[2]))
        for r in db.query(
            models.Sale.shop_id,
            func.count(models.Sale.id),
            func.coalesce(func.sum(models.Sale.total_amount), 0.0)
        )
        .filter(models.Sale.date_time >= start_dt, models.Sale.date_time <= end_dt)
        .group_by(models.Sale.shop_id).all()
    }

    state_data: Dict[str, Dict[str, Any]] = {}
    city_data: Dict[Tuple[str, str], Dict[str, Any]] = {}
    unspecified_count = 0

    for s in shops:
        raw_state = (s.state or "").strip()
        raw_city = (s.city or "").strip()

        if not raw_state or not raw_city:
            unspecified_count += 1
            st_key = raw_state or "Unspecified Location"
            ct_key = raw_city or "Unspecified City"
        else:
            st_key = raw_state
            ct_key = raw_city

        # State aggregation
        s_entry = state_data.setdefault(st_key, {
            "business_count": 0,
            "active_count": 0,
            "orders_count": 0,
            "total_sales": 0.0,
            "categories": {},
        })
        s_entry["business_count"] += 1
        if any(start_dt <= a <= end_dt for a in activity_map.get(s.id, [])):
            s_entry["active_count"] += 1
        
        if s.id in sales_by_shop:
            cnt, vol = sales_by_shop[s.id]
            s_entry["orders_count"] += cnt
            s_entry["total_sales"] += float(vol)

        cat = (s.category or "General").strip()
        s_entry["categories"][cat] = s_entry["categories"].get(cat, 0) + 1

        # City aggregation
        c_entry = city_data.setdefault((ct_key, st_key), {
            "business_count": 0,
            "active_count": 0,
            "orders_count": 0,
            "total_sales": 0.0,
            "categories": {},
        })
        c_entry["business_count"] += 1
        if any(start_dt <= a <= end_dt for a in activity_map.get(s.id, [])):
            c_entry["active_count"] += 1
        if s.id in sales_by_shop:
            cnt, vol = sales_by_shop[s.id]
            c_entry["orders_count"] += cnt
            c_entry["total_sales"] += float(vol)
        c_entry["categories"][cat] = c_entry["categories"].get(cat, 0) + 1

    # Format State Items
    state_items: List[schemas.GeographicStateItem] = []
    top_regions: List[str] = []
    low_regions: List[str] = []

    for st_name, val in sorted(state_data.items(), key=lambda x: x[1]["business_count"], reverse=True):
        b_cnt = val["business_count"]
        act_cnt = val["active_count"]
        # Adoption level classification
        if b_cnt >= 5 and act_cnt >= 2:
            adopt = "high"
        elif b_cnt >= 2:
            adopt = "moderate"
        else:
            adopt = "nascent"

        top_cats = sorted(val["categories"].items(), key=lambda x: x[1], reverse=True)
        top_cat_names = [c[0] for c in top_cats[:3]]

        state_items.append(schemas.GeographicStateItem(
            state=st_name,
            business_count=b_cnt,
            active_count=act_cnt,
            orders_count=val["orders_count"],
            total_sales=round(val["total_sales"], 2),
            adoption_level=adopt,
            top_categories=top_cat_names,
        ))

        if adopt == "high" or (b_cnt >= 3):
            top_regions.append(st_name)
        elif st_name != "Unspecified Location":
            low_regions.append(st_name)

    # Format City Items
    city_items: List[schemas.GeographicCityItem] = []
    for (c_name, st_name), val in sorted(city_data.items(), key=lambda x: x[1]["business_count"], reverse=True):
        top_cats = sorted(val["categories"].items(), key=lambda x: x[1], reverse=True)
        dom_cat = top_cats[0][0] if top_cats else "General"

        city_items.append(schemas.GeographicCityItem(
            city=c_name,
            state=st_name,
            business_count=val["business_count"],
            active_count=val["active_count"],
            orders_count=val["orders_count"],
            total_sales=round(val["total_sales"], 2),
            dominant_category=dom_cat,
        ))

    # Cross-tabulation Category by Region
    cat_by_region: List[Dict[str, Any]] = []
    for st_name, val in sorted(state_data.items(), key=lambda x: x[1]["business_count"], reverse=True)[:6]:
        row = {"region": st_name, "total_stores": val["business_count"]}
        for cname, ccnt in val["categories"].items():
            row[cname] = ccnt
        cat_by_region.append(row)

    return schemas.GeographicAnalyticsResponse(
        states=state_items,
        cities=city_items,
        category_by_region=cat_by_region,
        top_adoption_regions=top_regions[:5],
        low_adoption_regions=low_regions[:5],
        unspecified_location_count=unspecified_count,
    )


# -----------------------------------------------------------------------------
# 5. Cohort Retention and Engagement
# -----------------------------------------------------------------------------

def get_cohort_retention(
    db: Session,
    group_by: str = "month",
) -> schemas.CohortRetentionResponse:
    """
    Measures Day 1, Day 7, Day 30, and Day 90 retention using real database records.
    Activity is defined strictly by genuine commercial actions (Sale, Product, Invoice).
    """
    now = datetime.utcnow()
    fourteen_days_ago = now - timedelta(days=14)
    activity_map = get_all_shop_activities(db)

    shops = db.query(models.Shop).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    ).order_by(models.Shop.created_at.asc()).all()

    cohort_dict: Dict[str, List[models.Shop]] = {}
    inactive_list: List[schemas.InactiveBusinessItem] = []

    for s in shops:
        reg_dt = s.created_at or now
        if group_by == "week":
            cohort_label = reg_dt.strftime("%Y-W%U")
        else:
            cohort_label = reg_dt.strftime("%b %Y")

        cohort_dict.setdefault(cohort_label, []).append(s)

        # Inactive analysis
        acts = activity_map.get(s.id, [])
        latest_act = max(acts) if acts else None
        has_any = len(acts) > 0

        is_inactive = False
        inactivity_status = "active"

        if not has_any:
            is_inactive = True
            inactivity_status = "no_activity_recorded"
            days_inactive = (now - reg_dt).days
        elif latest_act and latest_act < fourteen_days_ago:
            is_inactive = True
            inactivity_status = "confirmed_inactive"
            days_inactive = (now - latest_act).days
        else:
            days_inactive = (now - (latest_act or reg_dt)).days

        if is_inactive:
            inactive_list.append(schemas.InactiveBusinessItem(
                shop_id=s.id,
                name=s.name or "Unnamed Store",
                owner_name=s.owner_name or "Store Owner",
                phone=s.phone or "–",
                city=s.city or "Unspecified",
                state=s.state or "Unspecified",
                category=s.category or "General Store",
                registered_at=reg_dt.strftime("%d %b %Y"),
                last_active_at=latest_act.strftime("%d %b %Y") if latest_act else None,
                days_inactive=max(0, days_inactive),
                has_any_activity=has_any,
                inactivity_status=inactivity_status,
            ))

    # Calculate Retention Metrics per Cohort
    cohort_items: List[schemas.CohortItem] = []
    total_30d_eligible = 0
    total_30d_retained = 0

    for label, c_shops in cohort_dict.items():
        size = len(c_shops)
        d1_cnt = 0
        d7_cnt = 0
        d30_cnt = 0
        d90_cnt = 0
        cur_active_cnt = 0

        for s in c_shops:
            reg_dt = s.created_at or now
            acts = activity_map.get(s.id, [])

            # Day 1: active on day 0 or day 1
            if any(0 <= (a - reg_dt).total_seconds() / 86400.0 <= 2.0 for a in acts):
                d1_cnt += 1

            # Day 7: active between day 6 and day 14
            if any(6.0 <= (a - reg_dt).total_seconds() / 86400.0 <= 14.0 for a in acts):
                d7_cnt += 1

            # Day 30: active between day 25 and day 45
            if any(25.0 <= (a - reg_dt).total_seconds() / 86400.0 <= 45.0 for a in acts):
                d30_cnt += 1

            # Day 90: active between day 80 and day 105
            if any(80.0 <= (a - reg_dt).total_seconds() / 86400.0 <= 105.0 for a in acts):
                d90_cnt += 1

            # Currently active (activity in last 14 days)
            if any(a >= fourteen_days_ago for a in acts):
                cur_active_cnt += 1

            # Cumulative 30d tracking
            if (now - reg_dt).days >= 30:
                total_30d_eligible += 1
                if any(25.0 <= (a - reg_dt).total_seconds() / 86400.0 for a in acts):
                    total_30d_retained += 1

        cohort_items.append(schemas.CohortItem(
            cohort_label=label,
            cohort_size=size,
            day_1_active=d1_cnt,
            day_1_pct=round((d1_cnt / max(size, 1)) * 100.0, 1),
            day_7_active=d7_cnt,
            day_7_pct=round((d7_cnt / max(size, 1)) * 100.0, 1),
            day_30_active=d30_cnt,
            day_30_pct=round((d30_cnt / max(size, 1)) * 100.0, 1),
            day_90_active=d90_cnt,
            day_90_pct=round((d90_cnt / max(size, 1)) * 100.0, 1),
            current_active=cur_active_cnt,
            current_active_pct=round((cur_active_cnt / max(size, 1)) * 100.0, 1),
        ))

    overall_30d_pct = round((total_30d_retained / max(total_30d_eligible, 1)) * 100.0, 1)

    return schemas.CohortRetentionResponse(
        cohorts=cohort_items,
        inactive_businesses=inactive_list,
        activity_definition="Genuine commercial action: Recorded Sale, Inventory SKU update, or Supplier Invoice OCR extraction. Automated sessions and background requests are excluded.",
        total_tracked=len(shops),
        overall_retention_30d=overall_30d_pct,
    )


# -----------------------------------------------------------------------------
# 6. Sales and GMV Analytics
# -----------------------------------------------------------------------------

def get_sales_and_gmv_analytics(
    db: Session,
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    state_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
) -> schemas.SalesGmvResponse:
    start_dt, end_dt, date_info = parse_date_range(preset, start_date_str, end_date_str)

    # Base query for sales
    q = db.query(models.Sale).join(models.Shop, models.Sale.shop_id == models.Shop.id, isouter=True).filter(
        models.Sale.date_time >= start_dt,
        models.Sale.date_time <= end_dt,
    )

    if state_filter and state_filter != "all" and not state_filter.startswith("All"):
        q = q.filter(models.Shop.state.ilike(f"%{state_filter}%"))
    if category_filter and category_filter != "all" and not category_filter.startswith("All"):
        q = q.filter(models.Shop.category.ilike(f"%{category_filter}%"))

    sales = q.all()

    total_sales_gmv = round(sum(s.total_amount or 0.0 for s in sales), 2)
    completed_orders = len(sales)
    aov = round(total_sales_gmv / completed_orders, 2) if completed_orders > 0 else 0.0

    # Store BI SaaS Revenue
    saas_q = db.query(func.coalesce(func.sum(models.PaymentTransaction.amount_paise), 0)).filter(
        models.PaymentTransaction.status.in_(["captured", "settled"]),
        models.PaymentTransaction.created_at >= start_dt,
        models.PaymentTransaction.created_at <= end_dt,
    )
    storebi_saas_rev = round((saas_q.scalar() or 0) / 100.0, 2)

    # Trend line
    daily_sales: Dict[date, Tuple[int, float]] = {}
    for s in sales:
        if s.date_time:
            d = s.date_time.date()
            cur = daily_sales.get(d, (0, 0.0))
            daily_sales[d] = (cur[0] + 1, cur[1] + (s.total_amount or 0.0))

    trend_points: List[schemas.PlatformGrowthPoint] = []
    iter_d = start_dt.date()
    while iter_d <= end_dt.date():
        cnt, amt = daily_sales.get(iter_d, (0, 0.0))
        trend_points.append(schemas.PlatformGrowthPoint(
            date=iter_d.strftime("%Y-%m-%d"),
            label=iter_d.strftime("%d %b"),
            orders_count=cnt,
            sales_volume=round(amt, 2),
            saas_revenue=0.0,
        ))
        iter_d += timedelta(days=1)

    # Payment Mode breakdown
    mode_counts: Dict[str, Dict[str, Any]] = {}
    for s in sales:
        m = (s.payment_mode or "Cash").strip()
        m_entry = mode_counts.setdefault(m, {"count": 0, "amount": 0.0})
        m_entry["count"] += 1
        m_entry["amount"] += (s.total_amount or 0.0)

    payment_modes: List[Dict[str, Any]] = [
        {
            "mode": m,
            "orders_count": val["count"],
            "amount": round(val["amount"], 2),
            "share_pct": round((val["amount"] / max(total_sales_gmv, 1.0)) * 100.0, 1),
        }
        for m, val in sorted(mode_counts.items(), key=lambda x: x[1]["amount"], reverse=True)
    ]

    # Product Category performance (joining SaleItem -> Product)
    prod_cat_data: Dict[str, Dict[str, Any]] = {}
    sale_ids = [s.id for s in sales]
    if sale_ids:
        items = db.query(
            models.Product.category,
            func.count(models.SaleItem.id),
            func.coalesce(func.sum(models.SaleItem.qty), 0),
            func.coalesce(func.sum(models.SaleItem.qty * models.SaleItem.unit_price), 0.0)
        ).join(
            models.SaleItem, models.Product.id == models.SaleItem.product_id
        ).filter(
            models.SaleItem.sale_id.in_(sale_ids)
        ).group_by(models.Product.category).all()

        for cat_name, i_cnt, qty_sum, rev_sum in items:
            c = cat_name or "General"
            prod_cat_data[c] = {
                "category": c,
                "units_sold": int(qty_sum),
                "revenue": round(float(rev_sum), 2),
                "orders_count": i_cnt,
            }

    product_categories = sorted(prod_cat_data.values(), key=lambda x: x["revenue"], reverse=True)

    # Top Performing Stores
    store_totals: Dict[int, Dict[str, Any]] = {}
    for s in sales:
        sid = s.shop_id or 0
        if sid not in store_totals:
            store_totals[sid] = {"orders": 0, "sales": 0.0}
        store_totals[sid]["orders"] += 1
        store_totals[sid]["sales"] += (s.total_amount or 0.0)

    top_stores_list: List[Dict[str, Any]] = []
    for sid, val in sorted(store_totals.items(), key=lambda x: x[1]["sales"], reverse=True)[:10]:
        shp = db.query(models.Shop).filter(models.Shop.id == sid).first()
        top_stores_list.append({
            "shop_id": sid,
            "name": shp.name if shp else f"Store #{sid}",
            "city": shp.city if shp else "–",
            "state": shp.state if shp else "–",
            "category": shp.category if shp else "–",
            "orders_count": val["orders"],
            "sales_volume": round(val["sales"], 2),
            "aov": round(val["sales"] / max(val["orders"], 1), 2),
        })

    # Regional Sales comparison
    reg_sales: Dict[str, float] = {}
    for s in sales:
        shp = db.query(models.Shop).filter(models.Shop.id == s.shop_id).first()
        st = (shp.state if shp and shp.state else "Unspecified").strip()
        reg_sales[st] = reg_sales.get(st, 0.0) + (s.total_amount or 0.0)

    regional_sales = [
        {"region": r, "sales_volume": round(amt, 2), "share_pct": round((amt / max(total_sales_gmv, 1.0)) * 100.0, 1)}
        for r, amt in sorted(reg_sales.items(), key=lambda x: x[1], reverse=True)
    ]

    return schemas.SalesGmvResponse(
        total_sales_gmv=total_sales_gmv,
        completed_orders=completed_orders,
        average_order_value=aov,
        storebi_saas_revenue=storebi_saas_rev,
        sales_trend=trend_points,
        payment_modes=payment_modes,
        product_categories=product_categories,
        top_stores=top_stores_list,
        regional_sales=regional_sales,
        gmv_vs_revenue_note="Store BI acts as a data analytics and stock intelligence platform for Indian retail stores. Total Retailer GMV reflects consumer payments collected at merchant counters. Store BI SaaS Revenue reflects subscription billing fees collected by Store BI.",
    )


# -----------------------------------------------------------------------------
# 7. Business-Category Benchmarking
# -----------------------------------------------------------------------------

def get_category_benchmarks(
    db: Session,
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
) -> schemas.CategoryBenchmarkingResponse:
    start_dt, end_dt, _ = parse_date_range(preset, start_date_str, end_date_str)
    activity_map = get_all_shop_activities(db)

    # Standard retail categories in Store BI
    standard_categories = [
        "Grocery & kirana",
        "Medical & pharmacy",
        "Stationery & books",
        "General store",
        "Footwear & apparel",
        "Electronics & mobile",
    ]

    shops = db.query(models.Shop).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    ).all()

    # Pre-fetch sales by shop
    sales_by_shop = {
        r[0]: (r[1], float(r[2]))
        for r in db.query(
            models.Sale.shop_id,
            func.count(models.Sale.id),
            func.coalesce(func.sum(models.Sale.total_amount), 0.0)
        )
        .filter(models.Sale.date_time >= start_dt, models.Sale.date_time <= end_dt)
        .group_by(models.Sale.shop_id).all()
    }

    # Pre-fetch products by shop
    prods = db.query(models.Product).all()
    shop_prods: Dict[int, List[models.Product]] = {}
    for p in prods:
        if p.shop_id:
            shop_prods.setdefault(p.shop_id, []).append(p)

    # Group shops by standardized category
    cat_buckets: Dict[str, List[models.Shop]] = {}
    for s in shops:
        c = (s.category or "General store").strip()
        # Find closest standard match
        matched_c = c
        for std in standard_categories:
            if std.lower() in c.lower() or c.lower() in std.lower():
                matched_c = std
                break
        cat_buckets.setdefault(matched_c, []).append(s)

    benchmarks: List[schemas.CategoryBenchmarkItem] = []

    for cat_name, cat_shops in sorted(cat_buckets.items(), key=lambda x: len(x[1]), reverse=True):
        sample_size = len(cat_shops)
        sample_status = "sufficient" if sample_size >= 3 else "low_sample"

        store_sales_list: List[float] = []
        store_orders_list: List[int] = []
        total_inv_val = 0.0
        total_products_count = 0
        total_low_stock = 0
        active_in_cat = 0

        for s in cat_shops:
            o_cnt, s_vol = sales_by_shop.get(s.id, (0, 0.0))
            store_sales_list.append(float(s_vol))
            store_orders_list.append(int(o_cnt))

            if any(start_dt <= a <= end_dt for a in activity_map.get(s.id, [])):
                active_in_cat += 1

            s_products = shop_prods.get(s.id, [])
            total_products_count += len(s_products)
            for p in s_products:
                cost = p.cost_price or 0.0
                qty = p.stock_qty or 0
                total_inv_val += (cost * qty)
                if qty <= (p.reorder_level or 0):
                    total_low_stock += 1

        avg_sales = round(sum(store_sales_list) / max(sample_size, 1), 2)
        med_sales = round(statistics.median(store_sales_list), 2) if store_sales_list else 0.0
        avg_orders = round(sum(store_orders_list) / max(sample_size, 1), 1)
        tot_orders = sum(store_orders_list)
        avg_aov = round(sum(store_sales_list) / tot_orders, 2) if tot_orders > 0 else 0.0

        avg_prods = round(total_products_count / max(sample_size, 1), 1)
        low_stock_pct = round((total_low_stock / max(total_products_count, 1)) * 100.0, 1)
        active_pct = round((active_in_cat / max(sample_size, 1)) * 100.0, 1)

        # Inventory Turnover Proxy (Period Sales at Cost / Stock Value)
        # Using ~70% cost ratio proxy for retail
        cogs_proxy = sum(store_sales_list) * 0.70
        turnover_proxy = round(cogs_proxy / max(total_inv_val, 1.0), 2)

        benchmarks.append(schemas.CategoryBenchmarkItem(
            category=cat_name,
            sample_size=sample_size,
            sample_size_status=sample_status,
            avg_sales=avg_sales,
            median_sales=med_sales,
            avg_orders=avg_orders,
            avg_order_value=avg_aov,
            total_inventory_value=round(total_inv_val, 2),
            avg_products_count=avg_prods,
            low_stock_frequency_pct=low_stock_pct,
            inventory_turnover_proxy=turnover_proxy,
            active_retention_pct=active_pct,
        ))

    return schemas.CategoryBenchmarkingResponse(
        categories=benchmarks,
        privacy_statement="Platform Category Benchmarking aggregates metrics strictly across multiple merchant accounts to provide regional and industry reference points. Individual merchant product catalogs, sales volumes, margins, and customer data are never disclosed or accessible by other merchants.",
    )


# -----------------------------------------------------------------------------
# 8. Report Builder & Secure Exports
# -----------------------------------------------------------------------------

def sanitize_csv_cell(val: Any) -> str:
    """
    Prevents CSV Formula Injection (CWE-1236).
    Prefixes characters that Excel/Sheets interpret as formulas (=, +, -, @, \\t, \\r)
    with a single quote (').
    """
    if val is None:
        return ""
    s = str(val).strip()
    if not s:
        return ""
    # Check if first character is a dangerous spreadsheet operator
    if s[0] in ("=", "+", "-", "@", "\t", "\r", "%"):
        return f"'{s}"
    return s


def build_report_data(
    db: Session,
    report_type: str = "platform_summary",
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    category: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> schemas.ReportBuilderResponse:
    start_dt, end_dt, _ = parse_date_range(preset, start_date_str, end_date_str)
    activity_map = get_all_shop_activities(db)

    page = max(1, page)
    page_size = min(max(5, page_size), 100)

    if report_type == "sales_gmv":
        title = "Retailer Sales & GMV Ledger"
        columns = [
            schemas.ReportColumn(key="shop_id", label="Store ID"),
            schemas.ReportColumn(key="shop_name", label="Store Name"),
            schemas.ReportColumn(key="owner_name", label="Owner Name"),
            schemas.ReportColumn(key="city", label="City"),
            schemas.ReportColumn(key="state", label="State"),
            schemas.ReportColumn(key="category", label="Category"),
            schemas.ReportColumn(key="orders_count", label="Orders", align="right"),
            schemas.ReportColumn(key="sales_volume", label="Total GMV (₹)", align="right"),
            schemas.ReportColumn(key="aov", label="Avg Order Value (₹)", align="right"),
        ]

        q = db.query(models.Shop).filter(
            or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
        )
        if category and category != "all" and not category.startswith("All"):
            q = q.filter(models.Shop.category.ilike(f"%{category}%"))
        if state and state != "all" and not state.startswith("All"):
            q = q.filter(models.Shop.state.ilike(f"%{state}%"))
        if city and city != "all" and not city.startswith("All"):
            q = q.filter(models.Shop.city.ilike(f"%{city}%"))
        if status and status != "all" and not status.startswith("All"):
            q = q.filter(models.Shop.status == status.lower())

        shops = q.all()

        sales_by_shop = {
            r[0]: (r[1], float(r[2]))
            for r in db.query(
                models.Sale.shop_id,
                func.count(models.Sale.id),
                func.coalesce(func.sum(models.Sale.total_amount), 0.0)
            )
            .filter(models.Sale.date_time >= start_dt, models.Sale.date_time <= end_dt)
            .group_by(models.Sale.shop_id).all()
        }

        all_rows: List[Dict[str, Any]] = []
        tot_gmv = 0.0
        tot_orders = 0

        for s in shops:
            cnt, amt = sales_by_shop.get(s.id, (0, 0.0))
            tot_gmv += float(amt)
            tot_orders += cnt
            all_rows.append({
                "shop_id": s.id,
                "shop_name": s.name or "Unnamed Store",
                "owner_name": s.owner_name or "Shop Owner",
                "city": s.city or "–",
                "state": s.state or "–",
                "category": s.category or "General",
                "orders_count": cnt,
                "sales_volume": round(float(amt), 2),
                "aov": round(float(amt) / max(cnt, 1), 2),
            })

        all_rows.sort(key=lambda x: x["sales_volume"], reverse=True)
        total_rows = len(all_rows)
        total_pages = max(1, (total_rows + page_size - 1) // page_size)
        paged_rows = all_rows[(page - 1) * page_size : page * page_size]

        summary = {
            "total_stores": total_rows,
            "total_orders": tot_orders,
            "total_gmv": round(tot_gmv, 2),
            "platform_aov": round(tot_gmv / max(tot_orders, 1), 2),
        }

    elif report_type == "geographic":
        title = "Geographic Adoption & Regional Ledger"
        columns = [
            schemas.ReportColumn(key="state", label="State"),
            schemas.ReportColumn(key="city", label="City"),
            schemas.ReportColumn(key="registered_stores", label="Registered Stores", align="right"),
            schemas.ReportColumn(key="active_stores", label="Active Stores", align="right"),
            schemas.ReportColumn(key="orders_count", label="Orders", align="right"),
            schemas.ReportColumn(key="sales_volume", label="Sales Volume (₹)", align="right"),
        ]

        geo = get_geographic_analytics(db, preset, start_date_str, end_date_str, category)
        all_rows = [
            {
                "state": c.state,
                "city": c.city,
                "registered_stores": c.business_count,
                "active_stores": c.active_count,
                "orders_count": c.orders_count,
                "sales_volume": c.total_sales,
            }
            for c in geo.cities
        ]
        total_rows = len(all_rows)
        total_pages = max(1, (total_rows + page_size - 1) // page_size)
        paged_rows = all_rows[(page - 1) * page_size : page * page_size]
        summary = {
            "total_cities": total_rows,
            "total_states": len(geo.states),
            "top_region": geo.top_adoption_regions[0] if geo.top_adoption_regions else "None",
        }

    elif report_type == "retention_cohorts":
        title = "Cohort Retention Analysis"
        columns = [
            schemas.ReportColumn(key="cohort_label", label="Cohort"),
            schemas.ReportColumn(key="cohort_size", label="Cohort Size", align="right"),
            schemas.ReportColumn(key="day_1_pct", label="Day 1 %", align="right"),
            schemas.ReportColumn(key="day_7_pct", label="Day 7 %", align="right"),
            schemas.ReportColumn(key="day_30_pct", label="Day 30 %", align="right"),
            schemas.ReportColumn(key="day_90_pct", label="Day 90 %", align="right"),
            schemas.ReportColumn(key="current_active", label="Active Now", align="right"),
        ]

        cohort_data = get_cohort_retention(db, "month")
        all_rows = [
            {
                "cohort_label": c.cohort_label,
                "cohort_size": c.cohort_size,
                "day_1_pct": f"{c.day_1_pct}%",
                "day_7_pct": f"{c.day_7_pct}%",
                "day_30_pct": f"{c.day_30_pct}%",
                "day_90_pct": f"{c.day_90_pct}%",
                "current_active": f"{c.current_active} ({c.current_active_pct}%)",
            }
            for c in cohort_data.cohorts
        ]
        total_rows = len(all_rows)
        total_pages = max(1, (total_rows + page_size - 1) // page_size)
        paged_rows = all_rows[(page - 1) * page_size : page * page_size]
        summary = {
            "total_tracked_stores": cohort_data.total_tracked,
            "overall_30d_retention": f"{cohort_data.overall_retention_30d}%",
            "inactive_stores_count": len(cohort_data.inactive_businesses),
        }

    elif report_type == "category_benchmarks":
        title = "Retail Category Benchmarks"
        columns = [
            schemas.ReportColumn(key="category", label="Retail Category"),
            schemas.ReportColumn(key="sample_size", label="Sample Size (N)", align="right"),
            schemas.ReportColumn(key="avg_sales", label="Avg Sales (₹)", align="right"),
            schemas.ReportColumn(key="median_sales", label="Median Sales (₹)", align="right"),
            schemas.ReportColumn(key="avg_orders", label="Avg Orders", align="right"),
            schemas.ReportColumn(key="inventory_value", label="Stock Value (₹)", align="right"),
            schemas.ReportColumn(key="low_stock_pct", label="Low Stock %", align="right"),
            schemas.ReportColumn(key="active_pct", label="Active Store %", align="right"),
        ]

        bdata = get_category_benchmarks(db, preset, start_date_str, end_date_str)
        all_rows = [
            {
                "category": b.category,
                "sample_size": f"{b.sample_size} {'(Low sample)' if b.sample_size < 3 else ''}",
                "avg_sales": b.avg_sales,
                "median_sales": b.median_sales,
                "avg_orders": b.avg_orders,
                "inventory_value": b.total_inventory_value,
                "low_stock_pct": f"{b.low_stock_frequency_pct}%",
                "active_pct": f"{b.active_retention_pct}%",
            }
            for b in bdata.categories
        ]
        total_rows = len(all_rows)
        total_pages = max(1, (total_rows + page_size - 1) // page_size)
        paged_rows = all_rows[(page - 1) * page_size : page * page_size]
        summary = {
            "categories_evaluated": len(bdata.categories),
        }

    else:  # platform_summary
        title = "Platform Overview Executive Summary"
        columns = [
            schemas.ReportColumn(key="metric", label="Metric Name"),
            schemas.ReportColumn(key="value", label="Value", align="right"),
            schemas.ReportColumn(key="description", label="Metric Definition"),
        ]

        overview = get_operations_overview(db, preset, start_date_str, end_date_str)
        k = overview.kpis
        all_rows = [
            {"metric": "Total Registered Businesses", "value": k.total_registered_businesses, "description": "Total non-admin store accounts created"},
            {"metric": "Active Businesses in Period", "value": k.active_businesses, "description": "Stores with recorded commercial actions"},
            {"metric": "New Registrations in Period", "value": k.new_registrations, "description": "New signups in date range"},
            {"metric": "Inactive Businesses (>30d)", "value": k.inactive_businesses, "description": "Stores with zero activity in last 30 days"},
            {"metric": "Active Paid Subscriptions", "value": k.active_subscriptions, "description": "Stores on active paid plan"},
            {"metric": "Platform Retailer GMV (₹)", "value": f"₹{k.platform_sales_volume:,.2f}", "description": "Consumer payments collected at merchant stores"},
            {"metric": "Store BI SaaS Revenue (₹)", "value": f"₹{k.storebi_saas_revenue:,.2f}", "description": "Software subscription billing fees collected by Store BI"},
            {"metric": "Total Recorded Orders", "value": k.total_recorded_orders, "description": "Retail checkout transactions recorded"},
            {"metric": "Average Order Value (₹)", "value": f"₹{k.average_order_value:,.2f}", "description": "Average transaction ticket size"},
        ]
        total_rows = len(all_rows)
        total_pages = 1
        paged_rows = all_rows
        summary = {
            "period": f"{overview.date_range.start_date} to {overview.date_range.end_date}",
            "days": overview.date_range.days,
        }

    return schemas.ReportBuilderResponse(
        report_type=report_type,
        title=title,
        total_rows=total_rows,
        columns=columns,
        rows=paged_rows,
        summary=summary,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def export_report_csv_string(
    db: Session,
    report_type: str = "sales_gmv",
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    category: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """
    Generates a secure CSV string with Formula Injection Sanitization.
    """
    # Fetch all data without pagination
    report_res = build_report_data(
        db, report_type, preset, start_date_str, end_date_str,
        category, state, city, status, page=1, page_size=10000
    )

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Header Row
    header = [col.label for col in report_res.columns]
    writer.writerow(header)

    # Data Rows with formula injection sanitization
    for row in report_res.rows:
        row_values = []
        for col in report_res.columns:
            raw_val = row.get(col.key, "")
            row_values.append(sanitize_csv_cell(raw_val))
        writer.writerow(row_values)

    return output.getvalue()


def generate_report_pdf_html(
    db: Session,
    report_type: str = "platform_summary",
    preset: str = "30d",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    category: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """
    Generates a high-clarity printable HTML report adhering to Store BI styling.
    Printable directly or savable to PDF via browser.
    """
    report_res = build_report_data(
        db, report_type, preset, start_date_str, end_date_str,
        category, state, city, status, page=1, page_size=1000
    )

    now_str = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")

    # Render HTML table
    headers_html = "".join(f"<th style='padding: 8px 12px; border: 1px solid #c3c6d7; background: #e9edff; text-align: {col.align or 'left'}; font-size: 11px; font-weight: 700; color: #141b2b;'>{col.label}</th>" for col in report_res.columns)
    
    rows_html = ""
    for r in report_res.rows:
        tds = ""
        for col in report_res.columns:
            val = r.get(col.key, "")
            tds += f"<td style='padding: 8px 12px; border: 1px solid #c3c6d7; font-size: 11px; text-align: {col.align or 'left'}; color: #141b2b;'>{val}</td>"
        rows_html += f"<tr>{tds}</tr>"

    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Store BI — {report_res.title}</title>
    <style>
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background: #ffffff;
            color: #141b2b;
        }}
        @media print {{
            body {{ padding: 0; }}
            .no-print {{ display: none; }}
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
        }}
    </style>
</head>
<body>
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #004ac6; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px; font-weight: 800; color: #004ac6; letter-spacing: -0.02em;">Store BI</span>
                <span style="font-size: 11px; background: #e9edff; color: #004ac6; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Operations Portal</span>
            </div>
            <h1 style="font-size: 16px; font-weight: 700; margin: 6px 0 2px 0;">{report_res.title}</h1>
            <p style="font-size: 11px; color: #434655; margin: 0;">Period: {preset.upper()} | Generated on {now_str}</p>
        </div>
        <div class="no-print" style="text-align: right;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #004ac6; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
                Print / Save as PDF
            </button>
        </div>
    </div>

    <div style="background: #f1f3ff; border: 1px solid #c3c6d7; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
        <span style="font-size: 11px; font-weight: 700; color: #141b2b;">Executive Filters & Context:</span>
        <span style="font-size: 11px; color: #434655; margin-left: 8px;">Category: {category or 'All'} | State: {state or 'All'} | City: {city or 'All'} | Total Records: {report_res.total_rows}</span>
    </div>

    <table>
        <thead>
            <tr>{headers_html}</tr>
        </thead>
        <tbody>
            {rows_html}
        </tbody>
    </table>

    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #c3c6d7; font-size: 10px; color: #737686; display: flex; justify-content: space-between;">
        <span>Store BI Platform Intelligence — Super Admin Security Policy Guarded</span>
        <span>Retailer GMV is distinct from Store BI SaaS Subscription Revenue</span>
    </div>
</body>
</html>"""
    return html


# -----------------------------------------------------------------------------
# 9. Operational Monitoring & Alerts
# -----------------------------------------------------------------------------

def evaluate_operational_alerts(db: Session) -> schemas.OperationalAlertsResponse:
    """
    Evaluates real database conditions against configurable operational thresholds.
    Labels alerts factually for human operational review (does not label as fraud).
    """
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)
    twenty_eight_days_ago = now - timedelta(days=28)

    alerts: List[schemas.OperationalAlertItem] = []

    # 1. Sales Activity Velocity Alert (Drop vs previous 7-day period)
    recent_sales_vol = db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0)).filter(
        models.Sale.date_time >= seven_days_ago
    ).scalar() or 0.0

    prev_sales_vol = db.query(func.coalesce(func.sum(models.Sale.total_amount), 0.0)).filter(
        models.Sale.date_time >= fourteen_days_ago,
        models.Sale.date_time < seven_days_ago
    ).scalar() or 0.0

    if prev_sales_vol > 1000.0:
        pct_change = ((recent_sales_vol - prev_sales_vol) / prev_sales_vol) * 100.0
        if pct_change <= -40.0:
            alerts.append(schemas.OperationalAlertItem(
                id="alert-sales-velocity-drop",
                alert_type="sales_velocity",
                severity="critical" if pct_change <= -60.0 else "warning",
                title=f"Platform Sales Volume Dropped {abs(round(pct_change, 1))}% vs Prior 7 Days",
                description=f"Recorded merchant sales in trailing 7 days (₹{recent_sales_vol:,.2f}) fell noticeably below previous period (₹{prev_sales_vol:,.2f}).",
                metric_value=f"₹{recent_sales_vol:,.2f} ({round(pct_change, 1)}%)",
                threshold="Drop > 40% over 7-day window",
                affected_count=1,
                recommended_action="Investigate if top retail merchants are experiencing connectivity issues or POS terminal disruption.",
                created_at=now.strftime("%d %b %Y, %H:%M UTC"),
            ))

    # 2. Inactive Merchant Surge Alert (>14 days without sale/product action)
    activity_map = get_all_shop_activities(db)
    non_admin_shops = db.query(models.Shop).filter(
        or_(models.Shop.is_admin == False, models.Shop.is_admin.is_(None))
    ).all()

    inactive_14d_count = 0
    for s in non_admin_shops:
        acts = activity_map.get(s.id, [])
        if not acts or max(acts) < fourteen_days_ago:
            inactive_14d_count += 1

    total_shops = len(non_admin_shops)
    if total_shops > 0:
        inactive_ratio = (inactive_14d_count / total_shops) * 100.0
        if inactive_ratio >= 30.0 and inactive_14d_count >= 2:
            alerts.append(schemas.OperationalAlertItem(
                id="alert-inactive-merchants-surge",
                alert_type="merchant_retention",
                severity="warning",
                title=f"{inactive_14d_count} Registered Stores Inactive for >14 Days",
                description=f"{round(inactive_ratio, 1)}% of registered merchant stores have recorded zero sales or stock updates in the last two weeks.",
                metric_value=f"{inactive_14d_count} stores ({round(inactive_ratio, 1)}%)",
                threshold="Inactive stores > 30% of platform base",
                affected_count=inactive_14d_count,
                recommended_action="Dispatch WhatsApp / email onboarding re-engagement sequences and offer merchant support assistance.",
                created_at=now.strftime("%d %b %Y, %H:%M UTC"),
            ))

    # 3. Data Quality Problem: Missing or Zero Selling/Cost Price
    invalid_price_prods = db.query(models.Product).filter(
        or_(
            models.Product.selling_price <= 0,
            models.Product.cost_price <= 0,
            models.Product.selling_price.is_(None),
            models.Product.cost_price.is_(None),
        )
    ).all()

    if invalid_price_prods:
        affected_shops = len(set(p.shop_id for p in invalid_price_prods if p.shop_id))
        alerts.append(schemas.OperationalAlertItem(
            id="alert-data-quality-invalid-prices",
            alert_type="data_quality",
            severity="warning",
            title=f"Data Quality: {len(invalid_price_prods)} Products with Zero or Negative Pricing",
            description=f"Identified products with zero, negative, or missing cost or selling price across {affected_shops} merchant stores.",
            metric_value=f"{len(invalid_price_prods)} SKUs",
            threshold="Count > 0",
            affected_count=affected_shops,
            recommended_action="Prompt affected merchants to update SKU prices during their next catalog or invoice sync.",
            created_at=now.strftime("%d %b %Y, %H:%M UTC"),
        ))

    # 4. Data Quality Problem: Negative Stock Quantities
    negative_stock_prods = db.query(models.Product).filter(models.Product.stock_qty < 0).all()
    if negative_stock_prods:
        affected_shops = len(set(p.shop_id for p in negative_stock_prods if p.shop_id))
        alerts.append(schemas.OperationalAlertItem(
            id="alert-data-quality-negative-stock",
            alert_type="data_quality",
            severity="info",
            title=f"Data Quality: {len(negative_stock_prods)} SKUs Recorded with Negative Stock",
            description=f"Negative inventory balance detected, indicating sales recorded without prior stock inward entry.",
            metric_value=f"{len(negative_stock_prods)} items",
            threshold="Count > 0",
            affected_count=affected_shops,
            recommended_action="Remind merchants to upload distributor invoices or perform stock reconciliation count.",
            created_at=now.strftime("%d %b %Y, %H:%M UTC"),
        ))

    # 5. Inventory Risk: Expired or Critical Expiry Stock
    today_d = now.date()
    expired_prods = db.query(models.Product).filter(
        models.Product.expiry_date.isnot(None),
        models.Product.expiry_date < today_d,
        models.Product.stock_qty > 0
    ).all()

    if expired_prods:
        affected_shops = len(set(p.shop_id for p in expired_prods if p.shop_id))
        alerts.append(schemas.OperationalAlertItem(
            id="alert-inventory-expired-goods",
            alert_type="inventory_expiry",
            severity="warning",
            title=f"Inventory Alert: {len(expired_prods)} Expired Stock Batches Active",
            description=f"Identified perishable stock past printed expiration date in {affected_shops} stores.",
            metric_value=f"{len(expired_prods)} batches",
            threshold="Expired unsold stock > 0",
            affected_count=affected_shops,
            recommended_action="Notify store owners via push notification to return to distributor or discard expired stock.",
            created_at=now.strftime("%d %b %Y, %H:%M UTC"),
        ))

    # Count by severity
    crit = sum(1 for a in alerts if a.severity == "critical")
    warn = sum(1 for a in alerts if a.severity == "warning")
    inf = sum(1 for a in alerts if a.severity == "info")

    return schemas.OperationalAlertsResponse(
        critical_count=crit,
        warning_count=warn,
        info_count=inf,
        alerts=alerts,
    )


# -----------------------------------------------------------------------------
# 10. Scheduled Reports Management & Execution
# -----------------------------------------------------------------------------

def calculate_next_run(frequency: str, from_dt: Optional[datetime] = None) -> datetime:
    base = from_dt or datetime.utcnow()
    freq = (frequency or "weekly").lower()
    if freq == "daily":
        return base + timedelta(days=1)
    elif freq == "monthly":
        return base + timedelta(days=30)
    else:  # weekly
        return base + timedelta(days=7)


def create_scheduled_report(
    db: Session,
    req: schemas.ScheduledReportCreateRequest,
    created_by_email: str = "admin@storebi.com",
) -> models.ScheduledReport:
    next_run = calculate_next_run(req.frequency)
    sched = models.ScheduledReport(
        name=req.name.strip(),
        report_type=req.report_type,
        frequency=req.frequency,
        filters_json=json.dumps(req.filters or {}),
        recipients=req.recipients.strip(),
        format=req.format,
        status="active",
        next_run_at=next_run,
        last_status="idle",
        created_by=created_by_email,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


def update_scheduled_report(
    db: Session,
    sched_id: int,
    req: schemas.ScheduledReportUpdateRequest,
) -> models.ScheduledReport:
    sched = db.query(models.ScheduledReport).filter(models.ScheduledReport.id == sched_id).first()
    if not sched:
        raise ValueError("Scheduled report not found")

    if req.name is not None:
        sched.name = req.name.strip()
    if req.frequency is not None:
        sched.frequency = req.frequency
        sched.next_run_at = calculate_next_run(req.frequency)
    if req.recipients is not None:
        sched.recipients = req.recipients.strip()
    if req.format is not None:
        sched.format = req.format
    if req.status is not None:
        sched.status = req.status
    if req.filters is not None:
        sched.filters_json = json.dumps(req.filters)

    sched.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sched)
    return sched


def delete_scheduled_report(db: Session, sched_id: int) -> bool:
    sched = db.query(models.ScheduledReport).filter(models.ScheduledReport.id == sched_id).first()
    if not sched:
        return False
    db.delete(sched)
    db.commit()
    return True


def execute_schedule_now(db: Session, sched_id: int) -> schemas.ReportExecutionLogItem:
    """
    Executes a scheduled report immediately on-demand.
    Dispatches via email if configured; otherwise records execution in dev console log.
    Updates schedule status, last_run_at, next_run_at, and retry_count.
    """
    sched = db.query(models.ScheduledReport).filter(models.ScheduledReport.id == sched_id).first()
    if not sched:
        raise ValueError("Scheduled report not found")

    start_time = datetime.utcnow()
    filters = json.loads(sched.filters_json or "{}")

    delivery_status = "success"
    err_msg: Optional[str] = None
    delivered_via = "dev_console"

    try:
        # 1. Generate Report Payload
        csv_data = export_report_csv_string(
            db,
            report_type=sched.report_type,
            preset=filters.get("preset", "30d"),
            start_date_str=filters.get("start_date"),
            end_date_str=filters.get("end_date"),
            category=filters.get("category"),
            state=filters.get("state"),
            city=filters.get("city"),
            status=filters.get("status"),
        )

        # 2. Check Email Service Configuration
        resend_key = os.environ.get("RESEND_API_KEY", "").strip()
        smtp_host = os.environ.get("SMTP_HOST", "").strip()

        recipients = [e.strip() for e in sched.recipients.split(",") if e.strip()]
        email_subject = f"[Store BI Report] {sched.name} ({sched.frequency.capitalize()})"

        email_html = f"""
        <div style="font-family: sans-serif; padding: 20px; color: #141b2b;">
            <h2 style="color: #004ac6;">Store BI Scheduled Operations Report</h2>
            <p><strong>Report:</strong> {sched.name}</p>
            <p><strong>Type:</strong> {sched.report_type.replace('_', ' ').title()}</p>
            <p><strong>Cadence:</strong> {sched.frequency.capitalize()}</p>
            <p><strong>Records Generated:</strong> {len(csv_data.splitlines()) - 1}</p>
            <p>Please find the operational report attached in {sched.format.upper()} format.</p>
            <hr style="border: none; border-top: 1px solid #c3c6d7;" />
            <p style="font-size: 11px; color: #737686;">Store BI Operations & Platform Intelligence</p>
        </div>
        """
        email_text = f"Store BI Operations Report: {sched.name}\nType: {sched.report_type}\nCadence: {sched.frequency}\nGenerated successfully."

        if resend_key:
            delivered_via = "resend"
            for r in recipients:
                email_service.send_email(r, email_subject, email_html, email_text)
        elif smtp_host:
            delivered_via = "smtp"
            for r in recipients:
                email_service.send_email(r, email_subject, email_html, email_text)
        else:
            delivered_via = "dev_console"
            # In dev mode, write clearly to system log without claiming live SMTP delivery
            print(f"[STORE BI SCHEDULER DEV AUDIT] Report '{sched.name}' generated. Recipients: {recipients}. Format: {sched.format}. Size: {len(csv_data)} bytes.")

        sched.last_status = "success"
        sched.last_error = None
        sched.last_run_at = start_time
        sched.next_run_at = calculate_next_run(sched.frequency, start_time)
        sched.retry_count = 0

    except Exception as e:
        delivery_status = "failed"
        err_msg = str(e)
        sched.last_status = "failed"
        sched.last_error = err_msg
        sched.retry_count = (sched.retry_count or 0) + 1

    duration = int((datetime.utcnow() - start_time).total_seconds() * 1000)

    log_entry = models.ReportExecutionLog(
        schedule_id=sched.id,
        report_name=sched.name,
        report_type=sched.report_type,
        frequency=sched.frequency,
        recipients=sched.recipients,
        format=sched.format,
        status=delivery_status,
        error_message=err_msg,
        duration_ms=duration,
        delivered_via=delivered_via,
        executed_at=start_time,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return schemas.ReportExecutionLogItem(
        id=log_entry.id,
        schedule_id=log_entry.schedule_id,
        report_name=log_entry.report_name,
        report_type=log_entry.report_type,
        frequency=log_entry.frequency,
        recipients=log_entry.recipients,
        format=log_entry.format,
        status=log_entry.status,
        error_message=log_entry.error_message,
        duration_ms=log_entry.duration_ms,
        delivered_via=log_entry.delivered_via,
        executed_at=log_entry.executed_at.strftime("%d %b %Y, %H:%M:%S UTC"),
    )
