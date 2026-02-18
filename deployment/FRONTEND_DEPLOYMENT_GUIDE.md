# Frontend Deployment Guide

## Current Status
✅ **Backend deployed successfully!**
- Backend URL: `http://44.202.124.228:8080`
- Health endpoint: `http://44.202.124.228:8080/health`
- Status: Running and accessible

## Frontend Deployment Options

### Option 1: AWS S3 + CloudFront (Recommended)

#### Required IAM Permissions
Your IAM user needs the following permissions. Add these via AWS Console:

1. **AmazonS3FullAccess** (or custom policy with):
   - `s3:CreateBucket`
   - `s3:PutBucketWebsite`
   - `s3:PutBucketPolicy`
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:ListBucket`
   - `s3:DeleteObject`

2. **CloudFrontFullAccess** (optional, for CDN):
   - `cloudfront:CreateDistribution`
   - `cloudfront:UpdateDistribution`
   - `cloudfront:GetDistribution`

#### Steps to Add Permissions:
1. Go to AWS Console → IAM → Users → `unitalks`
2. Click "Add permissions" → "Attach policies directly"
3. Search and attach: `AmazonS3FullAccess`
4. (Optional) Attach: `CloudFrontFullAccess`
5. Click "Next" → "Add permissions"

#### Deployment Commands (run after adding permissions):
```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat
.\deployment\deploy-frontend-s3.ps1
```

---

### Option 2: AWS Amplify

#### Required IAM Permissions:
- `amplify:CreateApp`
- `amplify:CreateBranch`
- `amplify:CreateDeployment`
- `amplify:GetApp`
- `amplify:ListApps`

Or attach: **AWSAmplifyFullAccess**

#### Deployment Commands:
```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat
.\deployment\deploy-frontend-amplify.ps1
```

---

### Option 3: Manual Build & Serve Locally

If you want to test the frontend locally with the deployed backend:

```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat
$env:REACT_APP_API_URL = "http://44.202.124.228:8080"
npm start
```

Then open `http://localhost:3000` in your browser.

---

## Environment Variables

The frontend needs these environment variables:

- `REACT_APP_API_URL` - Backend API URL (currently: `http://44.202.124.228:8080`)
- `REACT_APP_WEB3FORMS_KEY` - Web3Forms API key (optional, for contact forms)

---

## Next Steps

1. **Add IAM permissions** (see above)
2. **Run deployment script** (see above)
3. **Update frontend URL** in your application once deployed
4. **Test the full stack** - frontend → backend → WebRTC

---

## Current Backend Details

- **EC2 Instance**: `i-0b7154310100f858d`
- **Public IP**: `44.202.124.228`
- **Port**: `8080`
- **Health Check**: `http://44.202.124.228:8080/health`
- **SSH Key**: `deployment\unitalks-keypair-formatted.pem`

---

## Troubleshooting

### Frontend can't connect to backend:
1. Check security group allows port 8080
2. Verify backend container is running: `docker ps` on EC2
3. Test health endpoint: `curl http://44.202.124.228:8080/health`

### Build fails:
- Ensure `npm install` completed successfully
- Check Node.js version (should be 18+)
- Verify all dependencies are installed

### Deployment fails:
- Check IAM permissions are attached
- Verify AWS credentials are configured
- Check AWS CLI version: `aws --version`
