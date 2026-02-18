# Connect unitalks.in to Your Frontend

## Overview
- **Frontend:** unitalks.in → CloudFront → S3
- **Optional:** api.unitalks.in → Backend (EC2)

---

## Part 1: SSL Certificate (AWS Certificate Manager)

You need an SSL certificate for **unitalks.in** and **www.unitalks.in**.

### Step 1: Request Certificate

1. **Open AWS Certificate Manager (ACM)**
   - Console: https://console.aws.amazon.com/acm/
   - **Important:** Switch region to **US East (N. Virginia)** – CloudFront only uses certificates from this region.

2. **Request a certificate**
   - Click **"Request a certificate"**
   - Choose **"Request a public certificate"**
   - Add domain names:
     - `unitalks.in`
     - `www.unitalks.in`
   - Validation method: **DNS validation** (recommended)
   - Click **"Request"**

3. **Validate via DNS**
   - In the certificate list, click the certificate (status: Pending validation).
   - Click **"Create records in Route 53"** if your DNS is in Route 53, **or**
   - Manually add the CNAME records shown (Name + Value) in your domain’s DNS panel (where you manage unitalks.in).
   - Wait 5–30 minutes until status is **"Issued"**.

---

## Part 2: Add Domain to CloudFront

### Step 2: Update CloudFront Distribution

1. **Open CloudFront**
   - Console: https://console.aws.amazon.com/cloudfront/

2. **Edit your distribution**
   - Click the distribution ID (e.g. **EYKXVQO6U1R98**).
   - Open the **"General"** tab and click **"Edit"**.

3. **Alternate domain names (CNAMEs)**
   - Add:
     - `unitalks.in`
     - `www.unitalks.in`
   - **Custom SSL certificate:** choose the certificate you created in Part 1 (e.g. `*.unitalks.in` or the one for unitalks.in + www.unitalks.in).
   - Save changes. Deployment may take 5–15 minutes.

---

## Part 3: Point Your Domain to CloudFront

Your CloudFront domain is: **dbpnqtdjpicsn.cloudfront.net**

### Step 3: DNS Records (at your domain registrar / DNS provider)

Add these records where you manage DNS for **unitalks.in**:

| Type  | Name       | Value / Target                    | TTL  |
|-------|------------|-----------------------------------|------|
| A     | (empty)    | See note below (CloudFront IP)    | 300  |
| AAAA  | (empty)    | See note below (CloudFront IPv6)  | 300  |
| CNAME | www        | dbpnqtdjpicsn.cloudfront.net      | 300  |

**Better option (recommended):**  
- **CNAME for root (unitalks.in):** Some providers (e.g. Cloudflare, Route 53) allow CNAME flattening or alias records for the root.
  - **If your provider supports “alias” or “flattened CNAME” for root:**
    - **Name:** `@` or `unitalks.in`
    - **Target:** `dbpnqtdjpicsn.cloudfront.net`
  - **If they don’t:** use an A/AAAA record and point to the CloudFront IP (or use their “proxy to CDN” if they offer it).  
  **AWS Route 53:** Create an **A** record (alias) for `unitalks.in` → CloudFront distribution.  
  **Cloudflare:** Use CNAME (orange cloud) for `unitalks.in` → `dbpnqtdjpicsn.cloudfront.net` if they allow it for root; otherwise use their “CNAME flattening”.

| Type  | Name | Value / Target |
|-------|------|----------------|
| A (Alias) | unitalks.in or @ | dbpnqtdjpicsn.cloudfront.net (alias to CloudFront) |
| CNAME     | www  | dbpnqtdjpicsn.cloudfront.net |

- **Root (unitalks.in):** A/AAAA alias to CloudFront, or CNAME if supported.
- **www:** CNAME `www` → `dbpnqtdjpicsn.cloudfront.net`.

Save and wait 5–30 minutes for DNS to propagate.

---

## Part 4: Rebuild Frontend (Optional – if you use api.unitalks.in)

If you later use **api.unitalks.in** for the backend, rebuild the frontend with that API URL:

```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat
$env:REACT_APP_API_URL = "https://api.unitalks.in"
npm run build
aws s3 sync ./build s3://unitalks-frontend-20260218221428 --delete --region us-east-1
aws cloudfront create-invalidation --distribution-id EYKXVQO6U1R98 --paths "/*"
```

For now you can keep **REACT_APP_API_URL** as `https://44.202.124.228` until api.unitalks.in is set up.

---

## Part 5: Optional – Backend on api.unitalks.in

To serve the backend at **https://api.unitalks.in**:

1. **DNS:** Add CNAME (or A record) for `api` → your EC2 IP `44.202.124.228` (or to an ALB if you use one).
2. **On EC2:** Use the existing `setup-backend-https.sh` with domain `api.unitalks.in` (and get a Let’s Encrypt certificate for api.unitalks.in).
3. **Frontend:** Set `REACT_APP_API_URL = "https://api.unitalks.in"`, rebuild, and redeploy as in Part 4.

---

## Checklist

- [ ] Certificate requested in ACM (region: **N. Virginia**)
- [ ] Certificate validated (status: Issued)
- [ ] CloudFront updated: alternate domains + custom SSL
- [ ] DNS: unitalks.in and www.unitalks.in → CloudFront
- [ ] Wait for CloudFront deployment and DNS propagation
- [ ] Test: https://unitalks.in and https://www.unitalks.in

---

## Quick Reference

| Item        | Value |
|------------|--------|
| Domain     | unitalks.in, www.unitalks.in |
| CloudFront | dbpnqtdjpicsn.cloudfront.net |
| Distribution ID | EYKXVQO6U1R98 |
| S3 Bucket  | unitalks-frontend-20260218221428 |
| Backend (current) | https://44.202.124.228 |

After DNS and CloudFront are updated, your frontend will be live at **https://unitalks.in**.

---

## If Your DNS is on AWS Route 53

### 1. Request certificate (run in PowerShell)

```powershell
# Must use us-east-1 for CloudFront
aws acm request-certificate `
  --domain-name "unitalks.in" `
  --subject-alternative-names "www.unitalks.in" `
  --validation-method DNS `
  --region us-east-1
```

Note the **CertificateArn** from the output. Then in ACM console (us-east-1), open the certificate and **Create records in Route 53** to validate.

### 2. After certificate is "Issued" – get Certificate ARN

```powershell
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='unitalks.in'].CertificateArn" --output text
```

### 3. Update CloudFront (after you have CertificateArn)

In **CloudFront console** → your distribution → Edit:
- **Alternate domain names:** `unitalks.in`, `www.unitalks.in`
- **Custom SSL certificate:** select the certificate for unitalks.in  
Save. Wait for deployment.

### 4. Create Route 53 records (if hosted zone exists for unitalks.in)

```powershell
# Get your CloudFront distribution domain name
$cfDomain = "dbpnqtdjpicsn.cloudfront.net"
$hostedZoneId = "YOUR_ZONE_ID"   # From Route 53 → Hosted zones → unitalks.in

# A record (alias) for root – unitalks.in
aws route53 change-resource-record-sets --hosted-zone-id $hostedZoneId --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "unitalks.in",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "dbpnqtdjpicsn.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}'

# A record (alias) for www
aws route53 change-resource-record-sets --hosted-zone-id $hostedZoneId --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "www.unitalks.in",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "dbpnqtdjpicsn.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}'
```

Replace `YOUR_ZONE_ID` and `dbpnqtdjpicsn.cloudfront.net` if different. CloudFront’s hosted zone ID is always `Z2FDTNDATAQYW2` for alias targets.
