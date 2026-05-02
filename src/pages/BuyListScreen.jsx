import React, { useState, useEffect, useRef } from 'react'
import { store, platColor, platInitials, getPlatformURL, repeatOrders } from '../lib/store.js'

// ─── helpers ───────────────────────────────────────────────
const BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3001' : ''
async function api(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`)
  return r.json()
}

function toMins(t = '') {
  const m = t.match(/(\d+)\s*(min|hr|day)/i)
  if (!m) return 9999
  const v = parseInt(m[1])
  return m[2][0].toLowerCase() === 'h' ? v * 60 : m[2][0].toLowerCase() === 'd' ? v * 1440 : v
}

// ─── Sheet ─────────────────────────────────────────────────
function Sheet({ open, onClose, title, subtitle, children }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.82)', backdropFilter:'blur(12px)', display:open?'flex':'none', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:'22px 22px 0 0', width:'100%', maxWidth:600, maxHeight:'94dvh', overflowY:'auto', paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))' }} onClick={e => e.stopPropagation()}>
        <div style={{ width:36, height:4, background:'var(--border2)', borderRadius:2, margin:'12px auto 0' }} />
        <div style={{ padding:'14px 20px 0' }}>
          {title && <div style={{ fontSize:20, fontWeight:700, marginBottom:2, color:'var(--text)' }}>{title}</div>}
          {subtitle && <div style={{ fontSize:13, color:'var(--text-dim)', marginBottom:16 }}>{subtitle}</div>}
        </div>
        <div style={{ padding:'0 20px 24px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Step indicator ────────────────────────────────────────
function StepBar({ step }) {
  const labels = ['Search', 'Details', 'Results', 'Compare']
  return (
    <div style={{ textAlign:'center', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:0, marginBottom:6 }}>
        {[1,2,3,4].map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: step > s ? 'var(--emerald)' : step === s ? 'var(--violet)' : 'var(--surface3)', border: step === s ? '2px solid var(--violet)' : 'none', boxShadow: step === s ? '0 0 0 3px rgba(124,58,237,.2)' : 'none', transition:'all .2s' }} />
            {i < 3 && <div style={{ width:36, height:2, background: step > s ? 'var(--violet)' : 'var(--surface3)' }} />}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize:11, color:'var(--text-faint)', fontFamily:'var(--mono)' }}>
        Step {step} of 4 — {labels[step-1]}
      </div>
    </div>
  )
}

// ─── Product card ──────────────────────────────────────────
function ProductCard({ product, onSelect }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div onClick={() => onSelect(product)} style={{ display:'flex', gap:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:10, cursor:'pointer' }}>
      <div style={{ width:90, minWidth:90, height:90, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', flexShrink:0 }}>
        {product.image && !imgErr
          ? <img src={product.image} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => setImgErr(true)} />
          : <span style={{ fontSize:30, opacity:.35 }}>📦</span>}
        {product.is_popular && (
          <div style={{ position:'absolute', top:6, left:0, background:'var(--violet)', color:'#fff', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:'0 4px 4px 0' }}>TOP</div>
        )}
      </div>
      <div style={{ flex:1, padding:'11px 13px', minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, lineHeight:1.35, marginBottom:4, color:'var(--text)' }}>{product.name}</div>
        {product.description && (
          <div style={{ fontSize:11, color:'var(--text-dim)', marginBottom:5, lineHeight:1.4 }}>{product.description.slice(0, 90)}{product.description.length > 90 ? '…' : ''}</div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:4 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--emerald)', fontFamily:'var(--mono)' }}>
            {product.price_display || (product.min_price ? `from ₹${product.min_price.toLocaleString('en-IN')}` : 'See store')}
          </div>
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            {product.rating && <span style={{ fontSize:11, color:'var(--amber)' }}>★ {product.rating}</span>}
            {product.source_name && (
              <span style={{ fontSize:9, color:'var(--sky)', background:'var(--sky-soft)', padding:'1px 6px', borderRadius:4, fontFamily:'var(--mono)' }}>
                {product.source_name.split('.')[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Platform row ──────────────────────────────────────────
function PlatRow({ plat, selected, onSelect }) {
  const mins = toMins(plat.delivery_time)
  const delColor = mins <= 30 ? 'var(--sky)' : mins <= 480 ? 'var(--amber)' : 'var(--text-faint)'
  const isLive = plat.source === 'google_live'
  const isEst = plat.source === 'ai_estimated'
  const url = plat.buy_link || getPlatformURL(plat.name, plat.search_query || '')

  if (plat.available === false) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, marginBottom:7, opacity:.32 }}>
        <div style={{ width:28, height:28, borderRadius:7, background:platColor(plat.name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>{platInitials(plat.name)}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{plat.name}</div>
          <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:2 }}>Not available for this product</div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={() => onSelect(plat)} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', background: selected ? 'rgba(124,58,237,.1)' : 'var(--surface)', border: `1px solid ${selected ? 'var(--indigo-border)' : 'var(--border)'}`, borderRadius:10, marginBottom:7, cursor:'pointer', transition:'all .15s' }}>
      {/* Radio */}
      <div style={{ width:18, height:18, minWidth:18, borderRadius:'50%', border:`2px solid ${selected ? 'var(--violet)' : 'var(--border2)'}`, background: selected ? 'var(--violet)' : 'transparent', flexShrink:0 }} />
      {/* Logo */}
      <div style={{ width:28, height:28, borderRadius:7, background:platColor(plat.name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#fff', flexShrink:0 }}>{platInitials(plat.name)}</div>
      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{plat.name}</span>
          {isLive && <span style={{ fontSize:8, color:'var(--emerald)', background:'var(--emerald-soft)', padding:'1px 5px', borderRadius:3, fontFamily:'var(--mono)' }}>🟢 LIVE</span>}
          {isEst && <span style={{ fontSize:8, color:'var(--amber)', background:'var(--amber-soft)', padding:'1px 5px', borderRadius:3, fontFamily:'var(--mono)' }}>~EST</span>}
        </div>
        <div style={{ display:'flex', gap:7, marginTop:3, flexWrap:'wrap', alignItems:'center' }}>
          {plat.price ? (
            <span style={{ fontSize:14, fontWeight:700, fontFamily:'var(--mono)', color: plat._isLowest ? 'var(--emerald)' : 'var(--text-dim)' }}>
              ₹{plat.price.toLocaleString('en-IN')}
              {plat._isLowest && <span style={{ marginLeft:5, fontSize:9, background:'var(--emerald-soft)', color:'var(--emerald)', padding:'1px 5px', borderRadius:10 }}>Lowest</span>}
            </span>
          ) : (
            <span style={{ fontSize:11, color:'var(--text-faint)' }}>Tap Search to verify price</span>
          )}
          {plat.original_price && plat.original_price > plat.price && (
            <span style={{ fontSize:10, textDecoration:'line-through', color:'var(--text-faint)', fontFamily:'var(--mono)' }}>₹{plat.original_price.toLocaleString('en-IN')}</span>
          )}
          {plat.discount && <span style={{ fontSize:10, color:'var(--emerald)' }}>{plat.discount}</span>}
          <span style={{ fontSize:10, color:delColor }}>{plat.delivery_time}</span>
        </div>
        {plat.note && <div style={{ fontSize:9, color:'var(--text-faint)', marginTop:2, fontStyle:'italic' }}>{plat.note}</div>}
      </div>
      <a href={url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
         style={{ padding:'6px 10px', borderRadius:7, fontSize:10, fontWeight:700, textDecoration:'none', background: isLive ? 'var(--emerald-soft)' : 'var(--surface2)', color: isLive ? 'var(--emerald)' : 'var(--text-dim)', border:`1px solid ${isLive ? 'var(--emerald-border)' : 'var(--border)'}`, flexShrink:0, whiteSpace:'nowrap' }}>
        {isLive ? 'Buy →' : 'Search →'}
      </a>
    </div>
  )
}

// ─── MAIN SCREEN ───────────────────────────────────────────
export default function BuyListScreen({ toast }) {
  const [wishlist, setWishlist] = useState(() => store.getWishlist())
  const [repeatList, setRepeatList] = useState(() => repeatOrders.get())
  const [showRepeat, setShowRepeat] = useState(false)
  const [categories] = useState(() => store.getCategories())
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  // ── Step state ──
  const [step, setStep] = useState(0) // 0=closed
  const [searchMode, setSearchMode] = useState('type')

  // Step 1 inputs
  const [rawQuery, setRawQuery] = useState('')
  const [pasteUrl, setPasteUrl] = useState('')
  const [describeText, setDescribeText] = useState('')

  // Step 2 — clarification
  const [clarifyData, setClarifyData] = useState(null)  // { product_name, category, questions, search_hint }
  const [answers, setAnswers] = useState({})            // { size: '8', budget: 'Under ₹2000' }
  const [clarifyLoading, setClarifyLoading] = useState(false)

  // Step 3 — results
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Step 4 — compare
  const [compareData, setCompareData] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState(null)

  // Location
  const [location, setLocation] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sk_location') || 'null') } catch { return null }
  })
  const [showLocSheet, setShowLocSheet] = useState(false)
  const [pincodeInput, setPincodeInput] = useState('')
  const [cityInput, setCityInput] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  function saveWishlist(items) { setWishlist(items); store.saveWishlist(items) }

  // ── LOCATION ──────────────────────────────────────────────
  function openLocation() { setPincodeInput(location?.pincode || ''); setCityInput(location?.city || ''); setShowLocSheet(true) }
  function saveLocation() {
    const loc = { pincode: pincodeInput.trim(), city: cityInput.trim() }
    setLocation(loc); localStorage.setItem('sk_location', JSON.stringify(loc))
    setShowLocSheet(false); toast(`📍 Delivering to ${loc.city || loc.pincode}`)
  }
  function detectGPS() {
    if (!navigator.geolocation) { toast('GPS not supported'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
        const d = await r.json()
        const city = d.address?.city || d.address?.town || d.address?.village || ''
        const pincode = d.address?.postcode || ''
        const loc = { city, pincode, lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(loc); localStorage.setItem('sk_location', JSON.stringify(loc))
        setCityInput(city); setPincodeInput(pincode)
        toast(`📍 Located: ${city}${pincode ? ' ' + pincode : ''}`)
      } catch { toast('Could not get city name') }
      setGpsLoading(false)
    }, () => { toast('GPS denied — enter manually'); setGpsLoading(false) })
  }

  // ── STEP 1 → STEP 2/3: Analyse query ─────────────────────
  function openSearch() {
    setRawQuery(''); setPasteUrl(''); setDescribeText('')
    setClarifyData(null); setAnswers({})
    setResults([]); setSelectedProduct(null); setCompareData(null); setSelectedPlatform(null)
    setStep(1)
  }

  async function analyseQuery() {
    const q = searchMode === 'type' ? rawQuery.trim()
            : searchMode === 'link' ? pasteUrl.trim()
            : describeText.trim()
    if (!q) { toast('Enter something to search'); return }

    setClarifyLoading(true)
    try {
      const data = await api('/api/clarify', { query: q })
      setClarifyData(data)
      setAnswers({})
      // ALWAYS show Step 2 — even if Groq says no questions needed
      // For simple products, Step 2 shows a confirmation + optional fields
      if (!data.questions || data.questions.length === 0) {
        // Add at least a confirmation question so user sees Step 2
        data.questions = [{
          id: 'confirm',
          label: `Searching for: ${data.product_name || q}`,
          type: 'info',
          optional: true
        }]
        data.needs_clarification = true
      }
      setStep(2)
    } catch (err) {
      toast('Error: ' + err.message)
    } finally {
      setClarifyLoading(false)
    }
  }

  // ── STEP 2 → STEP 3: Search with answers ─────────────────
  async function doSearch(cd, ans) {
    const clarify = cd || clarifyData
    const userAnswers = ans !== undefined ? ans : answers
    setSearchLoading(true)
    setStep(3)
    setResults([])
    try {
      const rawQ = searchMode === 'type' ? rawQuery.trim()
                 : searchMode === 'link' ? pasteUrl.trim()
                 : describeText.trim()
      // Build best possible search query
      const baseQuery = clarify?.search_hint || rawQ
      const sizeHint = userAnswers.size ? `size ${userAnswers.size}` : ''
      const brandHint = userAnswers.brand || ''
      // For category corrections — user may have changed category in Step 2
      const finalCategory = clarify?.category_id || clarify?.category || 'default'
      const data = await api('/api/search', {
        query: baseQuery,
        brand: brandHint,
        size: sizeHint,
        budget: userAnswers.budget || '',
        hint: userAnswers.specs || userAnswers.quantity || '',
        category: finalCategory,
        city: location?.city || '',
        pincode: location?.pincode || ''
      })
      setResults(data.products || [])
    } catch (err) {
      toast('Search failed: ' + err.message)
      setStep(2)
    } finally {
      setSearchLoading(false)
    }
  }

  // ── STEP 3 → STEP 4: Compare ──────────────────────────────
  async function selectProduct(product) {
    setSelectedProduct(product)
    setCompareData(null); setSelectedPlatform(null)
    setCompareLoading(true); setStep(4)
    try {
      const data = await api('/api/compare', {
        product: product.name,
        category: clarifyData?.category_id || clarifyData?.category || 'default',
        found_price: product.min_price || null,
        city: location?.city || 'Chennai',
        pincode: location?.pincode || '',
        // Pass product name as-is — compare.js uses it for platform search
        location_context: `${location?.city || 'Chennai'} ${location?.pincode || ''}`.trim()
      })
      // Mark lowest
      const avail = (data.platforms || []).filter(p => p.available !== false && p.price)
      const lowest = avail.length ? Math.min(...avail.map(p => p.price)) : null
      if (data.platforms) {
        data.platforms = data.platforms.map(p => ({ ...p, _isLowest: p.price === lowest }))
      }
      setCompareData(data)
      // Auto-select best
      const best = data.platforms?.find(p => p.name === data.best_overall && p.available !== false)
      if (best) setSelectedPlatform(best)
    } catch (err) {
      toast('Compare failed: ' + err.message)
    } finally {
      setCompareLoading(false)
    }
  }

  // ── Add to wishlist ────────────────────────────────────────
  function addToWishlist() {
    if (!selectedProduct || !selectedPlatform) { toast('Select a platform first'); return }
    const cat = categories.find(c => c.id === clarifyData?.category) || categories[0]
    const item = {
      id: Date.now(),
      name: selectedProduct.name,
      brand: selectedProduct.brand || '',
      image: selectedProduct.image || null,
      description: selectedProduct.description || '',
      catId: cat?.id || 'default',
      catName: cat?.name || '',
      catIcon: cat?.icon || '📦',
      price_display: selectedProduct.price_display || '',
      min_price: selectedProduct.min_price || 0,
      chosen_platform: selectedPlatform.name,
      chosen_price: selectedPlatform.price,
      chosen_delivery: selectedPlatform.delivery_time,
      chosen_url: selectedPlatform.buy_link || getPlatformURL(selectedPlatform.name, selectedProduct.name),
      price_is_live: selectedPlatform.source === 'google_live',
      location: location?.city || '',
      addedOn: new Date().toISOString()
    }
    const updated = [item, ...wishlist]
    saveWishlist(updated)
    setExpandedId(item.id)
    setStep(0)
    toast(`✓ Added to wishlist!`)
  }

  // ── Delete from wishlist ──────────────────────────────────
  function deleteItem(id) { saveWishlist(wishlist.filter(x => x.id !== id)); toast('Removed') }

  // ── Re-compare ────────────────────────────────────────────
  async function recompare(item) {
    setSelectedProduct({ name: item.name, brand: item.brand, image: item.image, description: item.description, min_price: item.min_price })
    setClarifyData({ category: item.catId })
    setCompareData(null); setSelectedPlatform(null)
    setCompareLoading(true); setStep(4)
    try {
      const data = await api('/api/compare', {
        product: item.name,
        category: item.catId || 'grocery',
        found_price: item.min_price,
        city: location?.city || 'Chennai',
        pincode: location?.pincode || ''
      })
      const avail = (data.platforms || []).filter(p => p.available !== false && p.price)
      const lowest = avail.length ? Math.min(...avail.map(p => p.price)) : null
      if (data.platforms) data.platforms = data.platforms.map(p => ({ ...p, _isLowest: p.price === lowest }))
      setCompareData(data)
      const best = data.platforms?.find(p => p.name === data.best_overall && p.available !== false)
      if (best) setSelectedPlatform(best)
    } catch (err) { toast('Compare failed: ' + err.message) }
    finally { setCompareLoading(false) }
  }

  // ── Wishlist filter ───────────────────────────────────────
  const catCounts = {}
  wishlist.forEach(w => { catCounts[w.catId] = (catCounts[w.catId] || 0) + 1 })
  const filtered = filter === 'all' ? wishlist : wishlist.filter(x => x.catId === filter)

  return (
    <>
      {/* ── WISHLIST SCREEN ── */}
      <div className="scroll">

        {/* Location + header bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 8px', background:'var(--surface)', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>My Wishlist</div>
          <button onClick={openLocation} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'var(--violet-soft)', border:'1px solid var(--violet-border)', borderRadius:20, cursor:'pointer', fontSize:12, color:'var(--violet-l)' }}>
            <span>📍</span>
            <span>{location?.city || location?.pincode || 'Set location'}</span>
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', padding:'10px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', scrollbarWidth:'none' }}>
          <div onClick={() => { setFilter('all'); setShowRepeat(false) }} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', background: filter==='all'&&!showRepeat ? 'var(--violet-soft)' : 'var(--surface2)', border: `1px solid ${filter==='all'&&!showRepeat ? 'var(--violet-border)' : 'var(--border)'}`, color: filter==='all'&&!showRepeat ? 'var(--violet-l)' : 'var(--text-dim)' }}>All ({wishlist.length})</div>
          <div onClick={() => setShowRepeat(r => !r)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', background: showRepeat ? 'rgba(245,158,11,.15)' : 'var(--surface2)', border: `1px solid ${showRepeat ? 'rgba(245,158,11,.35)' : 'var(--border)'}`, color: showRepeat ? 'var(--amber)' : 'var(--text-dim)' }}>🔁 Repeat ({repeatList.length})</div>
          {categories.filter(c => catCounts[c.id]).map(c => (
            <div key={c.id} onClick={() => setFilter(c.id)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', background: filter===c.id ? 'var(--violet-soft)' : 'var(--surface2)', border: `1px solid ${filter===c.id ? 'var(--violet-border)' : 'var(--border)'}`, color: filter===c.id ? 'var(--violet-l)' : 'var(--text-dim)' }}>
              {c.icon} {c.name} ({catCounts[c.id]})
            </div>
          ))}
        </div>

        <div style={{ padding:'14px 16px 100px' }}>
          {/* Repeat Orders panel */}
          {showRepeat && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--amber)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                🔁 Repeat Orders
                <span style={{ fontSize:11, color:'var(--text-faint)', fontWeight:400 }}>— tap Buy to reorder instantly</span>
              </div>
              {repeatList.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-faint)', fontSize:13 }}>
                  No repeat orders saved yet. Add items to wishlist and tap 🔁 to save for quick reorder.
                </div>
              ) : repeatList.map(item => (
                <div key={item.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px' }}>
                    <div style={{ width:44, height:44, minWidth:44, borderRadius:9, overflow:'hidden', background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {item.image ? <img src={item.image} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize:18, opacity:.4 }}>📦</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{item.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:platColor(item.chosen_platform), flexShrink:0 }} />
                        <span style={{ fontSize:11, color:'var(--text-dim)' }}>{item.chosen_platform}</span>
                        {item.chosen_price && <span style={{ fontSize:11, fontWeight:700, color:'var(--emerald)', fontFamily:'var(--mono)' }}>₹{item.chosen_price.toLocaleString('en-IN')}</span>}
                        <span style={{ fontSize:9, color:'var(--amber)', background:'rgba(245,158,11,.12)', padding:'1px 5px', borderRadius:6 }}>×{item.orderCount || 1} ordered</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                      <a href={item.chosen_url || '#'} target="_blank" rel="noreferrer" style={{ padding:'6px 11px', borderRadius:8, fontSize:11, fontWeight:700, textDecoration:'none', background:platColor(item.chosen_platform), color:'#fff' }}>Buy →</a>
                      <button onClick={() => removeRepeat(item.id)} style={{ width:28, height:28, borderRadius:7, background:'var(--rose-soft)', border:'1px solid rgba(244,63,94,.15)', color:'var(--rose)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showRepeat && filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'56px 20px' }}>
              <div style={{ fontSize:48, marginBottom:14, opacity:.3 }}>🛍</div>
              <div style={{ fontSize:17, fontWeight:600, color:'var(--text-dim)', marginBottom:8 }}>Wishlist is empty</div>
              <div style={{ fontSize:13, color:'var(--text-faint)', lineHeight:1.6 }}>Tap + to search and compare products<br/>across Amazon, Flipkart, Zepto and more</div>
            </div>
          ) : !showRepeat && filtered.map(item => {
            const expanded = expandedId === item.id
            const buyUrl = item.chosen_url || getPlatformURL(item.chosen_platform, item.name)
            return (
              <div key={item.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
                <div onClick={() => setExpandedId(expanded ? null : item.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer' }}>
                  <div style={{ width:50, height:50, minWidth:50, borderRadius:9, overflow:'hidden', background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {item.image ? <img src={item.image} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize:20, opacity:.4 }}>{item.catIcon}</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{item.name}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{item.brand || item.catName}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:4 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:platColor(item.chosen_platform), flexShrink:0 }} />
                      <span style={{ fontSize:11, color:'var(--text-dim)' }}>{item.chosen_platform}</span>
                      {item.chosen_price && <span style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--emerald)' }}>₹{item.chosen_price.toLocaleString('en-IN')}</span>}
                      {item.chosen_delivery && <span style={{ fontSize:10, color:'var(--sky)', background:'var(--sky-soft)', padding:'1px 5px', borderRadius:4 }}>{item.chosen_delivery}</span>}
                      {item.price_is_live && <span style={{ fontSize:8, color:'var(--emerald)', fontFamily:'var(--mono)' }}>🟢</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
                    <button onClick={e => { e.stopPropagation(); deleteItem(item.id) }} style={{ width:26, height:26, borderRadius:7, background:'var(--rose-soft)', border:'1px solid rgba(244,63,94,.15)', color:'var(--rose)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                    <span style={{ fontSize:12, color:'var(--text-faint)' }}>{expanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ borderTop:'1px solid var(--border)', background:'var(--bg2)', padding:'12px 14px' }}>
                    {item.description && <div style={{ fontSize:12, color:'var(--text-dim)', marginBottom:10, lineHeight:1.5 }}>{item.description.slice(0, 120)}</div>}
                    {item.location && <div style={{ fontSize:10, color:'var(--text-faint)', marginBottom:8 }}>📍 Price checked for {item.location}</div>}
                    <a href={buyUrl} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:12, border:'none', borderRadius:10, fontSize:14, fontWeight:700, color:'#fff', textDecoration:'none', marginBottom:8, background:platColor(item.chosen_platform) }}>
                      <span style={{ width:18, height:18, borderRadius:4, background:'rgba(255,255,255,.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700 }}>{platInitials(item.chosen_platform)}</span>
                      Buy on {item.chosen_platform}{item.chosen_price ? ` · ₹${item.chosen_price.toLocaleString('en-IN')}` : ''}
                    </a>
                    <button onClick={() => recompare(item)} style={{ width:'100%', padding:9, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, fontSize:12, color:'var(--text-dim)', cursor:'pointer', marginBottom:6 }}>🔄 Compare prices again</button>
                    <button onClick={() => { markRepeat(item); setRepeatList(repeatOrders.get()) }} style={{ width:'100%', padding:9, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.25)', borderRadius:10, fontSize:12, color:'var(--amber)', fontWeight:600, cursor:'pointer' }}>🔁 Save as Repeat Order</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* FAB */}
      <button onClick={openSearch} style={{ position:'fixed', bottom:'calc(72px + env(safe-area-inset-bottom,0px) + 14px)', right:16, width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', boxShadow:'0 4px 20px rgba(124,58,237,.45)', fontSize:26, color:'#fff', cursor:'pointer', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>

      {/* ═══ STEP 1: SEARCH SHEET ═══ */}
      <Sheet open={step === 1} onClose={() => setStep(0)} title="Search a product" subtitle="Type, paste a link, or describe what you want">
        <StepBar step={1} />
        {/* Mode tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:16 }}>
          {[['type','✏️','Type it'],['link','🔗','Paste link'],['describe','🤖','Describe']].map(([m,icon,lbl]) => (
            <button key={m} onClick={() => setSearchMode(m)} style={{ flex:1, padding:'9px 6px', border:`1px solid ${searchMode===m ? 'var(--violet-border)' : 'var(--border)'}`, borderRadius:10, background: searchMode===m ? 'var(--violet-soft)' : 'var(--surface2)', color: searchMode===m ? 'var(--violet-l)' : 'var(--text-dim)', fontSize:11, fontWeight:600, cursor:'pointer' }}>
              <div style={{ fontSize:16, marginBottom:3 }}>{icon}</div>{lbl}
            </button>
          ))}
        </div>

        {searchMode === 'type' && (
          <div style={{ marginBottom:14 }}>
            <div style={{ padding:'10px 13px', background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.15)', borderRadius:9, marginBottom:10, fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>
              ✏️ <strong>Type the product name</strong> — be specific. Include brand, size, or model if you know it.
            </div>
            <input
              style={{ width:'100%', padding:'12px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:15, fontWeight:500, outline:'none' }}
              value={rawQuery}
              onChange={e => setRawQuery(e.target.value)}
              placeholder="e.g. Nike Air Max, Akshayakalpa milk 500ml, OnePlus 12R 5G"
              onKeyDown={e => e.key==='Enter' && analyseQuery()}
              autoFocus
            />
            <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
              {['Nike running shoes','Akshayakalpa milk 500ml','OnePlus 12R 5G','Prestige pressure cooker 5L'].map(s=>(
                <button key={s} onClick={()=>setRawQuery(s)} style={{ padding:'4px 9px', borderRadius:16, fontSize:10, fontWeight:500, border:'1px solid var(--border)', background:'var(--surface3)', color:'var(--text-dim)', cursor:'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {searchMode === 'link' && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6, fontFamily:'var(--mono)' }}>Product URL <span style={{ color:'var(--rose)' }}>*</span></div>
            <input style={{ width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none' }} value={pasteUrl} onChange={e => setPasteUrl(e.target.value)} placeholder="Paste Amazon/Flipkart/any product link" type="url" />
            <div style={{ fontSize:11, color:'var(--text-faint)', marginTop:6 }}>AI will identify the product and find it across platforms</div>
          </div>
        )}
        {searchMode === 'describe' && (
          <div style={{ marginBottom:14 }}>
            <div style={{ padding:'10px 13px', background:'rgba(124,58,237,.07)', border:'1px solid rgba(124,58,237,.15)', borderRadius:9, marginBottom:10, fontSize:12, color:'var(--text-dim)', lineHeight:1.5 }}>
              🤖 <strong>Don't know the exact name?</strong> Describe your need in plain language — AI will figure out what to search for and ask you the right questions.
            </div>
            <textarea
              style={{ width:'100%', padding:'12px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none', resize:'none', minHeight:130, lineHeight:1.7 }}
              value={describeText}
              onChange={e => setDescribeText(e.target.value)}
              placeholder={"I need a running shoe for jogging 5km daily, I have flat feet, size 9, budget under ₹5000\n\nLooking for a birthday gift for my mom who likes cooking, budget ₹2000\n\nWant a laptop for college student — for coding and studying, 16GB RAM preferred"}
            />
            <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
              {['running shoe for flat feet size 9','budget laptop for college coding','organic daily use milk for family','air fryer under ₹3000 for 4 people'].map(s=>(
                <button key={s} onClick={()=>setDescribeText(s)} style={{ padding:'4px 9px', borderRadius:16, fontSize:10, fontWeight:500, border:'1px solid var(--border)', background:'var(--surface3)', color:'var(--text-dim)', cursor:'pointer' }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={analyseQuery} disabled={clarifyLoading} style={{ width:'100%', padding:'13px', background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:10, color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', opacity: clarifyLoading ? .65 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {clarifyLoading ? <><div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.65s linear infinite' }} />Analysing…</> : '🔍 Search'}
        </button>
      </Sheet>

      {/* ═══ STEP 2: CLARIFY SHEET ═══ */}
      <Sheet open={step === 2} onClose={() => setStep(1)}
        title="Tell us more"
        subtitle={clarifyData?.product_name ? `Searching for: ${clarifyData.product_name}` : 'A few details to find the right product'}>
        <StepBar step={2} />

        {/* What AI already detected */}
        {clarifyData?.already_known?.length > 0 && (
          <div style={{ background:'var(--emerald-soft)', border:'1px solid var(--emerald-border)', borderRadius:10, padding:'9px 13px', marginBottom:14, display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--emerald)', fontWeight:700, marginRight:2 }}>✓ Already know:</span>
            {clarifyData.already_known.map((k,i) => (
              <span key={i} style={{ fontSize:11, color:'var(--emerald)', background:'rgba(16,185,129,.12)', padding:'2px 8px', borderRadius:10, border:'1px solid rgba(16,185,129,.2)' }}>{k}</span>
            ))}
          </div>
        )}

        {/* Category selector — all 20 categories from Excel */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.6, marginBottom:8, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:6 }}>
            Category
            <span style={{ fontSize:10, color:'var(--amber)', background:'var(--amber-soft)', padding:'1px 6px', borderRadius:8, fontWeight:500, textTransform:'none', letterSpacing:0 }}>
              AI picked: {clarifyData?.category_icon} {clarifyData?.category_label}
            </span>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(clarifyData?.all_categories || []).map(c => (
              <button key={c.id}
                onClick={() => setClarifyData(prev => ({ ...prev, category_id: c.id, category_label: c.label, category_icon: c.icon }))}
                style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
                  border:`1px solid ${clarifyData?.category_id === c.id ? 'var(--violet-border)' : 'var(--border)'}`,
                  background: clarifyData?.category_id === c.id ? 'var(--violet-soft)' : 'var(--surface2)',
                  color: clarifyData?.category_id === c.id ? 'var(--violet-l)' : 'var(--text-dim)'
                }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:6 }}>Tap to correct if wrong — questions update automatically</div>
        </div>

        {/* Dynamic questions — from Excel question bank, trimmed by what user already told us */}
        {clarifyData?.questions?.length > 0 && (
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.6, marginBottom:14, fontFamily:'var(--mono)' }}>
              Quick details
            </div>
            {clarifyData.questions.map(q => (
              <div key={q.id} style={{ marginBottom:18 }}>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:9, lineHeight:1.3 }}>{q.label}</div>
                {q.type === 'chips' ? (
                  <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                    {q.options?.map(opt => (
                      <button key={opt}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: prev[q.id] === opt ? '' : opt }))}
                        style={{ padding:'8px 15px', borderRadius:20, fontSize:13, fontWeight:600, cursor:'pointer',
                          border:`1px solid ${answers[q.id] === opt ? 'var(--violet-border)' : 'var(--border)'}`,
                          background: answers[q.id] === opt ? 'var(--violet-soft)' : 'var(--surface2)',
                          color: answers[q.id] === opt ? 'var(--violet-l)' : 'var(--text-dim)',
                          boxShadow: answers[q.id] === opt ? '0 0 0 2px rgba(124,58,237,.15)' : 'none'
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    style={{ width:'100%', padding:'11px 14px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none' }}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder || ''}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* No questions needed */}
        {(!clarifyData?.questions || clarifyData.questions.length === 0) && (
          <div style={{ padding:'16px 0', fontSize:13, color:'var(--text-dim)', textAlign:'center', borderTop:'1px solid var(--border)' }}>
            ✓ You provided enough details already. Ready to search!
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          <button onClick={() => setStep(1)} style={{ flex:1, padding:12, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-dim)', fontSize:14, fontWeight:600, cursor:'pointer' }}>← Back</button>
          <button onClick={() => doSearch(clarifyData, answers)} style={{ flex:2, padding:13, background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            🔍 Find Products
          </button>
        </div>
        <button onClick={() => doSearch(clarifyData, {})} style={{ width:'100%', padding:'9px', marginTop:8, background:'transparent', border:'none', color:'var(--text-faint)', fontSize:12, cursor:'pointer' }}>
          Skip details and search anyway →
        </button>
      </Sheet>

      {/* ═══ STEP 3: RESULTS SHEET ═══ */}
      <Sheet open={step === 3} onClose={() => setStep(2)} title="Select a product" subtitle="Tap a product to compare prices across platforms">
        <StepBar step={3} />
        {searchLoading ? (
          <div style={{ textAlign:'center', padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, border:'3px solid var(--border2)', borderTopColor:'var(--violet)', borderRadius:'50%', animation:'spin 0.65s linear infinite' }} />
            <div style={{ fontSize:14, color:'var(--text-dim)' }}>Searching Google Shopping for real products…</div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div style={{ fontSize:40, opacity:.3, marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:16, fontWeight:600, color:'var(--text-dim)', marginBottom:6 }}>No results found</div>
            <div style={{ fontSize:13, color:'var(--text-faint)' }}>Try a different search or add more details</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:12 }}>{results.length} products found · Tap one to compare prices</div>
            {results.map((p, i) => <ProductCard key={i} product={p} onSelect={selectProduct} />)}
          </>
        )}
        <button onClick={() => setStep(clarifyData?.questions?.length ? 2 : 1)} style={{ width:'100%', padding:11, background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-dim)', fontSize:13, fontWeight:600, cursor:'pointer', marginTop:8 }}>← Back</button>
      </Sheet>

      {/* ═══ STEP 4: COMPARE SHEET ═══ */}
      <Sheet open={step === 4} onClose={() => setStep(3)} title="Compare prices" subtitle={compareData?.location ? `Prices for ${compareData.location}` : 'Select a platform to add to wishlist'}>
        <StepBar step={4} />

        {/* Selected product summary */}
        {selectedProduct && (
          <div style={{ display:'flex', gap:11, alignItems:'flex-start', background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:12, marginBottom:14 }}>
            <div style={{ width:54, height:54, minWidth:54, borderRadius:9, overflow:'hidden', background:'var(--surface3)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {selectedProduct.image ? <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : <span style={{ fontSize:22, opacity:.4 }}>📦</span>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4, color:'var(--text)' }}>{selectedProduct.name}</div>
              {selectedProduct.price_display && <div style={{ fontSize:13, color:'var(--emerald)', fontWeight:700 }}>{selectedProduct.price_display}</div>}
            </div>
          </div>
        )}

        {compareLoading ? (
          <div style={{ textAlign:'center', padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, border:'3px solid var(--border2)', borderTopColor:'var(--violet)', borderRadius:'50%', animation:'spin 0.65s linear infinite' }} />
            <div style={{ fontSize:14, color:'var(--text-dim)' }}>Fetching prices from platforms…</div>
          </div>
        ) : compareData ? (
          <>
            {/* Best pick banner */}
            {compareData.best_overall && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--violet-soft)', border:'1px solid var(--violet-border)', borderRadius:10, padding:'10px 13px', marginBottom:12 }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--violet-l)' }}>Best: {compareData.best_overall}</div>
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>{compareData.summary}</div>
                </div>
              </div>
            )}
            {/* Info banner */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--amber-soft)', border:'1px solid rgba(245,158,11,.2)', borderRadius:9, padding:'8px 11px', marginBottom:12, fontSize:11, color:'var(--amber)' }}>
              <span>ℹ️</span>
              <span>🟢 Live = scraped from Google · 🟡 Est. = AI estimate · Tap "Search →" to verify on platform</span>
            </div>
            {/* Platform rows */}
            {(compareData.platforms || []).map(plat => (
              <PlatRow key={plat.name} plat={plat} selected={selectedPlatform?.name === plat.name} onSelect={setSelectedPlatform} />
            ))}
          </>
        ) : null}

        <div style={{ display:'flex', gap:8, marginTop:14 }}>
          <button onClick={() => setStep(3)} style={{ padding:'12px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text-dim)', fontSize:13, fontWeight:600, cursor:'pointer' }}>🛒 Back</button>
          <button onClick={addToWishlist} disabled={!selectedPlatform} style={{ flex:1, padding:12, background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity: !selectedPlatform ? .5 : 1 }}>
            + Add to Wishlist
          </button>
        </div>
      </Sheet>

      {/* ═══ LOCATION SHEET ═══ */}
      <Sheet open={showLocSheet} onClose={() => setShowLocSheet(false)} title="📍 Delivery Location" subtitle="Used for availability and delivery time estimates">
        <button onClick={detectGPS} disabled={gpsLoading} style={{ width:'100%', padding:12, background:'var(--sky-soft)', border:'1px solid rgba(56,189,248,.25)', borderRadius:10, color:'var(--sky)', fontSize:14, fontWeight:700, cursor:'pointer', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {gpsLoading ? '⏳ Detecting…' : '📡 Auto-detect my location'}
        </button>
        <div style={{ textAlign:'center', fontSize:12, color:'var(--text-faint)', marginBottom:14 }}>— or enter manually —</div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6, fontFamily:'var(--mono)' }}>City</div>
          <input style={{ width:'100%', padding:'10px 13px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none' }} value={cityInput} onChange={e => setCityInput(e.target.value)} placeholder="e.g. Chennai, Bangalore, Mumbai" />
        </div>
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.5, marginBottom:6, fontFamily:'var(--mono)' }}>Pincode</div>
          <input style={{ width:'100%', padding:'10px 13px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, color:'var(--text)', fontSize:14, outline:'none' }} value={pincodeInput} onChange={e => setPincodeInput(e.target.value)} placeholder="e.g. 600001" inputMode="numeric" maxLength={6} />
        </div>
        <button onClick={saveLocation} style={{ width:'100%', padding:13, background:'linear-gradient(135deg,#7c3aed,#a855f7)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          Save Location
        </button>
      </Sheet>

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  )
}
