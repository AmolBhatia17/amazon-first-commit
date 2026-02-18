# Mobile "Unable to connect to server" – Fix

## What was wrong
On **mobile**, the app was calling the backend at **https://44.202.124.228** (self-signed certificate). Mobile browsers (iOS Safari, Android Chrome) block or warn on self-signed certs and often don’t let you “proceed anyway,” so the connection failed. On **PC**, it worked because the certificate had been accepted once.

## What we changed

1. **Backend behind CloudFront**
   - CloudFront now has a **second origin**: your backend (EC2) at `ec2-44-202-124-228.compute-1.amazonaws.com:8080`.
   - Paths:
     - **`/api/*`** → backend (e.g. `/api/auth/token`)
     - **`/ws*`** → backend (WebSocket)
   - Everything else still goes to S3 (frontend).

2. **Frontend uses same origin**
   - The app no longer calls `https://44.202.124.228` from the browser.
   - It uses the **same origin** as the page (e.g. `https://dbpnqtdjpicsn.cloudfront.net`), so:
     - API: `https://dbpnqtdjpicsn.cloudfront.net/api/auth/token`
     - WebSocket: `wss://dbpnqtdjpicsn.cloudfront.net/ws?token=...`
   - One domain, one trusted certificate → works on mobile and PC.

## What you need to do

- **Wait 5–10 minutes** for the CloudFront distribution update to finish (status **Deployed** in the AWS Console).
- **Hard refresh or clear cache** on mobile (or use a private tab), then open:
  - **https://dbpnqtdjpicsn.cloudfront.net**
- Try **Start chat** (video/audio/text). It should work on mobile and PC.

## If you add a custom domain (e.g. unitalks.in)

- After you attach **unitalks.in** to this same CloudFront distribution, the app will keep using the same origin (e.g. `https://unitalks.in`), so API and WebSocket will still go through CloudFront and mobile will keep working. No extra steps needed for the mobile fix.

## Local development

- For **local** runs (`npm start`), the app still uses `http://localhost:8080` as the backend when `REACT_APP_API_URL` is not set, so local dev is unchanged.
