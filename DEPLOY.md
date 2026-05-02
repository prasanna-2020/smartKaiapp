# SmartKai — Deployment Guide

## What you have
- React frontend (Vite)
- 2 Vercel serverless API functions
- Serper.dev for real Google Shopping results
- Groq/Llama4 for AI platform comparison

## Step 1 — Create GitHub repo

1. Go to github.com → New repository
2. Name: `smartkai-app`
3. Public or Private (either works)
4. DO NOT initialize with README
5. Click Create

## Step 2 — Push code to GitHub

Open terminal in the `smartkai-app` folder:

```bash
git init
git add .
git commit -m "Initial SmartKai app"
git branch -M main
git remote add origin https://github.com/prasanna-2020/smartkai-app.git
git push -u origin main
```

## Step 3 — Deploy to Vercel

1. Go to vercel.com → Log in with GitHub
2. Click "Add New Project"
3. Import `smartkai-app` from your GitHub
4. Framework: **Vite** (auto-detected)
5. Build command: `npm run build`
6. Output directory: `dist`
7. Click **Deploy** (it will FAIL — that's OK, next step)

## Step 4 — Add environment variables

In your Vercel project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `SERPER_API_KEY` | your key from serper.dev |
| `GROQ_API_KEY` | your key from console.groq.com |

Click Save → then go to Deployments → Redeploy

## Step 5 — Verify it works

Your app will be live at: `https://smartkai-app.vercel.app`

Test with:
- Product: "Gas stove", Brand: "Preethi", Detail: "4 burner", Category: Kitchen
- Product: "Running shoes", Brand: "Nike", Category: Clothing

## Local development

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Add your keys to .env.local
SERPER_API_KEY=your_serper_key
GROQ_API_KEY=your_groq_key

# 3. Install and run
npm install
npm run dev

# 4. For API functions locally, install Vercel CLI
npm i -g vercel
vercel dev
```

## Free tier limits

| Service | Free limit | What happens when exceeded |
|---------|-----------|---------------------------|
| Serper.dev | 2,500 searches/month | Returns error, upgrade to $50/mo |
| Groq API | 1,000 req/day | Returns 429, resets at midnight |
| Vercel | Unlimited deploys | Always free |

## Troubleshooting

**"Search failed"** → Check SERPER_API_KEY in Vercel env vars
**"Comparison failed"** → Check GROQ_API_KEY in Vercel env vars
**No images showing** → Normal for some products — Google Shopping thumbnails vary
**"No products found"** → Try broader search terms or different brand name
