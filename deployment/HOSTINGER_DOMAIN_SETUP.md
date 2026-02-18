# Connect Your Hostinger Domain to UniTalks (CloudFront)

Use this guide when your domain (e.g. **unitalks.in**) is registered and managed on **Hostinger**. The app will be served from your domain via CloudFront.

**Overview:**
- **www.yourdomain.com** → CNAME → CloudFront → your frontend
- **yourdomain.com** (root) → Redirect to **www.yourdomain.com** (Hostinger doesn’t support CNAME at root)
- SSL is handled by AWS (certificate in ACM) and CloudFront.

---

## Part 1: SSL Certificate (AWS)

You need an SSL certificate in **AWS Certificate Manager** for your domain. CloudFront only uses certificates from **US East (N. Virginia)**.

### 1.1 Request the certificate

1. Open **AWS Certificate Manager**: https://console.aws.amazon.com/acm/
2. **Set region to US East (N. Virginia)** (top-right).
3. Click **Request a certificate**.
4. Choose **Request a public certificate** → Next.
5. Add domain names (replace with your actual domain):
   - `unitalks.in`
   - `www.unitalks.in`
6. **Validation method:** DNS validation.
7. Click **Request**.

### 1.2 Validate with DNS (in Hostinger)

1. In ACM, open your certificate (status: **Pending validation**).
2. In **Domains**, you’ll see one or two CNAME records (Name + Value).
3. In **Hostinger**: go to **Domains** → your domain → **DNS / Nameservers** (or **Manage** → **DNS Zone**).
4. Add **CNAME** records exactly as shown in ACM:

   | Type | Name (Host) | Value (Points to) | TTL |
   |------|-------------|-------------------|-----|
   | CNAME | _abc123.unitalks.in (copy from ACM) | _xyz.acm-validations.aws. | 300 |

   - **Name:** Use the full name from ACM (e.g. `_a1b2c3d4.unitalks.in`). In Hostinger you may enter only the subpart (e.g. `_a1b2c3d4`) if the panel adds the domain automatically.
   - **Value:** The target from ACM (e.g. `_xyz.acm-validations.aws.` – keep the trailing dot if the panel allows it).

5. Add a CNAME for **each** validation record (e.g. one for `unitalks.in`, one for `www.unitalks.in`).
6. Wait 5–30 minutes. In ACM, status should change to **Issued**.

---

## Part 2: Add Your Domain to CloudFront

### 2.1 Edit the distribution

1. Open **CloudFront**: https://console.aws.amazon.com/cloudfront/
2. Click your distribution (e.g. **EYKXVQO6U1R98**).
3. Open the **General** tab → **Edit**.
4. **Alternate domain names (CNAMEs):** add (replace with your domain):
   - `unitalks.in`
   - `www.unitalks.in`
5. **Custom SSL certificate:** choose the certificate you just validated (e.g. for `unitalks.in`).
6. **Save**. Wait 5–15 minutes for the distribution to update.

**CloudFront domain (you’ll need it for DNS):**  
`dbpnqtdjpicsn.cloudfront.net`

---

## Part 3: DNS and Redirect in Hostinger

Hostinger does **not** support CNAME at the root (apex) domain. So:

- Point **www** to CloudFront with a **CNAME**.
- Use a **redirect** so **root (unitalks.in)** goes to **https://www.unitalks.in**.

### 3.1 Add CNAME for www

1. In Hostinger: **Domains** → your domain → **DNS Zone** (or **Manage** → **DNS**).
2. Add a record:

   | Type | Name | Value / Target | TTL |
   |------|------|----------------|-----|
   | CNAME | www | dbpnqtdjpicsn.cloudfront.net | 300 |

   - **Name:** `www` (or `www.unitalks.in` if the panel requires full name).
   - **Value:** `dbpnqtdjpicsn.cloudfront.net` (no `https://`, no trailing slash).
   - Do **not** use a proxy if Hostinger offers one (e.g. “Proxy: Off” for CloudFront).

3. Save.

### 3.2 Redirect root to www

1. In Hostinger, find **Redirects** (or **Domain** → **Redirect**).
2. Create a redirect:
   - **From:** `unitalks.in` (or “@” / root).
   - **To:** `https://www.unitalks.in`
   - **Type:** 301 (Permanent) if available.
3. Save.

So:
- **https://www.unitalks.in** → CNAME → CloudFront → your app.
- **https://unitalks.in** → redirects → **https://www.unitalks.in**.

---

## Part 4: Optional – Use Your Domain in the App

Right now the app uses the same origin (CloudFront) for API/WS when `REACT_APP_API_URL` is not set, so it works with the CloudFront URL. After connecting your domain:

- Users can open **https://www.unitalks.in** (or **https://unitalks.in** after redirect).
- No code change is required if you keep using the same CloudFront distribution and leave `REACT_APP_API_URL` unset in the build; the app will use the current origin (your domain) for API and WebSocket.

If you later add a separate API domain (e.g. **api.unitalks.in**), then set `REACT_APP_API_URL` to that URL and rebuild/redeploy.

---

## Checklist

- [ ] Certificate requested in ACM (**US East N. Virginia**).
- [ ] Validation CNAMEs added in Hostinger DNS.
- [ ] Certificate status **Issued** in ACM.
- [ ] CloudFront distribution updated: alternate domains + custom SSL.
- [ ] Hostinger: **CNAME** `www` → `dbpnqtdjpicsn.cloudfront.net`.
- [ ] Hostinger: **Redirect** root → `https://www.unitalks.in`.
- [ ] Waited for CloudFront deployment and DNS propagation (up to ~30 min).
- [ ] Test: **https://www.unitalks.in** loads the app.
- [ ] Test: **https://unitalks.in** redirects to **https://www.unitalks.in**.

---

## Quick reference

| Item | Value |
|------|--------|
| Domain (example) | unitalks.in, www.unitalks.in |
| CloudFront domain | dbpnqtdjpicsn.cloudfront.net |
| Distribution ID | EYKXVQO6U1R98 |
| DNS at | Hostinger (Domains → DNS Zone) |
| Root (apex) | Redirect to https://www.unitalks.in |
| www | CNAME → dbpnqtdjpicsn.cloudfront.net |

---

## Troubleshooting

- **Certificate stays “Pending validation”**  
  Double-check the CNAME name and value in Hostinger match ACM exactly (including underscores). Wait up to 30 minutes.

- **www loads but “connection not secure”**  
  In CloudFront, ensure the **Custom SSL certificate** is the one for your domain and status is **Issued** in **us-east-1**.

- **502/503 from CloudFront**  
  Confirm S3 and backend origins in CloudFront are correct and the distribution has finished deploying.

- **Root domain doesn’t redirect**  
  In Hostinger, ensure the redirect is for the root (e.g. `unitalks.in` or “@”) and target is `https://www.unitalks.in`.

After this, your Hostinger domain will serve UniTalks through CloudFront.

---

# Hostinger mein kaise karein (Step-by-step Hindi)

## 1. Hostinger login

1. https://www.hostinger.in par jao.
2. **Login** karo (apna email / password).

---

## 2. DNS Zone kahan hai

1. **hPanel** (dashboard) open hoga.
2. Sidebar mein **Domains** par click karo.
3. Apna domain (jaise **unitalks.in**) dikhega — uske saamne **Manage** ya **DNS / Nameservers** par click karo.
4. **DNS Zone** / **DNS Records** section open karo.  
   Yahan pe tum **Add record**, **CNAME**, **Redirect** sab kuch add karoge.

---

## 3. www ko CloudFront se jodna (CNAME)

1. **DNS Zone** mein **Add record** / **Add new record** button par click karo.
2. **Type** select karo: **CNAME**.
3. Fill karo:
   - **Name / Host:** `www` (sirf www, domain mat likho agar panel automatically add karta ho).
   - **Points to / Value / Target:** `dbpnqtdjpicsn.cloudfront.net`  
     (bilkul yehi likho, http/https mat lagana.)
   - **TTL:** 300 ya default rakho.
4. **Save** karo.

Isse **www.unitalks.in** CloudFront se connect ho jayega.

---

## 4. Root domain (unitalks.in) ko www par redirect karna

Hostinger pe root domain par direct CNAME nahi chalega, isliye redirect use karenge.

1. Hostinger panel mein **Domains** → apna domain → **Redirects** dhoondo.  
   (Kabhi-kabhi **Advanced** → **Redirects** ya **Domain** → **Redirect** hota hai.)
2. **Create Redirect** / **Add Redirect** par click karo.
3. Aise set karo:
   - **From / Source:** `unitalks.in` ya **@** (root domain).
   - **To / Destination:** `https://www.unitalks.in`
   - **Type:** 301 (Permanent) choose karo agar option ho.
4. **Save** karo.

Ab **unitalks.in** open karoge to automatically **https://www.unitalks.in** par chala jayega.

---

## 5. AWS certificate ke liye CNAME (SSL validate karne ke liye)

Jab tum AWS Certificate Manager (ACM) mein certificate request karte ho, ACM tumhe 1 ya 2 CNAME record deta hai (Name + Value). Unhe **Hostinger DNS Zone** mein add karna hai:

1. **DNS Zone** mein wapas jao (jaise step 2).
2. **Add record** → **CNAME** choose karo.
3. ACM mein jo **Name** dikhe (jaise `_a1b2c3d4e5.unitalks.in`):
   - Hostinger mein **Name** field mein wahi daalo — agar panel automatically domain add karta hai to sirf `_a1b2c3d4e5` daal sakte ho.
4. ACM mein jo **Value** dikhe (jaise `_xyz.acm-validations.aws.`):
   - **Points to / Value** mein wahi paste karo (trailing dot ho to bhi theek hai).
5. **Save** karo.
6. Agar 2 CNAME dikhe (unitalks.in + www.unitalks.in dono ke liye), to dono alag-alag add karo.
7. 5–30 minute wait karo — phir AWS ACM mein certificate **Issued** dikhega.

---

## Short summary

| Kaam | Hostinger mein kahan | Kya daalna hai |
|------|----------------------|-----------------|
| www → CloudFront | DNS Zone → Add CNAME | Name: `www`, Value: `dbpnqtdjpicsn.cloudfront.net` |
| Root → www redirect | Redirects → Add Redirect | From: unitalks.in, To: https://www.unitalks.in |
| SSL validate | DNS Zone → Add CNAME | ACM se copy kiya Name + Value (dono records) |

Baaki steps (AWS mein certificate request, CloudFront pe domain add karna) **HOSTINGER_DOMAIN_SETUP.md** ke Part 1 aur Part 2 mein English mein diye hain — wahi follow karo; sirf DNS aur redirect ka kaam Hostinger mein upar diye steps se ho jayega.
