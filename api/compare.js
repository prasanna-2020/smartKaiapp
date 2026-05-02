// /api/compare.js — Step 4: Price comparison across platforms
// Strategy: Serper per-platform search (natural language, not site:) + Groq for gaps
// NEVER marks available:false unless certain the platform doesn't carry that product type

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { product, category, found_price, pincode, city } = req.body || {}
  if (!product) return res.status(400).json({ error: 'Product required' })

  const serperKey = process.env.SERPER_API_KEY
  const groqKey   = process.env.GROQ_API_KEY
  if (!serperKey) return res.status(500).json({ error: 'SERPER_API_KEY not configured' })

  const location = city ? `${city}${pincode ? ' '+pincode : ''}` : (pincode || 'Chennai')
  const rawCat = (category || '').toLowerCase()
  const cat = fixCategory(rawCat, product)

  // Platform map — matched exactly to category from clarify.js
  // Only show platforms that genuinely sell this product type
  const PLATFORM_MAP = {
    grocery:      ['Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket'],
    electronics:  ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
    fashion:      ['Myntra', 'Amazon', 'Flipkart', 'Meesho'],
    beauty:       ['Nykaa', 'Amazon', 'Flipkart', 'Purplle'],
    medicine:     ['PharmEasy', '1mg', 'Netmeds', 'Apollo Pharmacy'],
    home_kitchen: ['Amazon', 'Flipkart', 'Pepperfry', 'IKEA'],
    appliances:   ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
    sports:       ['Amazon', 'Flipkart', 'Decathlon', 'Myntra'],
    baby:         ['Amazon', 'Flipkart', 'FirstCry', 'Myntra'],
    furniture:    ['Amazon', 'Flipkart', 'Pepperfry', 'Urban Ladder'],
    automotive:   ['Amazon', 'Flipkart'],
    toys:         ['Amazon', 'Flipkart', 'FirstCry'],
    pet:          ['Amazon', 'Flipkart', 'Heads Up For Tails'],
    books:        ['Amazon', 'Flipkart'],
    jewellery:    ['Amazon', 'Flipkart', 'Tanishq', 'Myntra'],
    travel:       ['Amazon', 'Flipkart', 'Myntra'],
    stationery:   ['Amazon', 'Flipkart'],
    gardening:    ['Amazon', 'Flipkart', 'Ugaoo'],
    // legacy keys
    clothing:     ['Myntra', 'Amazon', 'Flipkart', 'Meesho'],
    home:         ['Amazon', 'Flipkart', 'Pepperfry', 'IKEA'],
    default:      ['Amazon', 'Flipkart', 'Meesho'],
    other:        ['Amazon', 'Flipkart', 'Meesho'],
  }

  // Also do keyword-based category correction as safety net
  function fixCategory(cat, product) {
    if (cat && cat !== 'default') return cat
    const q = product.toLowerCase()
    const groceryWords = ['milk','butter','ghee','oil','rice','dal','atta','bread','egg','curd','paneer','biscuit','chocolate','tea','coffee','organic','akshayakalpa','amul','nandini','aavin','britannia','parle']
    const electronicsWords = ['phone','laptop','tv','tablet','headphone','earphone','charger','camera','speaker','watch','macbook','iphone','samsung','redmi']
    const clothingWords = ['shoe','shirt','jeans','tshirt','kurta','saree','dress','sneaker','sandal','jacket','bag','nike','adidas','puma']
    const medicineWords = ['tablet','capsule','syrup','medicine','vitamin','supplement','paracetamol']
    const homeWords = ['sofa','mattress','fan','ac','fridge','washing machine','mixer','grinder','cooker','iron','geyser']
    if (groceryWords.some(w => q.includes(w))) return 'grocery'
    if (electronicsWords.some(w => q.includes(w))) return 'electronics'
    if (clothingWords.some(w => q.includes(w))) return 'clothing'
    if (medicineWords.some(w => q.includes(w))) return 'medicine'
    if (homeWords.some(w => q.includes(w))) return 'home'
    return 'default'
  }

  // Platform → Google-friendly search name + domain keyword
  const PLAT_META = {
    'Swiggy Instamart': { search: 'swiggy instamart', domain: 'swiggy.com', url: (q) => `https://www.swiggy.com/search?query=${encodeURIComponent(q)}` },
    'Blinkit':          { search: 'blinkit', domain: 'blinkit.com', url: (q) => `https://blinkit.com/search?q=${encodeURIComponent(q)}` },
    'Zepto':            { search: 'zepto', domain: 'zeptonow.com', url: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}` },
    'BigBasket':        { search: 'bigbasket', domain: 'bigbasket.com', url: (q) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(q)}` },
    'PharmEasy':        { search: 'pharmeasy', domain: 'pharmeasy.in', url: (q) => `https://pharmeasy.in/search/all?name=${encodeURIComponent(q)}` },
    '1mg':              { search: '1mg', domain: '1mg.com', url: (q) => `https://www.1mg.com/search/all?name=${encodeURIComponent(q)}` },
    'Netmeds':          { search: 'netmeds', domain: 'netmeds.com', url: (q) => `https://www.netmeds.com/catalogsearch/result?q=${encodeURIComponent(q)}` },
    'Apollo Pharmacy':  { search: 'apollo pharmacy', domain: 'apollopharmacy.in', url: (q) => `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(q)}` },
    'Amazon':           { search: 'amazon india', domain: 'amazon.in', url: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
    'Flipkart':         { search: 'flipkart', domain: 'flipkart.com', url: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}` },
    'Myntra':           { search: 'myntra', domain: 'myntra.com', url: (q) => `https://www.myntra.com/search?rawQuery=${encodeURIComponent(q)}` },
    'Meesho':           { search: 'meesho', domain: 'meesho.com', url: (q) => `https://meesho.com/search?q=${encodeURIComponent(q)}` },
    'Croma':            { search: 'croma', domain: 'croma.com', url: (q) => `https://www.croma.com/searchB?q=${encodeURIComponent(q)}` },
    'Reliance Digital': { search: 'reliance digital', domain: 'reliancedigital.in', url: (q) => `https://www.reliancedigital.in/search?q=${encodeURIComponent(q)}` },
    'Pepperfry':        { search: 'pepperfry', domain: 'pepperfry.com', url: (q) => `https://www.pepperfry.com/site/search.html#q=${encodeURIComponent(q)}` },
    'IKEA':             { search: 'ikea india', domain: 'ikea.com', url: (q) => `https://www.ikea.com/in/en/search/?q=${encodeURIComponent(q)}` },
    'Snapdeal':         { search: 'snapdeal', domain: 'snapdeal.com', url: (q) => `https://www.snapdeal.com/search?keyword=${encodeURIComponent(q)}` },
  }

  const DELIVERY_MAP = {
    'Zepto':'8–12 mins', 'Blinkit':'10–15 mins', 'Swiggy Instamart':'15–20 mins', 'BigBasket':'2–4 hrs',
    'PharmEasy':'Same day', '1mg':'Same day', 'Netmeds':'1–2 days', 'Apollo Pharmacy':'Same day',
    'Amazon':'1–2 days', 'Flipkart':'2–3 days', 'Myntra':'3–5 days', 'Meesho':'5–7 days',
    'Croma':'Same day', 'Reliance Digital':'Same day', 'Pepperfry':'7–10 days',
    'IKEA':'3–5 days', 'Snapdeal':'5–7 days',
  }

  const platforms = PLATFORM_MAP[cat] || PLATFORM_MAP.default

  // Fetch per platform in parallel
  const results = await Promise.allSettled(
    platforms.map(name => {
      const meta = PLAT_META[name] || { search: name.toLowerCase(), domain: name.toLowerCase() }
      return fetchPrice(serperKey, product, name, meta.search, meta.domain, location)
    })
  )

  let platformData = results.map((r, i) => {
    const name = platforms[i]
    const meta = PLAT_META[name] || {}
    const buyUrl = meta.url ? meta.url(product) : `https://www.google.com/search?q=${encodeURIComponent(name+' '+product)}`
    const delivery = DELIVERY_MAP[name] || '—'

    if (r.status === 'rejected' || !r.value) {
      // search failed — NEVER mark unavailable, just unknown price
      return { name, price: null, available: true, price_unknown: true,
               delivery_time: delivery, buy_link: buyUrl,
               search_query: product, source: 'search_failed',
               note: 'Tap to check live price' }
    }

    return {
      name,
      price: r.value.price,
      original_price: r.value.original_price,
      discount: r.value.discount,
      available: true, // always true from search
      price_unknown: r.value.price == null,
      delivery_time: r.value.price ? delivery : delivery,
      delivery_free: r.value.delivery_free || false,
      buy_link: r.value.link || buyUrl,
      search_query: product,
      source: r.value.price ? 'google_live' : 'search_no_price',
      note: r.value.price ? '' : 'Tap to check live price',
      rating: r.value.rating || null,
    }
  })

  // Use Groq ONLY to estimate prices for platforms where search returned nothing
  // With location context and clear instructions to never mark unavailable
  const noPrice = platformData.filter(p => !p.price)
  if (noPrice.length > 0 && groqKey) {
    const hasPrices = platformData.filter(p => p.price)
    const priceRef = hasPrices.map(p => `${p.name}:₹${p.price}`).join(', ')
    try {
      const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          messages: [
            { role: 'system', content: 'Indian shopping price expert 2025. Return only valid JSON. No markdown. No preamble.' },
            { role: 'user', content: `Product: "${product}"
Location: ${location}, India
Category: ${cat}
Live prices found so far: ${priceRef || 'none'}
${found_price ? `Google Shopping price: ₹${found_price}` : ''}
Estimate prices on: ${noPrice.map(p => p.name).join(', ')}

RULES — READ CAREFULLY:
1. Only estimate prices for platforms provided — do not add others.
2. Set available:false ONLY when logically certain the platform never sells this product type (Zepto for laptops, Myntra for milk, IKEA for groceries).
3. For grocery/dairy: Zepto/Blinkit/Instamart/BigBasket → always available:true.
4. PRICE ACCURACY IS CRITICAL: If found_price is given, ALL estimates must be within ±25% of that price. Example: if wall clock found at ₹187 on Meesho → Amazon estimate must be ₹150–₹280, NOT ₹800 or ₹1200. Never give wildly different prices.
5. If live prices were found on some platforms, use those as anchors for the remaining estimates.
6. Be realistic for India 2025 market. A simple wall clock costs ₹150–₹500. Running shoes ₹2000–₹8000. Organic milk ₹40–₹60 per 500ml.

Return ONLY: {"estimates":[{"name":"BigBasket","price":45,"available":true,"note":""}]}`
            }
          ],
          temperature: 0.1, max_tokens: 700
        })
      })

      if (gr.ok) {
        const gd = await gr.json()
        let raw = (gd.choices?.[0]?.message?.content || '').trim()
          .replace(/^```json\s*/i,'').replace(/```$/,'').trim()
        const estimates = JSON.parse(raw).estimates || []
        estimates.forEach(e => {
          const idx = platformData.findIndex(p => p.name === e.name && !p.price)
          if (idx < 0) return
          if (e.available === false) {
            platformData[idx].available = false
            platformData[idx].source = 'ai_certain_unavailable'
            platformData[idx].note = 'Not available on this platform'
          } else if (e.price) {
            platformData[idx].price = e.price
            platformData[idx].price_unknown = false
            platformData[idx].source = 'ai_estimated'
            platformData[idx].note = e.confidence === 'low' ? '~Estimated · verify on platform' : '~AI estimate'
          }
        })
      }
    } catch (e) { /* Groq failed — keep price_unknown, user can tap Search */ }
  }

  // Sort: live price first → estimated → no price → unavailable
  const order = { 'google_live': 0, 'ai_estimated': 1, 'search_no_price': 2, 'search_failed': 3, 'ai_certain_unavailable': 4 }
  platformData.sort((a, b) => {
    if (!a.available && b.available) return 1
    if (a.available && !b.available) return -1
    const oa = order[a.source] ?? 3, ob = order[b.source] ?? 3
    if (oa !== ob) return oa - ob
    return (a.price || 99999) - (b.price || 99999)
  })

  const withPrice = platformData.filter(p => p.available && p.price)
  const lowest = withPrice.length ? Math.min(...withPrice.map(p => p.price)) : null
  const best = platformData.find(p => p.price === lowest)

  return res.status(200).json({
    platforms: platformData.map(p => ({
      ...p,
      _isLowest: p.price === lowest && p.available,
      source_label: p.source === 'google_live' ? '🟢 Live'
                  : p.source === 'ai_estimated' ? '🟡 Est.'
                  : p.price_unknown ? '🔍 Tap' : '—'
    })),
    best_overall: best?.name || null,
    best_price: best?.name || null,
    location,
    summary: best?.price
      ? `${best.name} has the lowest price at ₹${best.price} · ${best.delivery_time}`
      : `Tap Search → on each platform to verify live prices in ${location}.`,
    live_count: platformData.filter(p => p.source === 'google_live').length,
  })
}

async function fetchPrice(apiKey, product, platName, searchName, domainKeyword, location) {
  // Natural language search — far more reliable than site: for Instamart/Zepto
  const q = `${product} ${searchName}`

  const [shopRes, webRes] = await Promise.allSettled([
    fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'in', hl: 'en', num: 6 })
    }),
    fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, gl: 'in', hl: 'en', num: 5 })
    })
  ])

  // Try shopping results first
  if (shopRes.status === 'fulfilled' && shopRes.value.ok) {
    const data = await shopRes.value.json()
    const items = (data.shopping || []).filter(i =>
      (i.source || i.link || '').toLowerCase().includes(domainKeyword.split('.')[0])
    )
    if (items.length > 0) {
      const best = items[0]
      const price = parseP(best.price)
      const orig = parseP(best.originalPrice)
      return {
        price,
        original_price: orig && orig > price ? orig : null,
        discount: best.discount || null,
        title: best.title,
        link: best.link,
        delivery_free: (best.delivery || '').toLowerCase().includes('free'),
        rating: best.rating || null,
      }
    }
  }

  // Try web results
  if (webRes.status === 'fulfilled' && webRes.value.ok) {
    const wd = await webRes.value.json()
    const domKey = domainKeyword.split('.')[0]
    const items = (wd.organic || []).filter(r => (r.link || '').toLowerCase().includes(domKey))
    if (items.length > 0) {
      const price = extractP(items[0].snippet || items[0].title || '')
      return { price, title: items[0].title, link: items[0].link }
    }
  }

  return null
}

function parseP(s = '') {
  if (!s) return null
  const m = s.replace(/,/g,'').match(/[\d]+(\.\d+)?/)
  return m ? Math.round(parseFloat(m[0])) : null
}
function extractP(t = '') {
  const m = t.replace(/,/g,'').match(/₹\s*([\d]+)/)
  return m ? parseInt(m[1]) : null
}
