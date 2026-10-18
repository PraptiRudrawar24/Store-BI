import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import httpx

def get_frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:5173").rstrip("/")

def send_email(to_email: str, subject: str, html_body: str, text_body: str) -> bool:
    """
    Sends a transactional email via Resend API, standard SMTP, or development console fallback.
    Does not crash the request if the external mail service experiences a transient network error.
    """
    resend_api_key = os.environ.get("RESEND_API_KEY", "").strip()
    smtp_host = os.environ.get("SMTP_HOST", "").strip()

    # 1. Resend API Integration
    if resend_api_key:
        from_email = os.environ.get("RESEND_FROM_EMAIL", "Store BI <onboarding@resend.dev>").strip()
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": from_email,
                        "to": [to_email],
                        "subject": subject,
                        "html": html_body,
                        "text": text_body,
                    },
                )
                if res.status_code in (200, 201):
                    return True
                else:
                    print(f"[EmailService Error] Resend status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[EmailService Error] Resend exception: {e}")

    # 2. Standard SMTP Integration (SendGrid, AWS SES, Postmark, Mailgun, Brevo, Gmail)
    if smtp_host:
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER", "").strip()
        smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
        smtp_from = os.environ.get("SMTP_FROM_EMAIL", "notifications@storebi.com").strip()
        smtp_from_name = os.environ.get("SMTP_FROM_NAME", "Store BI").strip()
        smtp_use_tls = os.environ.get("SMTP_TLS", "true").lower() in ("true", "1", "yes")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{smtp_from_name} <{smtp_from}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        try:
            if smtp_port == 465:
                server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10.0)
            else:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=10.0)
                if smtp_use_tls:
                    server.starttls()
            if smtp_user and smtp_password:
                server.login(smtp_user, smtp_password)
            server.sendmail(smtp_from, [to_email], msg.as_string())
            server.quit()
            return True
        except Exception as e:
            print(f"[EmailService Error] SMTP exception: {e}")

    # 3. Development Fallback (Local evaluation when SMTP/Resend is not yet configured)
    print("\n" + "=" * 60)
    print(f"[STORE BI TRANSACTIONAL EMAIL]")
    print(f"To:      {to_email}")
    print(f"Subject: {subject}")
    print(f"Notice:  Configure SMTP_HOST or RESEND_API_KEY in .env for public delivery.")
    print("-" * 60)
    print(text_body.strip())
    print("=" * 60 + "\n")
    return True

def send_verification_email(to_email: str, owner_name: str, token: str) -> bool:
    """
    Delivers an account verification email with a secure time-limited token.
    """
    frontend_url = get_frontend_url()
    verification_link = f"{frontend_url}/verify-email?token={token}"
    display_name = owner_name or "Store Merchant"
    subject = "Verify your Store BI account — 5-Day Free Trial"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
        .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .badge {{ display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; border: 1px solid #a7f3d0; }}
        h1 {{ font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; }}
        p {{ font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }}
        .btn {{ display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 8px 0 24px 0; }}
        .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; }}
        .link {{ word-break: break-all; color: #059669; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Store BI • Free Trial Activation</div>
        <h1>Welcome to Store BI, {display_name}!</h1>
        <p>Thank you for registering. Please verify your email address to confirm your account and activate your <strong>5-day full access free trial</strong>.</p>
        <div style="text-align: center;">
          <a href="{verification_link}" class="btn" target="_blank">Verify My Email Address</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Or paste this link into your browser:<br><a href="{verification_link}" class="link">{verification_link}</a></p>
        <div class="footer">
          <p>This verification link will expire in 24 hours. If you did not create a Store BI account, please ignore this email.</p>
          <p>&copy; Store BI — Intelligent Retail Intelligence & POS.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"""
Welcome to Store BI, {display_name}!

Please verify your email address to activate your 5-day free trial:
{verification_link}

This link will expire in 24 hours.

If you did not request this, please ignore this email.
Store BI Platform Team
    """

    return send_email(to_email, subject, html_body, text_body)

def send_password_reset_email(to_email: str, owner_name: str, token: str) -> bool:
    """
    Delivers a secure, time-limited password reset link (1 hour validity).
    """
    frontend_url = get_frontend_url()
    reset_link = f"{frontend_url}/reset-password?token={token}"
    display_name = owner_name or "Store Merchant"
    subject = "Reset your Store BI password"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }}
        .card {{ max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
        .badge {{ display: inline-block; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 16px; border: 1px solid #bfdbfe; }}
        h1 {{ font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; }}
        p {{ font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0; }}
        .btn {{ display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; margin: 8px 0 24px 0; }}
        .footer {{ font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 16px; }}
        .link {{ word-break: break-all; color: #2563eb; font-size: 12px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">Store BI • Security Notice</div>
        <h1>Password Reset Request</h1>
        <p>Hello {display_name},</p>
        <p>We received a request to reset the password for your Store BI merchant account. Click the button below to choose a new password:</p>
        <div style="text-align: center;">
          <a href="{reset_link}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #64748b;">Or paste this link into your browser:<br><a href="{reset_link}" class="link">{reset_link}</a></p>
        <div class="footer">
          <p><strong>This password reset link expires in 1 hour.</strong></p>
          <p>If you did not make this request, you can safely ignore this email; your existing password will remain unchanged.</p>
          <p>&copy; Store BI — Intelligent Retail Intelligence & POS.</p>
        </div>
      </div>
    </body>
    </html>
    """

    text_body = f"""
Hello {display_name},

We received a request to reset your Store BI password. Use this link to set a new password:
{reset_link}

This link is valid for 1 hour.

If you did not request a password reset, you can safely ignore this email.
Store BI Security Team
    """

    return send_email(to_email, subject, html_body, text_body)
