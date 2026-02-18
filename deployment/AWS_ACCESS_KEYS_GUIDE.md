# How to Get AWS Access Keys - Step by Step Guide

## Your AWS Account Info
- **Account ID**: 278513763034
- **Username**: unitalks
- **Console URL**: https://278513763034.signin.aws.amazon.com/console
- **Password**: uni@1234

---

## Step-by-Step Instructions

### Step 1: Sign In to AWS Console

1. **Open this URL in your browser:**
   ```
   https://278513763034.signin.aws.amazon.com/console
   ```

2. **Enter your credentials:**
   - **IAM user name**: `unitalks`
   - **Password**: `uni@1234`
   - Click **"Sign in"**

---

### Step 2: Navigate to IAM Users Page

**Option A - Using Search Bar (Easiest):**
1. At the **top of the page**, you'll see a **search bar** that says "Search for services, features, guides, and more"
2. **Type**: `IAM` (or `iam`)
3. Click on **"IAM"** from the dropdown (it will show "Manage access to AWS resources")

**Option B - Using Services Menu:**
1. Click **"Services"** at the top left (next to AWS logo)
2. Scroll down or search for **"IAM"**
3. Click **"IAM"**

---

### Step 3: Go to Your User Page

1. In the **left sidebar**, you'll see a menu
2. Click on **"Users"** (it's under "Access management" section)
3. You'll see a list of users
4. **Click on the username**: `unitalks` (it will be a blue link)

---

### Step 4: Open Security Credentials Tab

1. You're now on the user details page for `unitalks`
2. You'll see **tabs** at the top: "Permissions", "Groups", "Security credentials", etc.
3. **Click on the tab**: **"Security credentials"**

---

### Step 5: Create Access Key

1. Scroll down on the Security credentials page
2. Look for a section called **"Access keys"**
3. You'll see a button: **"Create access key"** (it's a blue button)
4. **Click "Create access key"**

---

### Step 6: Choose Use Case

1. A popup/modal will appear asking "Use case"
2. You'll see options like:
   - Command Line Interface (CLI)
   - Application running outside AWS
   - Application running on AWS compute service
   - etc.
3. **Select**: **"Command Line Interface (CLI)"**
4. Check the box: "I understand..." (if shown)
5. Click **"Next"** button at the bottom

---

### Step 7: Get Your Access Keys

1. You'll see a page with:
   - **Access key ID**: (starts with something like `AKIA...`)
   - **Secret access key**: (a long string)
   
2. **IMPORTANT**: 
   - **Copy the Access key ID** - Click the copy icon next to it
   - **Copy the Secret access key** - Click "Show" first, then copy it
   - **SAVE THESE SOMEWHERE SAFE** - You won't be able to see the secret key again!

3. Click **"Done"** button

---

### Step 8: Use the Keys

Once you have both keys:
1. Go back to PowerShell/Terminal
2. Run the deployment script - it will ask for these keys
3. Paste them when prompted

---

## Visual Guide - What You'll See

### After Sign In:
```
AWS Console
├── Top Bar: Search bar, Services menu
├── Left Sidebar: IAM menu
└── Main Area: Dashboard
```

### IAM Page:
```
Left Sidebar:
├── Dashboard
├── Access management
│   ├── Users ← CLICK HERE
│   ├── User groups
│   └── Roles
└── ...
```

### Users List:
```
Users page shows:
┌─────────────────────────┐
│ Users                   │
├─────────────────────────┤
│ unitalks ← CLICK HERE  │
└─────────────────────────┘
```

### User Details Page:
```
Tabs at top:
[Permissions] [Groups] [Security credentials] ← CLICK THIS TAB
```

### Security Credentials Tab:
```
Scroll down to:
┌─────────────────────────────┐
│ Access keys                 │
│ [Create access key] ← CLICK │
└─────────────────────────────┘
```

---

## Quick Direct Links

**Direct link to your user's Security credentials:**
```
https://console.aws.amazon.com/iam/home#/users/unitalks?section=security_credentials
```

**Direct link to create access key:**
```
https://console.aws.amazon.com/iam/home#/users/unitalks?section=security_credentials&action=create_access_key
```

---

## Troubleshooting

### Can't find "Users"?
- Make sure you're in the IAM service (search for "IAM" in top search bar)
- Look in the left sidebar menu

### Can't see "Security credentials" tab?
- Make sure you clicked on the username `unitalks` first
- The tabs are at the top of the user details page

### "Create access key" button is grayed out?
- You might already have 2 access keys (AWS allows max 2)
- Delete an old one first, or use an existing one

### Can't see the Secret access key?
- Click "Show" button next to it
- Make sure to copy it immediately - you can't see it again!

---

## What to Do After Getting Keys

1. **Copy both keys** (Access Key ID and Secret Access Key)
2. **Run the deployment script:**
   ```powershell
   cd D:\Projects\unitalks_1\unitalks-video-chat\deployment
   .\deploy-auto.ps1
   ```
3. **When prompted**, paste:
   - Access Key ID
   - Secret Access Key
   - Region: `us-east-1` (or press Enter for default)

The script will then automatically deploy everything!
