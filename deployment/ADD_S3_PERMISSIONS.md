# Quick Guide: Add S3 Permissions

## Steps to Add S3 Permissions to IAM User

1. **Go to AWS Console**
   - Open: https://console.aws.amazon.com/iam/
   - Or search "IAM" in AWS Console

2. **Navigate to Users**
   - Click "Users" in the left sidebar
   - Find and click on user: `unitalks`

3. **Add Permissions**
   - Click the "Add permissions" button (top right)
   - Select "Attach policies directly"
   - In the search box, type: `S3`
   - Check the box next to: **`AmazonS3FullAccess`**
   - Click "Next"
   - Click "Add permissions"

4. **Verify**
   - You should see "AmazonS3FullAccess" in the user's permissions list

5. **Deploy Frontend**
   ```powershell
   cd D:\Projects\unitalks_1\unitalks-video-chat
   .\deployment\deploy-frontend-s3.ps1
   ```

## Alternative: Custom Policy (More Secure)

If you prefer a custom policy with only necessary permissions:

1. Go to IAM → Policies → Create policy
2. Use JSON tab and paste:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:CreateBucket",
                "s3:PutBucketWebsite",
                "s3:PutBucketPolicy",
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject"
            ],
            "Resource": "*"
        }
    ]
}
```
3. Name it: `UniTalksS3Deployment`
4. Attach it to user `unitalks`

---

**That's it!** Once permissions are added, run the deployment script.
