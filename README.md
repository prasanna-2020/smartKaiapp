# SmartKai — Full Stack App

## Stack
- **Frontend**: React + Vite → hosted on Vercel
- **Backend**: Vercel Serverless Functions (Node.js)
- **Search**: Serper.dev Google Shopping API
- **AI**: Groq API (Llama 4 Maverick) for price comparison

## Setup in 5 minutes

### Step 1 — Clone and install
```bash
git clone https://github.com/prasanna-2020/smartkai-app
cd smartkai-app
npm install
```

### Step 2 — Add your API keys
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:
```
SERPER_API_KEY=your_serper_key_from_serper_dev
GROQ_API_KEY=your_groq_key_from_console_groq_com
```

### Step 3 — Run locally
```bash
npm run dev
```
Open http://localhost:5173

> Note: API calls won't work locally without a local API server.
> For local testing, install `vercel` CLI:
> ```bash
> npm i -g vercel
> vercel dev
> ```
> This runs both frontend (port 3000) and API routes together.

### Step 4 — Deploy to Vercel

**Option A — Vercel CLI (recommended)**
```bash
npm i -g vercel
vercel
```
Follow prompts. When asked for environment variables, add:
- `SERPER_API_KEY` → your Serper key
- `GROQ_API_KEY` → your Groq key

**Option B — GitHub + Vercel Dashboard**
1. Push code to GitHub: `git push origin main`
2. Go to vercel.com → New Project → Import `smartkai-app`
3. Settings → Environment Variables → Add:
   - `SERPER_API_KEY` = your key
   - `GROQ_API_KEY` = your key
4. Click Deploy

Your app will be live at `https://smartkai-app.vercel.app`

## API Endpoints

### POST /api/search
Searches Google Shopping via Serper.dev
```json
{ "query": "Gas Stove", "brand": "Preethi", "hint": "4 burner", "category": "Home" }
```
Returns real product results with images, prices, ratings from Google Shopping.

### POST /api/compare
Gets platform price comparison via Groq AI
```json
{ "product": "Preethi Excel Plus 4 Burner Gas Stove", "category": "Home", "found_price": 8499 }
```
Returns estimated prices on Amazon, Flipkart, etc. with delivery times.

## Free tier limits
| Service | Free limit |
|---------|-----------|
| Serper.dev | 2,500 searches/month |
| Groq API | 14,400 requests/day |
| Vercel | Unlimited deploys |
| **Total cost** | **₹0/month** |

## Features
- 🔍 Real product search via Google Shopping (real images, real names, real prices)
- 🛒 3-step buy flow: Search → Pick product → Compare platforms
- 💰 Platform price comparison across Amazon, Flipkart, Zepto, Blinkit etc.
- 📅 Tamil Panchangam (offline engine)
- 📞 Phone Book
- 🔗 Reference Links
- 💸 Expense Tracker
- 🌙 Dark/Light theme
