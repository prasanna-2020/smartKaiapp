// /api/compare.js — Vercel Serverless Function
// Platform price comparison via Groq Llama 4

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { product, category, found_price } = req.body || {}
  if (!product) return res.status(400).json({ error: 'Product required' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const PLATFORM_MAP = {
    grocery:     ['Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket'],
    medicine:    ['PharmEasy', '1mg', 'Netmeds', 'Apollo Pharmacy'],
    clothing:    ['Myntra', 'Meesho', 'Amazon', 'Flipkart'],
    electronics: ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'],
    home:        ['Amazon', 'Flipkart', 'Pepperfry', 'IKEA'],
    default:     ['Amazon', 'Flipkart', 'Meesho', 'Snapdeal']
  }

  const cat = (category || '').toLowerCase()
  const platforms = PLATFORM_MAP[cat] || PLATFORM_MAP.default
  const isQuick = cat === 'grocery' || cat === 'medicine'

  const prompt = `You are a shopping expert for India. Today is ${new Date().toDateString()}.

Product: "${product}"
Category: ${category || 'General'}
${found_price ? `Reference price found online: ₹${found_price}` : ''}
Check availability and pricing on: ${platforms.join(', ')}

IMPORTANT RULES:
1. If this product category is NOT sold on a platform (e.g. gas stoves on Zepto, or fresh groceries on Myntra), set available: false
2. Prices should be realistic for THIS specific product in India today
3. If found_price is given, other platforms should be within ±15% typically
4. Do not always show Amazon as the lowest — be accurate to the actual market
5. For quick delivery apps (Zepto/Blinkit/Instamart): delivery_time in minutes like "8 mins", "12 mins"
6. For regular apps: "Same day", "1-2 days", "2-3 days", "3-5 days"

Return ONLY valid JSON, no markdown:
{
  "platforms": [
    {
      "name": "Amazon",
      "price": 8499,
      "original_price": 9999,
      "discount": "15% off",
      "delivery_time": "1-2 days",
      "delivery_free": true,
      "available": true,
      "search_query": "${product}",
      "note": ""
    }
  ],
  "best_price": "Flipkart",
  "best_delivery": "Amazon",
  "best_overall": "Flipkart",
  "summary": "Flipkart offers the lowest price for this product."
}

Sort by price ascending. Set available:false for platforms that genuinely don't carry this product type.`

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          { role: 'system', content: 'Shopping price expert for India 2025. Return only valid JSON. No markdown. Be accurate — do not always recommend Amazon if it does not carry the product.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1500
      })
    })

    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const d = await r.json()
    let raw = (d.choices?.[0]?.message?.content || '').trim()
    raw = raw.replace(/^```json\s*/i,'').replace(/^```/,'').replace(/```$/,'').trim()
    return res.status(200).json(JSON.parse(raw))

  } catch (err) {
    console.error('Compare error:', err)
    // Accurate fallback based on actual platform availability
    return res.status(200).json(buildFallback(product, platforms, found_price, isQuick, cat))
  }
}

function buildFallback(product, platforms, foundPrice, isQuick, cat) {
  const base = foundPrice || 2000
  const dels = isQuick ? ['8 mins','12 mins','18 mins','25 mins'] : ['1-2 days','2-3 days','3-5 days','Same day']

  // Mark truly unavailable platforms based on category
  const unavailableMap = {
    'Zepto':            cat => !['grocery','medicine'].includes(cat),
    'Blinkit':          cat => !['grocery','medicine'].includes(cat),
    'Swiggy Instamart': cat => !['grocery'].includes(cat),
    'BigBasket':        cat => !['grocery'].includes(cat),
    'IKEA':             cat => !['home'].includes(cat),
    'Pepperfry':        cat => !['home'].includes(cat),
    'Croma':            cat => !['electronics'].includes(cat),
    'Reliance Digital': cat => !['electronics'].includes(cat),
    'Myntra':           cat => !['clothing'].includes(cat),
  }

  const plats = platforms.map((name, i) => {
    const unavailFn = unavailableMap[name]
    const available = unavailFn ? !unavailFn(cat) : true
    return {
      name,
      price: available ? Math.round(base * (1 + i * 0.05)) : null,
      original_price: available ? Math.round(base * (1 + i * 0.05) * 1.12) : null,
      discount: available ? `${12 - i * 2}% off` : null,
      delivery_time: dels[i % dels.length],
      delivery_free: i === 0,
      available,
      search_query: product,
      note: available ? '' : 'Not available on this platform'
    }
  }).sort((a,b) => (a.available?a.price:Infinity) - (b.available?b.price:Infinity))

  const availPlats = plats.filter(p => p.available)
  return {
    platforms: plats,
    best_price: availPlats[0]?.name,
    best_delivery: availPlats[0]?.name,
    best_overall: availPlats[0]?.name,
    summary: `${availPlats[0]?.name || 'First available platform'} likely offers the lowest price. Tap the platform name to check live pricing.`
  }
}
