const BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : ''

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function clarifyProduct({ query }) {
  try { return await post('/api/clarify', { query }) }
  catch { return { product_name: query, category: 'default', needs_clarification: false, questions: [], search_hint: query, search_ready: true } }
}

export async function searchProducts({ query, brand, size, budget, hint, category, city, pincode }) {
  return post('/api/search', { query, brand, size, budget, hint, category, city, pincode })
}

export async function comparePlatforms({ product, category, found_price, city, pincode }) {
  return post('/api/compare', { product, category, found_price, city, pincode })
}

export async function validateSearch({ query, category }) {
  try { return await post('/api/validate', { query, category }) }
  catch { return { valid: true } }
}
