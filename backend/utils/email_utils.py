"""
Email utilities for sending password reset and notification emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Gmail configuration
GMAIL_ADDRESS = os.getenv('GMAIL_ADDRESS', '')
GMAIL_APP_PASSWORD = os.getenv('GMAIL_APP_PASSWORD', '')

def send_password_reset_email(recipient_email, user_name, temp_password):
    """Send email with temporary password"""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        logger.warning("Gmail credentials not configured. Email not sent.")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'AgroSense - Your New Password'
        msg['From'] = GMAIL_ADDRESS
        msg['To'] = recipient_email
        
        # HTML email template
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); padding: 20px; border-radius: 8px; color: white; margin-bottom: 20px;">
                        <h1 style="margin: 0;">🌾 AgroSense</h1>
                        <p style="margin: 5px 0 0 0;">AI-powered crop diagnostics</p>
                    </div>
                    
                    <h2>Hello {user_name},</h2>
                    
                    <p>Your password has been reset. Here is your new temporary password:</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-left: 4px solid #2ecc71; margin: 20px 0; text-align: center;">
                        <p style="margin: 0; color: #666; font-size: 12px; text-transform: uppercase;">Temporary Password</p>
                        <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 36px; font-weight: bold; color: #2ecc71; letter-spacing: 5px;">{temp_password}</p>
                    </div>
                    
                    <p><strong>How to use:</strong></p>
                    <ol>
                        <li>Go to AgroSense login page</li>
                        <li>Enter your email: <strong>{recipient_email}</strong></li>
                        <li>Enter this password: <strong>{temp_password}</strong></li>
                        <li>After logging in, change your password to something more secure</li>
                    </ol>
                    
                    <p style="color: #d32f2f;"><strong>⚠️ Important:</strong> Keep this password safe and do not share it with anyone.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        © 2026 AgroSense - AI-Powered Crop Diagnostics for Pakistani Farmers<br>
                        Built for Punjab's agricultural community
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Plain text version
        text = f"""
AgroSense - Your New Password

Hello {user_name},

Your password has been reset. Here is your new temporary password:

TEMPORARY PASSWORD: {temp_password}

How to use:
1. Go to AgroSense login page
2. Enter your email: {recipient_email}
3. Enter this password: {temp_password}
4. After logging in, change your password to something more secure

IMPORTANT: Keep this password safe and do not share it with anyone.

© 2026 AgroSense - AI-Powered Crop Diagnostics for Pakistani Farmers
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        # Send via Gmail SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Password reset email sent to {recipient_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        logger.error("Gmail authentication failed. Check credentials in .env")
        return False
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

def send_welcome_email(recipient_email, user_name, password="abc123"):
    """Send welcome email to new user"""
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        logger.warning("Gmail credentials not configured. Email not sent.")
        return False
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Welcome to AgroSense!'
        msg['From'] = GMAIL_ADDRESS
        msg['To'] = recipient_email
        
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); padding: 20px; border-radius: 8px; color: white; margin-bottom: 20px;">
                        <h1 style="margin: 0;">🌾 AgroSense</h1>
                        <p style="margin: 5px 0 0 0;">AI-powered crop diagnostics</p>
                    </div>
                    
                    <h2>Welcome to AgroSense, {user_name}!</h2>
                    
                    <p>Thank you for joining our platform. We're excited to help you monitor and manage your crops with our AI-powered diagnostic system.</p>
                    
                    <div style="background: #f5f5f5; padding: 16px; border-left: 4px solid #2ecc71; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-weight: bold; color: #333;">Your Account Login Details:</p>
                        <p style="margin: 6px 0 0 0;">Email: <strong>{recipient_email}</strong></p>
                        <p style="margin: 4px 0 0 0;">Password: <strong>{password}</strong></p>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">We suggest you change your password to something secure after your first login.</p>
                    </div>

                    <h3>Getting Started:</h3>
                    <ul>
                        <li><strong>Scan Your Crops:</strong> Upload images of your crops to detect diseases and get instant recommendations</li>
                        <li><strong>Chat Support:</strong> Ask our AI assistant any questions about your crops</li>
                        <li><strong>View History:</strong> Track all your scans and monitor disease patterns</li>
                        <li><strong>Dashboard:</strong> See analytics about your farm's health</li>
                    </ul>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        © 2026 AgroSense - AI-Powered Crop Diagnostics for Pakistani Farmers<br>
                        Built for Punjab's agricultural community
                    </p>
                </div>
            </body>
        </html>
        """
        
        text = f"""
Welcome to AgroSense, {user_name}!

Thank you for joining our platform. We're excited to help you monitor and manage your crops with our AI-powered diagnostic system.

Your Account Login Details:
Email: {recipient_email}
Password: {password}

Getting Started:
- Scan Your Crops: Upload images of your crops to detect diseases and get instant recommendations
- Chat Support: Ask our AI assistant any questions about your crops
- View History: Track all your scans and monitor disease patterns
- Dashboard: See analytics about your farm's health

© 2026 AgroSense - AI-Powered Crop Diagnostics for Pakistani Farmers
        """
        
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))
        
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Welcome email sent to {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending welcome email: {str(e)}")
        return False
