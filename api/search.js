// /api/search.js — Vercel Serverless Function
// Real product search via Serper.dev Google Shopping API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query, brand, hint, category } = req.body || {}
  if (!query) return res.status(400).json({ error: 'Query is required' })

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'SERPER_API_KEY not configured' })

  // Build a precise search query
  const parts = []
  if (brand) parts.push(brand)
  parts.push(query)
  if (hint) parts.push(hint)
  // Add "India" for localisation but NOT "price" — that skews results
  parts.push('India')
  const searchQuery = parts.join(' ')

  try {
    // PRIMARY: Google Shopping — most accurate for product images + prices
    const shopRes = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: searchQuery, gl: 'in', hl: 'en', num: 10 })
    })

    if (!shopRes.ok) throw new Error(`Serper Shopping: ${shopRes.status}`)
    const shopData = await shopRes.json()
    const shopping = shopData.shopping || []

    if (shopping.length >= 3) {
      // We have good shopping results
      return res.status(200).json({
        products: shopping.slice(0, 8).map((item, i) => ({
          id: i + 1,
          name: cleanTitle(item.title || ''),
          brand: brand || extractBrand(item.title, item.source),
          description: buildDesc(item),
          image: item.imageUrl || item.thumbnailUrl || null,
          min_price: parsePrice(item.price),
          price_display: item.price || null,
          original_price: item.originalPrice || null,
          discount: item.discount || null,
          source: item.link || '',
          source_name: item.source || extractDomain(item.link || ''),
          rating: item.rating || null,
          reviews: item.ratingCount || null,
          delivery: item.delivery || null,
          is_popular: i === 0,
          in_stock: item.inStock !== false
        })),
        source: 'google_shopping',
        query: searchQuery
      })
    }

    // FALLBACK: Google web search with shopping intent
    const webRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: searchQuery + ' buy online', gl: 'in', hl: 'en', num: 8 })
    })

    if (!webRes.ok) throw new Error(`Serper Search: ${webRes.status}`)
    const webData = await webRes.json()

    // Combine organic + shopping from web results
    const organic = webData.organic || []
    const inlineShop = webData.shoppingResults || []
    const combined = [...inlineShop.slice(0, 4), ...organic.slice(0, 4)]

    return res.status(200).json({
      products: combined.slice(0, 8).map((r, i) => ({
        id: i + 1,
        name: cleanTitle(r.title || query),
        brand: brand || extractBrand(r.title, ''),
        description: r.snippet || r.description || '',
        image: r.imageUrl || r.thumbnailUrl || null,
        min_price: extractPriceFromText(r.snippet || r.title || ''),
        price_display: null,
        source: r.link || '',
        source_name: extractDomain(r.link || ''),
        rating: r.rating || null,
        reviews: r.ratingCount || null,
        is_popular: i === 0,
        in_stock: true
      })),
      source: 'google_web',
      query: searchQuery
    })

  } catch (err) {
    console.error('Search error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function cleanTitle(title) {
  // Remove trailing store names like "- Amazon.in" or "| Flipkart"
  return title.replace(/[-|]\s*(Amazon|Flipkart|Myntra|Meesho|Snapdeal|Nykaa|BigBasket).*$/i, '').trim()
}

function extractBrand(title = '', source = '') {
  const commonBrands = ['Nike', 'Adidas', 'Samsung', 'Apple', 'LG', 'Sony', 'Preethi', 'Prestige', 'Pigeon', 'Glen', 'Butterfly', 'Philips', 'Bosch', 'Whirlpool', 'IFB', 'Bajaj', 'Havells', 'Crompton', 'Amul', 'Britannia', 'Nestlé', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Mi', 'Redmi', 'OnePlus', 'Realme', 'Vivo', 'Oppo']
  const found = commonBrands.find(b => title.toLowerCase().includes(b.toLowerCase()))
  return found || title.split(' ')[0] || ''
}

function extractDomain(url = '') {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

function parsePrice(str = '') {
  if (!str) return null
  const m = str.replace(/,/g, '').match(/[\d]+(\.\d+)?/)
  return m ? Math.round(parseFloat(m[0])) : null
}

function extractPriceFromText(text = '') {
  const m = text.replace(/,/g, '').match(/₹\s*([\d]+)/)
  return m ? parseInt(m[1]) : null
}

function buildDesc(item) {
  const parts = []
  if (item.rating) parts.push(`★ ${item.rating}`)
  if (item.ratingCount) parts.push(`${item.ratingCount} reviews`)
  if (item.store) parts.push(item.store)
  if (item.delivery) parts.push(item.delivery)
  if (item.inStock === false) parts.push('Out of stock')
  return parts.length ? parts.join(' · ') : ''
}
