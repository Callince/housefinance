# Deployment Guide — HouseFinance

Free hosting with HTTPS subdomains (no custom domain needed).

- **Frontend** → Vercel → `your-app.vercel.app`
- **Backend** → Render → `your-api.onrender.com`
- **Database** → SQLite on Render's persistent disk (free, included)

---

## Step 1 — Push to GitHub

```bash
# In D:/bachelor-finance
gh auth login                        # once, if gh CLI installed
gh repo create housefinance --public --source=. --push

# Or manually:
git remote add origin https://github.com/YOUR_USERNAME/housefinance.git
git push -u origin main
```

If you don't have `gh` CLI, create the repo on github.com first, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/housefinance.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Backend to Render

1. Go to **https://render.com** and sign in with GitHub
2. Click **New → Blueprint**
3. Select your `housefinance` repo
4. Render reads `render.yaml` and shows the service plan → **Apply**
5. After creation, go to the service → **Environment** tab → fill in:
   - `RESEND_API_KEY` = `re_6AMBC8W3_DT6Q97Lb3AKNov5z7SR1swt3`
   - `VAPID_PUBLIC_KEY` = `BFj_94ya3ZSHukaY9hVIrKxFsSDEtPzURMFSYnQbCw8ZsqaoNL-alSrE82vcO_TejTUt-tfI0edaV2IuFCBUx0w`
   - `VAPID_EMAIL` = `mailto:goodsoncallince@gmail.com`
6. You also need to upload the VAPID private key to the persistent disk.
   Use Render's **Shell** tab once deployed:
   ```bash
   cat > /var/data/vapid_private.pem << 'EOF'
   -----BEGIN PRIVATE KEY-----
   (paste content of backend/vapid_private.pem here)
   -----END PRIVATE KEY-----
   EOF
   ```
7. Trigger a manual redeploy. Your backend will be at:
   `https://housefinance-api.onrender.com`

**Test it:** visit `https://housefinance-api.onrender.com/api/health` — should return `{"status":"ok"}`.

> ⚠️ Render free tier sleeps after 15min idle. First request after sleep takes ~30s to wake. Subsequent requests are instant.

---

## Step 3 — Deploy Frontend to Vercel

1. Go to **https://vercel.com** and sign in with GitHub
2. Click **Add New → Project**
3. Select your `housefinance` repo
4. **Framework**: Vite (auto-detected)
5. **Root Directory**: `frontend`
6. **Environment Variables** → add:
   - Name: `VITE_API_URL`
   - Value: `https://housefinance-api.onrender.com` (your Render URL, no trailing slash)
7. Click **Deploy**

Your app will be live at `https://housefinance.vercel.app` (or similar).

---

## Step 4 — Update Backend CORS with Your Vercel URL

1. In Render dashboard → your service → **Environment** tab
2. Edit `CORS_ORIGINS`:
   ```
   https://housefinance.vercel.app,https://housefinance-xxx.vercel.app
   ```
3. Save → Render auto-redeploys

> The backend also allows any `*.vercel.app` URL via regex, so preview deploys work too.

---

## Step 5 — Test Your Live App

1. Open your Vercel URL on your phone: `https://housefinance.vercel.app`
2. Register a new account
3. Create a house, add expenses, rent payments
4. Enable push notifications in House Settings
5. Install as PWA: browser menu → "Install app" / "Add to Home Screen"

---

## Updating Your App

```bash
# Make changes locally
git add .
git commit -m "your message"
git push
```

- **Vercel** auto-deploys on every push to `main`
- **Render** auto-deploys on every push to `main`
- Both show live logs in their dashboards

---

## Troubleshooting

**"CORS error" in browser console**
→ Add your Vercel URL to `CORS_ORIGINS` in Render env vars

**Backend returns 503 / takes 30s**
→ Normal for free tier after idle. Keep it warm with a cron-job.org ping every 10min to `/api/health`

**Push notifications don't work**
→ Must be HTTPS (Vercel/Render give you HTTPS automatically). Check that VAPID_PRIVATE_KEY is uploaded to `/var/data/vapid_private.pem`

**Email reports fail**
→ Check Resend API key is set. For testing tier, recipients must be verified. Get a domain or use `onboarding@resend.dev` only to your own verified email.

---

## Keep Backend Awake (Optional)

Render free tier sleeps after 15min. To keep it warm:

1. Go to **https://cron-job.org** (free)
2. Create a cron job:
   - URL: `https://housefinance-api.onrender.com/api/health`
   - Interval: every 10 minutes
3. Your backend stays responsive 24/7 at no cost

---

## Costs (All Free)

| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| Render | 750 hrs/month | Backend + 1GB persistent disk |
| Vercel | Unlimited | Frontend with HTTPS |
| Resend | 3000 emails/month | Monthly reports |
| cron-job.org | Unlimited | Keep backend warm |

**Total cost: ₹0/month** 🎉
