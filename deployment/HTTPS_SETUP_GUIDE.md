# HTTPS Setup Guide - Fix Camera/Microphone Access

## Problem
Modern browsers **require HTTPS** to access camera and microphone. Your frontend is currently on HTTP, so browsers block media access.

## Solution Options

### Option 1: CloudFront Distribution (Recommended - Free SSL)

CloudFront provides free SSL certificates and HTTPS automatically.

#### Step 1: Add CloudFront Permissions
1. Go to AWS Console → IAM → Users → `unitalks`
2. Click "Add permissions" → "Attach policies directly"
3. Search for `CloudFront` and check **`CloudFrontFullAccess`**
4. Click "Next" → "Add permissions"
5. Wait 30 seconds for propagation

#### Step 2: Create CloudFront Distribution
```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat
.\deployment\setup-https-cloudfront.ps1
```

This will:
- Create a CloudFront distribution
- Point it to your S3 bucket
- Enable HTTPS automatically
- Provide a `https://*.cloudfront.net` URL

**Note:** CloudFront deployment takes 10-15 minutes. Once ready, use the HTTPS URL instead of the HTTP S3 URL.

---

### Option 2: Nginx on EC2 with Let's Encrypt (Requires Domain)

If you have a domain name, you can set up nginx on your EC2 instance:

1. **Point domain to EC2 IP:**
   - Add A record: `yourdomain.com` → `44.202.124.228`

2. **SSH into EC2:**
   ```powershell
   ssh -i deployment\unitalks-keypair-formatted.pem ubuntu@44.202.124.228
   ```

3. **Install nginx and certbot:**
   ```bash
   sudo apt update
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

4. **Configure nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/unitalks
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable site and get SSL:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/unitalks /etc/nginx/sites-enabled/
   sudo certbot --nginx -d yourdomain.com
   ```

---

### Option 3: Quick Test - Local HTTPS (Development Only)

For testing locally, you can use a self-signed certificate:

```powershell
# Install mkcert
choco install mkcert

# Create local CA
mkcert -install

# Generate cert for localhost
mkcert localhost 127.0.0.1

# Serve with HTTPS
# Use a tool like serve-https or modify your dev server
```

**Note:** This only works locally. For production, use CloudFront or a real domain.

---

## Current URLs

- **Frontend (HTTP):** `http://unitalks-frontend-20260218221428.s3-website-us-east-1.amazonaws.com`
- **Backend:** `http://44.202.124.228:8080`

## After HTTPS Setup

Once you have HTTPS:
1. Update frontend URL to use HTTPS
2. Update `REACT_APP_API_URL` to use HTTPS backend (if backend also gets HTTPS)
3. Test camera/microphone access - it should work!

---

## Troubleshooting

### Camera still blocked after HTTPS?
1. Check browser console for errors
2. Ensure you're using HTTPS (not HTTP)
3. Check browser permissions: Settings → Privacy → Camera/Microphone
4. Try incognito mode to test without cached permissions

### CloudFront not working?
1. Check distribution status: `aws cloudfront get-distribution --id <ID>`
2. Wait 15 minutes for full deployment
3. Clear browser cache
4. Check CloudFront logs in AWS Console

---

## Recommended: CloudFront

CloudFront is the easiest solution - just add permissions and run the script!
