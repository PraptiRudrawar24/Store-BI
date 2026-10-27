/**
 * ==============================================================================
 * STORE BI - PURE SVG INTERACTIVE CHART ENGINE (charts.js)
 * ==============================================================================
 * High-performance, zero-dependency SVG charts adhering to Store BI design:
 * - Mint/Teal primary series (#10B981)
 * - Indigo/Blue secondary series (#3B82F6)
 * - Subtle gridlines, smooth hover tooltips, responsive SVG viewBox
 * ==============================================================================
 */

const StoreBI_Charts = (() => {
  // Global tooltip element
  let tooltipEl = null;

  function initTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "chart-tooltip";
      document.body.appendChild(tooltipEl);
    }
  }

  function showTooltip(e, html) {
    initTooltip();
    tooltipEl.innerHTML = html;
    tooltipEl.style.display = "block";
    tooltipEl.style.left = `${e.pageX}px`;
    tooltipEl.style.top = `${e.pageY}px`;
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.style.display = "none";
    }
  }

  /**
   * Renders a smooth Area & Line Chart for Growth Trends
   */
  function renderAreaTrendChart(containerId, seriesData, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    initTooltip();

    const width = 600;
    const height = 240;
    const padding = { top: 20, right: 30, bottom: 40, left: 55 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = seriesData.map(d => d.value);
    const maxVal = Math.max(...values) * 1.15 || 10;
    const minVal = 0;

    const points = seriesData.map((d, i) => {
      const x = padding.left + (i / (seriesData.length - 1)) * chartW;
      const y = padding.top + chartH - ((d.value - minVal) / (maxVal - minVal)) * chartH;
      return { x, y, label: d.label, value: d.value };
    });

    // Build SVG Path
    const linePathD = points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cx = (prev.x + p.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
    }, "");

    const areaPathD = `${linePathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const isCurrency = options.isCurrency || false;
    const formatValue = isCurrency ? StoreBI_Data.formatINR : (v => v.toLocaleString("en-IN"));

    // Y Axis grid lines (4 lines)
    let gridLinesSvg = "";
    for (let i = 0; i <= 4; i++) {
      const gridY = padding.top + (i / 4) * chartH;
      const gridVal = Math.round(maxVal - (i / 4) * (maxVal - minVal));
      gridLinesSvg += `
        <line x1="${padding.left}" y1="${gridY}" x2="${width - padding.right}" y2="${gridY}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
        <text x="${padding.left - 10}" y="${gridY + 4}" fill="currentColor" opacity="0.5" font-size="11" text-anchor="end" font-family="Inter">${formatValue(gridVal)}</text>
      `;
    }

    // X Axis labels
    let xLabelsSvg = "";
    const step = Math.ceil(seriesData.length / 6);
    seriesData.forEach((d, i) => {
      if (i % step === 0 || i === seriesData.length - 1) {
        const x = padding.left + (i / (seriesData.length - 1)) * chartW;
        xLabelsSvg += `
          <text x="${x}" y="${height - 12}" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle" font-family="Inter">${d.label}</text>
        `;
      }
    });

    // Interactive Points
    let dotsSvg = "";
    points.forEach((p, i) => {
      dotsSvg += `
        <circle cx="${p.x}" cy="${p.y}" r="4" fill="#2563EB" stroke="#FFFFFF" stroke-width="2" class="chart-interactive-dot" style="cursor: pointer;" data-idx="${i}"/>
      `;
    });

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGradient_${containerId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        ${gridLinesSvg}
        <path d="${areaPathD}" fill="url(#areaGradient_${containerId})"/>
        <path d="${linePathD}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
        ${dotsSvg}
        ${xLabelsSvg}
      </svg>
    `;

    container.innerHTML = svg;

    // Attach hover listeners to dots
    container.querySelectorAll(".chart-interactive-dot").forEach(dot => {
      const idx = parseInt(dot.getAttribute("data-idx"));
      const p = points[idx];
      dot.addEventListener("mouseenter", (e) => {
        dot.setAttribute("r", "6");
        showTooltip(e, `<strong>${p.label}</strong><br/>${formatValue(p.value)}`);
      });
      dot.addEventListener("mousemove", (e) => {
        showTooltip(e, `<strong>${p.label}</strong><br/>${formatValue(p.value)}`);
      });
      dot.addEventListener("mouseleave", () => {
        dot.setAttribute("r", "4");
        hideTooltip();
      });
    });
  }

  /**
   * Renders a Multi-Bar Chart (Active vs Inactive Shops)
   */
  function renderGroupedBarChart(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    initTooltip();

    const width = 600;
    const height = 240;
    const padding = { top: 20, right: 20, bottom: 40, left: 45 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => Math.max(d.active, d.inactive))) * 1.15 || 50;
    const barGroupWidth = chartW / data.length;
    const barWidth = Math.min(22, (barGroupWidth - 16) / 2);

    let barsSvg = "";
    let xLabelsSvg = "";

    data.forEach((d, i) => {
      const groupX = padding.left + i * barGroupWidth;
      const hActive = (d.active / maxVal) * chartH;
      const yActive = padding.top + chartH - hActive;

      const hInactive = (d.inactive / maxVal) * chartH;
      const yInactive = padding.top + chartH - hInactive;

      barsSvg += `
        <rect x="${groupX + 8}" y="${yActive}" width="${barWidth}" height="${hActive}" rx="4" fill="#2563EB" class="bar-elem" data-label="${d.label} (Active)" data-val="${d.active}" style="cursor: pointer;"/>
        <rect x="${groupX + 8 + barWidth + 4}" y="${yInactive}" width="${barWidth}" height="${hInactive}" rx="4" fill="#94A3B8" class="bar-elem" data-label="${d.label} (Inactive / Expired)" data-val="${d.inactive}" style="cursor: pointer;"/>
      `;

      xLabelsSvg += `
        <text x="${groupX + barGroupWidth / 2}" y="${height - 12}" fill="currentColor" opacity="0.6" font-size="11" text-anchor="middle" font-family="Inter">${d.label}</text>
      `;
    });

    // Y Axis Grid
    let gridSvg = "";
    for (let i = 0; i <= 4; i++) {
      const gridY = padding.top + (i / 4) * chartH;
      const gridVal = Math.round(maxVal - (i / 4) * maxVal);
      gridSvg += `
        <line x1="${padding.left}" y1="${gridY}" x2="${width - padding.right}" y2="${gridY}" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3"/>
        <text x="${padding.left - 8}" y="${gridY + 4}" fill="currentColor" opacity="0.5" font-size="11" text-anchor="end" font-family="Inter">${gridVal}</text>
      `;
    }

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" preserveAspectRatio="none">
        ${gridSvg}
        ${barsSvg}
        ${xLabelsSvg}
      </svg>
    `;

    container.innerHTML = svg;

    container.querySelectorAll(".bar-elem").forEach(bar => {
      const label = bar.getAttribute("data-label");
      const val = bar.getAttribute("data-val");
      bar.addEventListener("mouseenter", (e) => {
        bar.style.opacity = "0.8";
        showTooltip(e, `<strong>${label}</strong><br/>${val} shops`);
      });
      bar.addEventListener("mousemove", (e) => {
        showTooltip(e, `<strong>${label}</strong><br/>${val} shops`);
      });
      bar.addEventListener("mouseleave", () => {
        bar.style.opacity = "1";
        hideTooltip();
      });
    });
  }

  /**
   * Renders a Donut Chart for Business Types
   */
  function renderDonutChart(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    initTooltip();

    const size = 220;
    const radius = 80;
    const strokeWidth = 26;
    const center = size / 2;
    const total = items.reduce((sum, item) => sum + item.count, 0);

    const colors = ["#2563EB", "#10B981", "#F59E0B", "#0284C7", "#8B5CF6", "#EC4899"];

    let cumulativePercent = 0;
    let pathsSvg = "";

    items.forEach((item, idx) => {
      const percent = item.count / total;
      const startAngle = cumulativePercent * 2 * Math.PI;
      cumulativePercent += percent;
      const endAngle = cumulativePercent * 2 * Math.PI;

      const x1 = center + radius * Math.sin(startAngle);
      const y1 = center - radius * Math.cos(startAngle);
      const x2 = center + radius * Math.sin(endAngle);
      const y2 = center - radius * Math.cos(endAngle);

      const largeArc = percent > 0.5 ? 1 : 0;
      const pathD = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

      pathsSvg += `
        <path d="${pathD}" fill="none" stroke="${colors[idx % colors.length]}" stroke-width="${strokeWidth}" class="donut-slice" data-name="${item.name}" data-count="${item.count}" data-pct="${Math.round(percent * 100)}%" style="cursor: pointer; transition: stroke-width 0.15s ease;"/>
      `;
    });

    let legendHtml = '<div style="display: flex; flex-direction: column; gap: 8px; justify-content: center; font-size: 12.5px;">';
    items.forEach((item, idx) => {
      const pct = Math.round((item.count / total) * 100);
      legendHtml += `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 10px; height: 10px; border-radius: 3px; background: ${colors[idx % colors.length]}; display: inline-block;"></span>
            <span>${item.name}</span>
          </div>
          <span class="font-mono" style="font-weight: 600; color: var(--text-muted);">${item.count} (${pct}%)</span>
        </div>
      `;
    });
    legendHtml += '</div>';

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; height: 100%;">
        <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
          <svg viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%; transform: rotate(0deg);">
            ${pathsSvg}
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none;">
            <div style="font-size: 22px; font-weight: 700; color: var(--text-high);">${total}</div>
            <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">TOTAL SHOPS</div>
          </div>
        </div>
        <div style="flex: 1; max-width: 260px; padding-left: 20px;">
          ${legendHtml}
        </div>
      </div>
    `;

    container.querySelectorAll(".donut-slice").forEach(slice => {
      const name = slice.getAttribute("data-name");
      const count = slice.getAttribute("data-count");
      const pct = slice.getAttribute("data-pct");

      slice.addEventListener("mouseenter", (e) => {
        slice.setAttribute("stroke-width", "32");
        showTooltip(e, `<strong>${name}</strong><br/>${count} shops (${pct})`);
      });
      slice.addEventListener("mousemove", (e) => {
        showTooltip(e, `<strong>${name}</strong><br/>${count} shops (${pct})`);
      });
      slice.addEventListener("mouseleave", () => {
        slice.setAttribute("stroke-width", strokeWidth.toString());
        hideTooltip();
      });
    });
  }

  /**
   * Renders a Horizontal Bar Chart for Cities
   */
  function renderCityBarChart(containerId, cities) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxCount = Math.max(...cities.map(c => c.count)) || 1;

    let html = '<div style="display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 4px 0;">';
    cities.forEach(city => {
      const pct = Math.round((city.count / maxCount) * 100);
      html += `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; justify-content: space-between; font-size: 12.5px;">
            <span style="font-weight: 500; color: var(--text-high);">${city.name}</span>
            <span class="font-mono" style="font-weight: 600; color: var(--text-medium);">${city.count} stores</span>
          </div>
          <div style="width: 100%; height: 8px; background: var(--bg-subtle); border-radius: 4px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: #2563EB; border-radius: 4px; transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  /**
   * Renders the SaaS Product Adoption Funnel
   */
  function renderFunnel(containerId, steps) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const baseVal = steps[0].value;

    let html = '<div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">';
    steps.forEach((step, idx) => {
      const pctOfBase = Math.round((step.value / baseVal) * 100);
      const dropOff = idx > 0 ? Math.round(((steps[idx - 1].value - step.value) / steps[idx - 1].value) * 100) : null;

      html += `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13px;">
            <span style="font-weight: 600; color: var(--text-high);">${step.name}</span>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${dropOff !== null ? `<span style="font-size: 11px; color: var(--red); font-weight: 500;">-${dropOff}% drop-off</span>` : ''}
              <span class="font-mono" style="font-weight: 700; color: var(--text-high);">${step.value.toLocaleString('en-IN')} (${pctOfBase}%)</span>
            </div>
          </div>
          <div style="width: 100%; height: 10px; background: var(--bg-subtle); border-radius: 5px; overflow: hidden;">
            <div style="width: ${pctOfBase}%; height: 100%; background: ${idx === steps.length - 1 ? '#2563EB' : '#3B82F6'}; border-radius: 5px;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  return {
    renderAreaTrendChart,
    renderGroupedBarChart,
    renderDonutChart,
    renderCityBarChart,
    renderFunnel
  };
})();
