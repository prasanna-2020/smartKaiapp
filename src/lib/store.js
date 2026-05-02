// Simple localStorage store
const KEYS = {
  wishlist: 'sk_wishlist_v1',
  phones: 'sk_phones_v1',
  links: 'sk_links_v1',
  expenses: 'sk_expenses_v1',
  categories: 'sk_categories_v1',
  settings: 'sk_settings_v1',
  theme: 'sk_theme',
}

function load(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

export const DEFAULT_CATS = [
  { id: 'grocery', name: 'Grocery', icon: '🛒', platforms: ['Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket'] },
  { id: 'clothing', name: 'Clothing', icon: '👕', platforms: ['Amazon', 'Flipkart', 'Myntra', 'Meesho'] },
  { id: 'electronics', name: 'Electronics', icon: '📱', platforms: ['Amazon', 'Flipkart', 'Croma', 'Reliance Digital'] },
  { id: 'medicine', name: 'Medicine', icon: '💊', platforms: ['PharmEasy', '1mg', 'Netmeds', 'Apollo Pharmacy'] },
  { id: 'home', name: 'Home', icon: '🏠', platforms: ['Amazon', 'Flipkart', 'Pepperfry', 'IKEA'] },
]

export const PLAT_COLORS = {
  'Zepto': '#7c3aed', 'Blinkit': '#f59e0b', 'Swiggy Instamart': '#f97316',
  'BigBasket': '#16a34a', 'Amazon': '#f97316', 'Flipkart': '#2563eb',
  'Meesho': '#ec4899', 'Myntra': '#e11d48', 'PharmEasy': '#10b981',
  '1mg': '#ef4444', 'Netmeds': '#3b82f6', 'Apollo Pharmacy': '#0ea5e9',
  'Croma': '#6366f1', 'Reliance Digital': '#dc2626', 'IKEA': '#0058a3',
  'Pepperfry': '#f97316', 'Snapdeal': '#e11d48',
}

export function platColor(name) { return PLAT_COLORS[name] || '#6b7280' }
export function platInitials(name) {
  return (name || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?'
}

export function getPlatformURL(platName, query) {
  const q = encodeURIComponent(query || '')
  const map = {
    'Amazon': `https://www.amazon.in/s?k=${q}`,
    'Flipkart': `https://www.flipkart.com/search?q=${q}`,
    'Meesho': `https://meesho.com/search?q=${q}`,
    'Myntra': `https://www.myntra.com/search?rawQuery=${q}`,
    'Zepto': `https://zeptonow.com/search?query=${q}`,
    'Blinkit': `https://blinkit.com/search?q=${q}`,
    'Swiggy Instamart': `https://www.swiggy.com/search?query=${q}`,
    'BigBasket': `https://www.bigbasket.com/ps/?q=${q}`,
    'PharmEasy': `https://pharmeasy.in/search/all?name=${q}`,
    '1mg': `https://www.1mg.com/search/all?name=${q}`,
    'Netmeds': `https://www.netmeds.com/catalogsearch/result?q=${q}`,
    'Apollo Pharmacy': `https://www.apollopharmacy.in/search-medicines/${q}`,
    'Croma': `https://www.croma.com/searchB?q=${q}`,
    'Reliance Digital': `https://www.reliancedigital.in/search?q=${q}`,
    'IKEA': `https://www.ikea.com/in/en/search/?q=${q}`,
    'Pepperfry': `https://www.pepperfry.com/site/search.html#q=${q}`,
  }
  return map[platName] || `https://www.google.com/search?q=${encodeURIComponent(platName + ' ' + query + ' India buy')}`
}

export const store = {
  getCategories: () => load(KEYS.categories) || DEFAULT_CATS.map(c => ({ ...c })),
  saveCategories: (cats) => save(KEYS.categories, cats),

  getWishlist: () => load(KEYS.wishlist) || [],
  saveWishlist: (items) => save(KEYS.wishlist, items),

  getPhones: () => load(KEYS.phones) || [],
  savePhones: (items) => save(KEYS.phones, items),

  getLinks: () => load(KEYS.links) || [],
  saveLinks: (items) => save(KEYS.links, items),

  getExpenses: () => load(KEYS.expenses) || [],
  saveExpenses: (items) => save(KEYS.expenses, items),

  getSettings: () => load(KEYS.settings) || {},
  saveSettings: (s) => save(KEYS.settings, s),

  getTheme: () => load(KEYS.theme) || 'dark',
  saveTheme: (t) => save(KEYS.theme, t),
}

// ── REPEAT ORDERS ──
const REPEAT_KEY = 'sk_repeat_orders_v1'

export const repeatOrders = {
  get: () => { try { return JSON.parse(localStorage.getItem(REPEAT_KEY) || '[]') } catch { return [] } },
  add: (item) => {
    const existing = repeatOrders.get()
    // Avoid duplicates — update if same product exists
    const idx = existing.findIndex(r => r.name === item.name && r.chosen_platform === item.chosen_platform)
    const entry = { ...item, savedAt: new Date().toISOString(), orderCount: idx >= 0 ? (existing[idx].orderCount || 1) + 1 : 1 }
    const updated = idx >= 0
      ? existing.map((r, i) => i === idx ? entry : r)
      : [entry, ...existing]
    try { localStorage.setItem(REPEAT_KEY, JSON.stringify(updated)) } catch {}
  },
  remove: (id) => {
    const updated = repeatOrders.get().filter(r => r.id !== id)
    try { localStorage.setItem(REPEAT_KEY, JSON.stringify(updated)) } catch {}
  },
}
