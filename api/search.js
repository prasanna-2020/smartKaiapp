// /api/search.js — Step 3: Real product search via Serper Google Shopping
// Accepts enriched query from clarify step

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query, brand, size, budget, hint, category, city, pincode } = req.body || {}
  if (!query) return res.status(400).json({ error: 'Query is required' })

  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'SERPER_API_KEY not configured' })

  // Build enriched search query from all user inputs
  const parts = []
  if (brand && !query.toLowerCase().includes(brand.toLowerCase())) parts.push(brand)
  parts.push(query)
  if (size) parts.push(size)
  if (hint) parts.push(hint)
  // Budget → price range keyword
  if (budget) {
    if (budget.includes('Under')) parts.push('budget')
    else if (budget.includes('Above')) parts.push('premium')
  }
  const location = city || pincode ? `${city || ''} ${pincode || ''}`.trim() : 'India'
  parts.push(location)
  const searchQuery = parts.join(' ')

  try {
    // PRIMARY: Google Shopping
    const shopRes = await fetch('https://google.serper.dev/shopping', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: searchQuery, gl: 'in', hl: 'en', num: 10 })
    })

    if (!shopRes.ok) throw new Error(`Serper ${shopRes.status}`)
    const shopData = await shopRes.json()
    const shopping = shopData.shopping || []

    if (shopping.length >= 2) {
      return res.status(200).json({
        products: shopping.slice(0, 8).map((item, i) => ({
          id: i + 1,
          name: cleanTitle(item.title || ''),
          brand: brand || extractBrand(item.title),
          description: buildDesc(item),
          image: item.imageUrl || item.thumbnailUrl || null,
          min_price: parsePrice(item.price),
          price_display: item.price || null,
          original_price: parsePrice(item.originalPrice) || null,
          discount: item.discount || null,
          source: item.link || '',
          source_name: item.source || extractDomain(item.link || ''),
          rating: item.rating ? parseFloat(item.rating) : null,
          reviews: item.ratingCount || null,
          delivery: item.delivery || null,
          is_popular: i === 0,
          in_stock: item.inStock !== false
        })),
        source: 'google_shopping',
        query: searchQuery,
        count: shopping.length
      })
    }

    // FALLBACK: Web search
    const webRes = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: searchQuery + ' buy online', gl: 'in', hl: 'en', num: 8 })
    })

    if (!webRes.ok) throw new Error(`Serper web ${webRes.status}`)
    const webData = await webRes.json()
    const organic = webData.organic || []
    const inlineShop = webData.shoppingResults || []
    const combined = [...inlineShop.slice(0, 4), ...organic.slice(0, 4)]

    return res.status(200).json({
      products: combined.slice(0, 8).map((r, i) => ({
        id: i + 1,
        name: cleanTitle(r.title || query),
        brand: brand || extractBrand(r.title || ''),
        description: r.snippet || '',
        image: r.imageUrl || null,
        min_price: extractPriceFromText(r.snippet || r.title || ''),
        price_display: null,
        source: r.link || '',
        source_name: extractDomain(r.link || ''),
        rating: null, reviews: null,
        is_popular: i === 0,
        in_stock: true
      })),
      source: 'google_web',
      query: searchQuery,
      count: combined.length
    })

  } catch (err) {
    console.error('Search error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function cleanTitle(t) {
  return t.replace(/[-|]\s*(Amazon|Flipkart|Myntra|Meesho|Snapdeal|Nykaa|BigBasket|buy online).*$/i, '').trim()
}
function extractBrand(title = '') {
  const brands = ['Nike','Adidas','Puma','Reebok','Samsung','Apple','OnePlus','Redmi','Realme','Oppo','Vivo','Dell','HP','Lenovo','Asus','Preethi','Prestige','Pigeon','Philips','Bosch','Bajaj','Havells','Amul','Britannia','Parle','Nestle','ITC','Akshayakalpa','Nandini','Aavin']
  return brands.find(b => title.toLowerCase().includes(b.toLowerCase())) || ''
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
  const p = []
  if (item.rating) p.push(`★ ${item.rating}`)
  if (item.ratingCount) p.push(`${item.ratingCount} reviews`)
  if (item.store) p.push(item.store)
  if (item.delivery) p.push(item.delivery)
  return p.join(' · ')
}
