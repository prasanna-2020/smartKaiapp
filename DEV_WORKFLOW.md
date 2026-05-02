# SmartKai — Dev Branch Setup & Testing Workflow

## Setup dev branch (one time)

```bash
cd smartkai-app

# Create dev branch
git checkout -b dev

# Push dev branch to GitHub
git push -u origin dev
```

## Connect dev branch to Vercel preview (one time)

Vercel automatically creates preview URLs for every branch.

1. Go to **vercel.com** → Your project → **Settings → Git**
2. Under **Production Branch** — keep it as `main`
3. Every push to `dev` branch will auto-deploy to:
   `https://smart-kaiapp-git-dev-prasanna-2020.vercel.app`

That's your test URL. Only push to `main` when fully tested.

---

## Daily workflow

```bash
# Always work on dev branch
git checkout dev

# Make changes, test locally
npm run dev   # runs at localhost:5173 (frontend only)
# OR
vercel dev    # runs at localhost:3000 (frontend + API routes together — recommended)

# When ready to test on Vercel dev preview
git add .
git commit -m "Fix: describe what you changed"
git push origin dev
# → Auto-deploys to: smart-kaiapp-git-dev-prasanna-2020.vercel.app

# Test thoroughly on the preview URL
# When satisfied, merge to production
git checkout main
git merge dev
git push origin main
# → Auto-deploys to: smart-kaiapp.vercel.app (PRODUCTION)
```

---

## Local dev with API routes (recommended for testing)

Install Vercel CLI once:
```bash
npm i -g vercel
```

Create a `.env.local` file in the project root:
```
SERPER_API_KEY=your_serper_key
GROQ_API_KEY=your_groq_key
```

Then run:
```bash
vercel dev
```
This starts everything at `http://localhost:3000` — both the React app AND the `/api/` serverless functions work locally.

---

## Environment variables on Vercel

Your API keys need to be set on Vercel for the dev preview too:

1. Go to **vercel.com** → Your project → **Settings → Environment Variables**
2. Make sure both keys have **all environments** checked:
   - ✅ Production
   - ✅ Preview  ← this covers your dev branch
   - ✅ Development

---

## What to test on dev preview

### Buy List
- [ ] Search "Akshayakalpa Milk 500ml" → Grocery → prices on Zepto/Blinkit match actual
- [ ] Search "Preethi Gas Stove 4 burner" → Home → correct platforms, no Zepto
- [ ] Search "Nike running shoes" → Clothing → Myntra/Meesho/Amazon, NOT grocery apps
- [ ] Search "Shih Tzu puppy" → should show 🚫 error (live animal, not a product)
- [ ] Search "plumber" → should show 🚫 error (service, not a product)
- [ ] Paste a product URL → extracts product correctly
- [ ] Add item → appears in correct category tab in wishlist
- [ ] Compare again from wishlist → works, Back to Wishlist button present
- [ ] Delete item → removed cleanly
- [ ] 🟢 Live badge shows for real Google Shopping results

### Expenses
- [ ] Category chips shown first (mandatory)
- [ ] + New category → back button works → returns to form with new cat
- [ ] Amount field is large and prominent
- [ ] Description is optional
- [ ] Saved expense shows correctly

### Calendar
- [ ] Month view — dates not breaking on any screen width
- [ ] Click date → Day view
- [ ] Chandrastamam banner shows at top of day view
- [ ] Timing order: பிரம்ம → நல்ல நேரம் → குளிகை | ராகு → யமகண்டம்
- [ ] நல்ல நேரம் shows exactly twice (morning + evening)
- [ ] Reminder time picker visible and correct height
- [ ] Enable notifications → reminder fires at set time
- [ ] Saved reminders appear below the form

### Theme
- [ ] Light/Dark toggle works on all screens

### General
- [ ] Logo alignment in header (icon + text vertically centred)
- [ ] Bottom nav switches screens correctly
- [ ] Works on mobile browser (test on phone)
- [ ] No console errors

---

## Bug reporting format

When you find bugs, report them like this so I can fix all at once:

**Screen:** Buy List / Expenses / Calendar / etc.
**Step:** What you did
**Expected:** What should happen
**Actual:** What actually happened
**Screenshot:** (attach if possible)
