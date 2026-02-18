# How to Add AWS Permissions - Simple Guide

## Quick Method: Use AWS Managed Policies (Easiest!)

### Step 1: Go to Your User Page
1. Open: https://console.aws.amazon.com/iam/home#/users/unitalks
2. Or search for "IAM" → Click "Users" → Click "unitalks"

### Step 2: Add Permissions
1. Click the **"Add permissions"** button (blue button, top right)
2. Select **"Attach policies directly"**
3. In the search box, type: **`AmazonEC2FullAccess`**
4. **Check the box** next to "AmazonEC2FullAccess"
5. In the search box again, type: **`AmazonEC2ContainerRegistryFullAccess`**
6. **Check the box** next to "AmazonEC2ContainerRegistryFullAccess"
7. Click **"Next"** button at the bottom
8. Click **"Add permissions"** button

### Step 3: Done!
That's it! Your user now has the required permissions.

---

## Alternative: Create Custom Policy

If you prefer a custom policy with only the permissions needed:

1. Go to: https://console.aws.amazon.com/iam/home#/policies
2. Click **"Create policy"**
3. Click **"JSON"** tab
4. Copy the contents from `deployment/required-iam-policy.json`
5. Paste it in the JSON editor
6. Click **"Next"**
7. Name it: `UniTalksDeploymentPolicy`
8. Click **"Create policy"**
9. Go back to user `unitalks`
10. Click **"Add permissions"** → **"Attach policies directly"**
11. Search for `UniTalksDeploymentPolicy` and attach it

---

## What These Permissions Allow

- **AmazonEC2FullAccess**: Create and manage EC2 instances, security groups, key pairs
- **AmazonEC2ContainerRegistryFullAccess**: Create ECR repositories and push/pull Docker images

---

## After Adding Permissions

Run the deployment script again:
```powershell
cd D:\Projects\unitalks_1\unitalks-video-chat\deployment
.\deploy-fixed.ps1
```
