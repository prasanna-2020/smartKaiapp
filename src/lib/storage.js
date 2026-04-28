const WISHLIST_KEY = 'sk_wishlist_v2';
const CATS_KEY = 'sk_categories_v2';

export const DEFAULT_CATEGORIES = [
  { id: 'home-appliances', name: 'Home Appliances', icon: '🏠', color: '#7c5cfc' },
  { id: 'kitchen',         name: 'Kitchen',         icon: '🍳', color: '#f59e0b' },
  { id: 'electronics',     name: 'Electronics',     icon: '📱', color: '#38bdf8' },
  { id: 'clothing',        name: 'Clothing',        icon: '👕', color: '#ec4899' },
  { id: 'grocery',         name: 'Grocery',         icon: '🛒', color: '#10b981' },
  { id: 'medicine',        name: 'Medicine',        icon: '💊', color: '#f43f5e' },
  { id: 'home',            name: 'Home & Living',   icon: '🛋', color: '#a78bfa' },
  { id: 'sports',          name: 'Sports',          icon: '⚽', color: '#f97316' },
];

export function getCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATS_KEY) || 'null');
    if (saved && saved.length) return saved;
  } catch (e) {}
  return [...DEFAULT_CATEGORIES];
}

export function saveCategories(cats) {
  try { localStorage.setItem(CATS_KEY, JSON.stringify(cats)); } catch (e) {}
}

export function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
  } catch (e) { return []; }
}

export function saveWishlist(items) {
  try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(items)); } catch (e) {}
}

export function addToWishlist(item) {
  const list = getWishlist();
  list.unshift({ ...item, addedAt: new Date().toISOString() });
  saveWishlist(list);
  return list;
}

export function removeFromWishlist(id) {
  const list = getWishlist().filter(i => i.id !== id);
  saveWishlist(list);
  return list;
}
