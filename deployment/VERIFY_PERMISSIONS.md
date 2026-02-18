# Verify S3 Permissions Are Added

## Quick Check via AWS CLI

Run this command to verify permissions:

```powershell
aws iam list-attached-user-policies --user-name unitalks
```

You should see `AmazonS3FullAccess` in the output.

## If Permissions Are Missing

### Step-by-Step Guide:

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/iam/
   - Or search "IAM" in AWS Console

2. **Navigate to Users**
   - Click "Users" in left sidebar
   - Click on user: **`unitalks`**

3. **Check Current Permissions**
   - Scroll to "Permissions" section
   - Look for "Permissions policies"
   - You should see: `AmazonS3FullAccess`

4. **If NOT Present - Add It:**
   - Click **"Add permissions"** button (top right)
   - Select **"Attach policies directly"**
   - In search box, type: `S3`
   - **Check the box** next to: `AmazonS3FullAccess`
   - Click **"Next"**
   - Click **"Add permissions"**

5. **Wait 30 seconds** for permissions to propagate

6. **Verify Again:**
   ```powershell
   aws iam list-attached-user-policies --user-name unitalks
   ```

7. **Try Deployment Again:**
   ```powershell
   cd D:\Projects\unitalks_1\unitalks-video-chat
   .\deployment\deploy-frontend-s3.ps1
   ```

## Alternative: Manual Console Deployment

If CLI continues to fail, you can deploy manually:

1. **Create S3 Bucket:**
   - Go to: https://s3.console.aws.amazon.com/s3/
   - Click "Create bucket"
   - Name: `unitalks-frontend-278513763034`
   - Region: `us-east-1`
   - Uncheck "Block all public access"
   - Click "Create bucket"

2. **Upload Files:**
   - Click on the bucket
   - Click "Upload"
   - Select all files from `build/` folder
   - Click "Upload"

3. **Enable Static Website Hosting:**
   - Go to bucket → "Properties" tab
   - Scroll to "Static website hosting"
   - Click "Edit"
   - Enable it
   - Index document: `index.html`
   - Error document: `index.html`
   - Save

4. **Set Bucket Policy:**
   - Go to bucket → "Permissions" tab
   - Click "Bucket policy"
   - Paste:
   ```json
   {
       "Version": "2012-10-17",
       "Statement": [
           {
               "Sid": "PublicReadGetObject",
               "Effect": "Allow",
               "Principal": "*",
               "Action": "s3:GetObject",
               "Resource": "arn:aws:s3:::unitalks-frontend-278513763034/*"
           }
       ]
   }
   ```
   - Save

5. **Get Website URL:**
   - Go to bucket → "Properties" tab
   - Scroll to "Static website hosting"
   - Copy the "Bucket website endpoint" URL

---

## Still Having Issues?

The backend is already deployed and working:
- **Backend URL**: http://44.202.124.228:8080
- **Health Check**: http://44.202.124.228:8080/health

You can test the backend while fixing frontend deployment.
