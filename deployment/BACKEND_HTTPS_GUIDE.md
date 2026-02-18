# Backend HTTPS Setup Guide

## Problem
Your frontend is HTTPS (CloudFront) but backend is HTTP. Browsers block HTTP requests from HTTPS pages (mixed content policy).

**Error:** "Unable to connect to server"

## Solution Options

### Option 1: Nginx + Let's Encrypt (Recommended - Free SSL)

**Requirements:** A domain name (get free from Freenom.com)

#### Steps:

1. **Get a free domain** (if you don't have one):
   - Go to https://www.freenom.com
   - Register a free domain (e.g., `unitalks.tk`)

2. **Point domain to EC2 IP:**
   - Add A record: `yourdomain.com` → `44.202.124.228`
   - Wait 5-10 minutes for DNS propagation

3. **SSH into EC2:**
   ```powershell
   ssh -i deployment\unitalks-keypair-formatted.pem ubuntu@44.202.124.228
   ```

4. **Run setup script:**
   ```bash
   cd /home/ubuntu
   # Upload setup-backend-https.sh first, or copy-paste it
   chmod +x setup-backend-https.sh
   ./setup-backend-https.sh yourdomain.com
   ```

5. **Update frontend:**
   - Rebuild frontend with new backend URL:
   ```powershell
   cd D:\Projects\unitalks_1\unitalks-video-chat
   $env:REACT_APP_API_URL = "https://yourdomain.com"
   npm run build
   aws s3 sync ./build s3://unitalks-frontend-20260218221428 --delete --region us-east-1
   ```
   - Invalidate CloudFront cache:
   ```powershell
   aws cloudfront create-invalidation --distribution-id EYKXVQO6U1R98 --paths "/*"
   ```

---

### Option 2: AWS Application Load Balancer + ACM (No Domain Needed)

**Requirements:** AWS permissions for ELB and ACM

#### Steps:

1. **Create SSL Certificate in ACM:**
   ```powershell
   # Request certificate (will need to verify via DNS or email)
   aws acm request-certificate --domain-name "*.elb.amazonaws.com" --validation-method DNS --region us-east-1
   ```

2. **Create Target Group:**
   ```powershell
   aws elbv2 create-target-group --name unitalks-backend --protocol HTTP --port 8080 --vpc-id <your-vpc-id> --health-check-path /health --region us-east-1
   ```

3. **Register EC2 instance:**
   ```powershell
   aws elbv2 register-targets --target-group-arn <target-group-arn> --targets Id=i-0b7154310100f858d --region us-east-1
   ```

4. **Create Load Balancer:**
   ```powershell
   aws elbv2 create-load-balancer --name unitalks-alb --subnets <subnet-ids> --security-groups <sg-id> --region us-east-1
   ```

5. **Create HTTPS Listener:**
   ```powershell
   aws elbv2 create-listener --load-balancer-arn <alb-arn> --protocol HTTPS --port 443 --certificates CertificateArn=<cert-arn> --default-actions Type=forward,TargetGroupArn=<tg-arn> --region us-east-1
   ```

**Note:** This is complex and requires multiple AWS permissions.

---

### Option 3: API Gateway WebSocket API (Simpler but needs permissions)

**Requirements:** API Gateway permissions

#### Steps:

1. **Add API Gateway permissions to IAM user:**
   - Go to AWS Console → IAM → Users → `unitalks`
   - Add: `AmazonAPIGatewayAdministrator`

2. **Create WebSocket API:**
   ```powershell
   aws apigatewayv2 create-api --name unitalks-ws --protocol-type WEBSOCKET --route-selection-expression '$request.body.action' --region us-east-1
   ```

3. **Create integration:**
   ```powershell
   aws apigatewayv2 create-integration --api-id <api-id> --integration-type HTTP_PROXY --integration-uri http://44.202.124.228:8080/ws --integration-method GET --region us-east-1
   ```

**Note:** This requires significant configuration changes to your backend.

---

### Option 4: Quick Test - Use HTTP Frontend Temporarily

For testing only (not secure):

1. **Use S3 HTTP URL instead of CloudFront:**
   - `http://unitalks-frontend-20260218221428.s3-website-us-east-1.amazonaws.com`
   - This will work but camera won't work (needs HTTPS)

---

## Recommended Solution

**Use Option 1 (Nginx + Let's Encrypt)** - It's:
- ✅ Free SSL certificate
- ✅ Works with WebSocket
- ✅ Simple setup
- ✅ Auto-renewal
- ⚠️ Requires a domain name (get free from Freenom)

---

## Current Backend Details

- **EC2 IP:** `44.202.124.228`
- **Backend Port:** `8080`
- **Current URL:** `http://44.202.124.228:8080`
- **Needs:** `https://yourdomain.com` or `https://alb-endpoint.elb.amazonaws.com`

---

## After Setup

1. Update frontend `REACT_APP_API_URL` to HTTPS backend URL
2. Rebuild and redeploy frontend
3. Test connection - should work!
