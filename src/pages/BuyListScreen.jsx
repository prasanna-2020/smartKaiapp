import React, { useState, useEffect, useRef } from 'react'
import { store, platColor, platInitials, getPlatformURL } from '../lib/store.js'
import { searchProducts, comparePlatforms } from '../lib/api.js'

// ── Sheet component ──
function Sheet({ open, onClose, children }) {
  return (
    <div className={`overlay${open ? ' open' : ''}`} onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-drag" />
        <div className="sheet-content">{children}</div>
      </div>
    </div>
  )
}

// ── Step indicator ──
function Steps({ step }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="steps">
        {[1,2,3].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`step-dot${step === s ? ' active' : step > s ? ' done' : ''}`} />
            {i < 2 && <div className={`step-line${step > s ? ' done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>
      <div className="step-lbl">
        {step === 1 && 'Step 1 of 3 — Search product'}
        {step === 2 && 'Step 2 of 3 — Pick exact product'}
        {step === 3 && 'Step 3 of 3 — Compare prices & add'}
      </div>
    </div>
  )
}

// ── Product card ──
function ProductCard({ product, onSelect }) {
  const [imgErr, setImgErr] = useState(false)
  return (
    <div className={`product-card${product.is_popular ? ' popular' : ''}`} onClick={() => onSelect(product)}>
      <div className="product-img-wrap">
        {product.image && !imgErr ? (
          <img className="product-img" src={product.image} alt={product.name} onError={() => setImgErr(true)} />
        ) : (
          <div className="product-img-placeholder">📦</div>
        )}
        {product.is_popular && <div className="popular-ribbon">★ Top result</div>}
      </div>
      <div className="product-info">
        <div className="product-name">{product.name}</div>
        {product.description && <div className="product-desc">{product.description.slice(0, 100)}{product.description.length > 100 ? '…' : ''}</div>}
        <div className="product-meta">
          <div className="product-price">{product.price_display || (product.min_price ? `from ₹${product.min_price.toLocaleString('en-IN')}` : 'See store')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {product.rating && <span className="product-rating">★ {product.rating}</span>}
            {product.source_name && <span className="product-source">{product.source_name}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Platform row ──
function PlatformRow({ plat, selected, onSelect }) {
  const [imgErr] = useState(false)
  const isLowest = plat._isLowest
  const isFastest = plat._isFastest
  const mins = toMins(plat.delivery_time)
  const delClass = mins <= 30 ? 'del-fast' : mins <= 1440 ? 'del-mid' : 'del-slow'
  const url = getPlatformURL(plat.name, plat.search_query || '')

  return (
    <div className={`platform-row${selected ? ' selected' : ''}${plat.available === false ? ' unavailable' : ''}`} onClick={() => onSelect(plat)}>
      <div className="plat-radio" />
      <div className="plat-logo" style={{ background: platColor(plat.name) }}>{platInitials(plat.name)}</div>
      <div className="plat-info">
        <div className="plat-name">{plat.name}</div>
        <div className="plat-meta">
          <span className={`plat-price${isLowest ? ' lowest' : ' normal'}`}>
            ₹{plat.price?.toLocaleString('en-IN')}
            {isLowest && <span className="tag tag-emerald" style={{ marginLeft: 5, fontSize: 9 }}>Lowest</span>}
          </span>
          {plat.discount && <span style={{ fontSize: 10, color: 'var(--emerald)' }}>{plat.discount}</span>}
          <span className={`plat-delivery ${delClass}`}>
            {plat.delivery_time}{isFastest && ' · Fastest'}
          </span>
          {plat.confidence === 'low' && <span className="confidence-low">~estimated</span>}
        </div>
      </div>
      <a href={url} target="_blank" rel="noreferrer" className="plat-buy-btn" onClick={e => e.stopPropagation()}>
        Search →
      </a>
    </div>
  )
}

function toMins(t = '') {
  const m = t.match(/(\d+)\s*(min|hr|day)/i)
  if (!m) return 9999
  const v = parseInt(m[1])
  return m[2][0].toLowerCase() === 'h' ? v * 60 : m[2][0].toLowerCase() === 'd' ? v * 1440 : v
}

// ── Main Buy List Screen ──
export default function BuyListScreen({ toast }) {
  const [wishlist, setWishlist] = useState(() => store.getWishlist())
  const [categories, setCategories] = useState(() => store.getCategories())
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  // Sheet states
  const [step, setStep] = useState(0) // 0=closed, 1=search, 2=results, 3=compare, 4=addCat
  const [searchMode, setSearchMode] = useState('type')
  const [selectedCat, setSelectedCat] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchBrand, setSearchBrand] = useState('')
  const [searchHint, setSearchHint] = useState('')
  const [searchLink, setSearchLink] = useState('')
  const [searchDescribe, setSearchDescribe] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [compareData, setCompareData] = useState(null)
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [compareLoading, setCompareLoading] = useState(false)

  function saveWishlist(items) { setWishlist(items); store.saveWishlist(items) }
  function saveCats(cats) { setCategories(cats); store.saveCategories(cats) }

  // ── STEP 1: Open search ──
  function openSearch() {
    setSearchQuery(''); setSearchBrand(''); setSearchHint('')
    setSearchLink(''); setSearchDescribe(''); setSelectedCat('')
    setResults([]); setSelectedProduct(null); setCompareData(null); setSelectedPlatform(null)
    setSearchMode('type'); setStep(1)
  }

  // ── STEP 1→2: Search ──
  async function doSearch() {
    let q = '', brand = '', hint = ''
    if (searchMode === 'type') {
      q = searchQuery.trim(); brand = searchBrand.trim(); hint = searchHint.trim()
      if (!q) { toast('Enter product name'); return }
    } else if (searchMode === 'link') {
      q = searchLink.trim()
      if (!q) { toast('Paste a product link'); return }
    } else {
      q = searchDescribe.trim()
      if (!q) { toast('Describe what you want'); return }
    }
    if (!selectedCat) { toast('Select a category'); return }

    setLoading(true); setStep(2); setResults([])

    try {
      const cat = categories.find(c => c.id === selectedCat)
      const data = await searchProducts({ query: q, brand, hint, category: cat?.name })
      setResults(data.products || [])
    } catch (err) {
      toast('Search failed: ' + err.message)
      setStep(1)
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2→3: Select product ──
  async function selectProduct(product) {
    setSelectedProduct(product)
    setCompareData(null); setSelectedPlatform(null)
    setCompareLoading(true); setStep(3)

    try {
      const cat = categories.find(c => c.id === selectedCat)
      const data = await comparePlatforms({
        product: product.name,
        category: cat?.name || cat?.id,
        found_price: product.min_price
      })

      // Mark lowest price and fastest delivery
      const avail = (data.platforms || []).filter(p => p.available !== false)
      const lowestPrice = Math.min(...avail.map(p => p.price || Infinity))
      const minTime = Math.min(...avail.map(p => toMins(p.delivery_time)))
      data.platforms = data.platforms.map(p => ({
        ...p,
        _isLowest: p.price === lowestPrice,
        _isFastest: toMins(p.delivery_time) === minTime
      }))

      setCompareData(data)
      // Auto-select best overall
      const bestName = data.best_overall || avail[0]?.name
      const bestPlat = data.platforms.find(p => p.name === bestName) || avail[0]
      if (bestPlat) setSelectedPlatform(bestPlat)
    } catch (err) {
      toast('Price comparison failed: ' + err.message)
    } finally {
      setCompareLoading(false)
    }
  }

  // ── STEP 3: Add to wishlist ──
  function addToWishlist() {
    if (!selectedProduct || !selectedPlatform) { toast('Select a platform first'); return }
    const cat = categories.find(c => c.id === selectedCat)
    const item = {
      id: Date.now(),
      name: selectedProduct.name,
      brand: selectedProduct.brand || searchBrand || '',
      image: selectedProduct.image || null,
      description: selectedProduct.description || '',
      catId: selectedCat,
      catName: cat?.name || '',
      catIcon: cat?.icon || '📦',
      platforms: cat?.platforms || [],
      price_display: selectedProduct.price_display || '',
      min_price: selectedProduct.min_price || 0,
      chosen_platform: selectedPlatform.name,
      chosen_price: selectedPlatform.price,
      chosen_delivery: selectedPlatform.delivery_time,
      chosen_url: getPlatformURL(selectedPlatform.name, selectedPlatform.search_query || selectedProduct.name),
      addedOn: new Date().toISOString()
    }
    const updated = [item, ...wishlist]
    saveWishlist(updated)
    setExpandedId(item.id)
    setFilter('all')
    setStep(0)
    toast(`✓ Added to ${cat?.name || ''} wishlist!`)
  }

  // ── Add category ──
  function saveNewCat() {
    const name = newCatName.trim()
    if (!name) { toast('Enter category name'); return }
    const icon = newCatIcon.trim() || '📦'
    const id = 'cat_' + Date.now()
    let platforms = ['Amazon', 'Flipkart']
    const nl = name.toLowerCase()
    if (nl.includes('food') || nl.includes('grocery')) platforms = ['Zepto', 'Blinkit', 'Swiggy Instamart', 'BigBasket']
    else if (nl.includes('cloth') || nl.includes('fashion') || nl.includes('shoe')) platforms = ['Amazon', 'Flipkart', 'Myntra', 'Meesho']
    else if (nl.includes('medicine') || nl.includes('pharma')) platforms = ['PharmEasy', '1mg', 'Netmeds', 'Apollo Pharmacy']
    const newCats = [...categories, { id, name, icon, platforms }]
    saveCats(newCats)
    setSelectedCat(id)
    setNewCatName(''); setNewCatIcon('')
    setStep(1)
    toast(`"${name}" added ✓`)
  }

  // ── Delete from wishlist ──
  function deleteItem(id) {
    saveWishlist(wishlist.filter(x => x.id !== id))
    toast('Removed')
  }

  // ── Re-compare ──
  async function recompare(item) {
    const cat = categories.find(c => c.id === item.catId)
    setSelectedCat(item.catId)
    setSelectedProduct({ name: item.name, brand: item.brand, image: item.image, description: item.description, min_price: item.min_price })
    setCompareData(null); setSelectedPlatform(null)
    setCompareLoading(true); setStep(3)
    try {
      const data = await comparePlatforms({ product: item.name, category: cat?.name, found_price: item.min_price })
      const avail = (data.platforms || []).filter(p => p.available !== false)
      const lowestPrice = Math.min(...avail.map(p => p.price || Infinity))
      const minTime = Math.min(...avail.map(p => toMins(p.delivery_time)))
      data.platforms = data.platforms.map(p => ({ ...p, _isLowest: p.price === lowestPrice, _isFastest: toMins(p.delivery_time) === minTime }))
      setCompareData(data)
      const bestPlat = data.platforms.find(p => p.name === data.best_overall) || avail[0]
      if (bestPlat) setSelectedPlatform(bestPlat)
    } catch (err) { toast('Compare failed: ' + err.message) }
    finally { setCompareLoading(false) }
  }

  const catCounts = {}
  wishlist.forEach(w => { catCounts[w.catId] = (catCounts[w.catId] || 0) + 1 })
  const filtered = filter === 'all' ? wishlist : wishlist.filter(x => x.catId === filter)

  return (
    <>
      <div className="scroll">
        {/* Category filter tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
          <div className={`cat-chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>All ({wishlist.length})</div>
          {categories.filter(c => catCounts[c.id]).map(c => (
            <div key={c.id} className={`cat-chip${filter === c.id ? ' active' : ''}`} onClick={() => setFilter(c.id)}>
              {c.icon} {c.name} ({catCounts[c.id]})
            </div>
          ))}
        </div>

        {/* Wishlist */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛍</div>
            <div className="empty-title">Wishlist is empty</div>
            <div className="empty-sub">Tap + to search products and compare<br />prices across Amazon, Flipkart and more</div>
          </div>
        ) : (
          <div className="wish-list">
            {filtered.map(item => {
              const expanded = expandedId === item.id
              const buyUrl = item.chosen_url || getPlatformURL(item.chosen_platform, item.name)
              return (
                <div key={item.id} className="wish-card">
                  <div className="wish-row" onClick={() => setExpandedId(expanded ? null : item.id)}>
                    <div className="wish-img">
                      {item.image ? <img src={item.image} alt={item.name} onError={e => e.target.style.display='none'} /> : <div className="wish-img-placeholder">{item.catIcon}</div>}
                    </div>
                    <div className="wish-info">
                      <div className="wish-name">{item.name}</div>
                      <div className="wish-brand">{item.brand}{item.catName ? ` · ${item.catName}` : ''}</div>
                      <div className="wish-plat">
                        <div className="wish-plat-dot" style={{ background: platColor(item.chosen_platform) }} />
                        <span className="wish-plat-txt">
                          {item.chosen_platform} · {item.chosen_price ? `₹${item.chosen_price.toLocaleString('en-IN')}` : '—'}
                        </span>
                        {item.chosen_delivery && (
                          <span className="tag tag-sky" style={{ fontSize: 10 }}>{item.chosen_delivery}</span>
                        )}
                      </div>
                    </div>
                    <div className="wish-actions">
                      <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 12 }} onClick={e => { e.stopPropagation(); deleteItem(item.id) }}>×</button>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="wish-panel">
                      {item.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>{item.description.slice(0, 120)}</div>
                      )}
                      <a href={buyUrl} target="_blank" rel="noreferrer" className="buy-now-btn" style={{ background: platColor(item.chosen_platform) }}>
                        <span style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                          {platInitials(item.chosen_platform)}
                        </span>
                        Buy on {item.chosen_platform}
                        {item.chosen_price ? ` · ₹${item.chosen_price.toLocaleString('en-IN')}` : ''}
                      </a>
                      <button className="recompare-btn" onClick={() => recompare(item)}>🔄 Compare prices again</button>
                      <div className="redirect-note">Opens {item.chosen_platform} search pre-filled with this exact product</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={openSearch}>+</button>

      {/* ── STEP 1: SEARCH SHEET ── */}
      <Sheet open={step === 1} onClose={() => setStep(0)}>
        <Steps step={1} />
        <div className="mode-tabs">
          {[['type','✏️','Type it'],['link','🔗','Paste link'],['describe','🤖','Describe']].map(([m,icon,lbl]) => (
            <button key={m} className={`mode-tab${searchMode===m?' active':''}`} onClick={() => setSearchMode(m)}>
              <span className="mode-tab-icon">{icon}</span>{lbl}
            </button>
          ))}
        </div>

        {searchMode === 'type' && (
          <>
            <div className="field">
              <div className="field-lbl">Product <span className="req">*</span></div>
              <input className="inp" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="e.g. Gas Stove, Running Shoes, Laptop" onKeyDown={e => e.key==='Enter'&&doSearch()} />
            </div>
            <div className="field">
              <div className="field-lbl">Brand</div>
              <input className="inp" value={searchBrand} onChange={e => setSearchBrand(e.target.value)} placeholder="e.g. Preethi, Nike, Dell, Amul" />
            </div>
            <div className="field">
              <div className="field-lbl">Extra detail <span style={{ textTransform: 'none', fontSize: 10, color: 'var(--text-faint)', letterSpacing: 0 }}>(optional)</span></div>
              <input className="inp" value={searchHint} onChange={e => setSearchHint(e.target.value)} placeholder="e.g. 4 burner auto ignition, 256GB, Size 10" />
            </div>
          </>
        )}
        {searchMode === 'link' && (
          <div className="field">
            <div className="field-lbl">Product URL <span className="req">*</span></div>
            <input className="inp" value={searchLink} onChange={e => setSearchLink(e.target.value)} placeholder="Paste Amazon / Flipkart / any product link" type="url" />
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>AI will extract product details and find similar products</div>
          </div>
        )}
        {searchMode === 'describe' && (
          <div className="field">
            <div className="field-lbl">Describe what you want <span className="req">*</span></div>
            <textarea className="inp" rows={3} value={searchDescribe} onChange={e => setSearchDescribe(e.target.value)} placeholder="e.g. I want a lightweight running shoe for daily jogging under ₹10,000" style={{ resize: 'none' }} />
          </div>
        )}

        <div className="field">
          <div className="field-lbl">Category <span className="req">*</span></div>
          <div className="cat-chips">
            {categories.map(c => (
              <div key={c.id} className={`cat-chip${selectedCat===c.id?' active':''}`} onClick={() => setSelectedCat(c.id)}>
                {c.icon} {c.name}
              </div>
            ))}
            <button className="cat-chip-add" onClick={() => setStep(4)}>+ New</button>
          </div>
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={doSearch}>
          🔍 Search
        </button>
      </Sheet>

      {/* ── STEP 2: RESULTS SHEET ── */}
      <Sheet open={step === 2} onClose={() => setStep(1)}>
        <Steps step={2} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 14 }}>
          {searchBrand ? `${searchBrand} ${searchQuery}` : searchQuery || searchDescribe.slice(0, 40)}
        </div>
        {loading ? (
          <div className="loading-card">
            <div className="spinner" />
            <p>Searching Google Shopping for real products…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No results found</div>
            <div className="empty-sub">Try a different search term or brand</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 10 }}>{results.length} products found · Tap to compare prices</div>
            <div className="product-grid">
              {results.map((p, i) => <ProductCard key={i} product={p} onSelect={selectProduct} />)}
            </div>
          </>
        )}
        <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={() => setStep(1)}>← Back to Search</button>
      </Sheet>

      {/* ── STEP 3: COMPARE SHEET ── */}
      <Sheet open={step === 3} onClose={() => setStep(2)}>
        <Steps step={3} />
        {selectedProduct && (
          <div className="selected-summary">
            <div className="selected-img">
              {selectedProduct.image
                ? <img src={selectedProduct.image} alt={selectedProduct.name} onError={e => e.target.style.display='none'} />
                : <span style={{ fontSize: 22 }}>{categories.find(c=>c.id===selectedCat)?.icon || '📦'}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{selectedProduct.name}</div>
              {selectedProduct.description && <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4, marginBottom: 5 }}>{selectedProduct.description.slice(0, 100)}</div>}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <span className="tag tag-violet">{selectedProduct.brand || searchBrand}</span>
                <span className="tag tag-gray">{categories.find(c=>c.id===selectedCat)?.name}</span>
                {selectedProduct.price_display && <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 700 }}>{selectedProduct.price_display}</span>}
              </div>
            </div>
          </div>
        )}

        {compareLoading ? (
          <div className="loading-card">
            <div className="spinner" />
            <p>Comparing prices across platforms with AI…</p>
          </div>
        ) : compareData ? (
          <>
            {compareData.best_overall && (
              <div className="best-banner">
                <span style={{ fontSize: 18 }}>🏆</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--violet-l)' }}>Best overall: {compareData.best_overall}</div>
                  {compareData.summary && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{compareData.summary}</div>}
                </div>
              </div>
            )}
            <div className="ai-banner">
              <span>ℹ️</span>
              <span>Prices are estimates based on AI knowledge. Tap the platform name to open and see the live price directly.</span>
            </div>
            <div className="platform-list">
              {(compareData.platforms || []).filter(p => p.available !== false).map(plat => (
                <PlatformRow
                  key={plat.name}
                  plat={plat}
                  selected={selectedPlatform?.name === plat.name}
                  onSelect={setSelectedPlatform}
                />
              ))}
              {(compareData.platforms || []).filter(p => p.available === false).map(plat => (
                <div key={plat.name} className="platform-row unavailable">
                  <div className="plat-radio" />
                  <div className="plat-logo" style={{ background: platColor(plat.name) }}>{platInitials(plat.name)}</div>
                  <div className="plat-info">
                    <div className="plat-name">{plat.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>Not available for this product</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => { setStep(0) }}>🛒 Back to Wishlist</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={addToWishlist} disabled={!selectedPlatform}>
            + Add to Wishlist
          </button>
        </div>
      </Sheet>

      {/* ── ADD CATEGORY SHEET ── */}
      <Sheet open={step === 4} onClose={() => setStep(1)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>← Back</button>
          <div className="sheet-title" style={{ margin: 0 }}>New Category</div>
        </div>
        <div className="field">
          <div className="field-lbl">Category Name <span className="req">*</span></div>
          <input className="inp" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Sports, Stationery, Pets" onKeyDown={e => e.key==='Enter'&&saveNewCat()} />
        </div>
        <div className="field">
          <div className="field-lbl">Icon (emoji)</div>
          <input className="inp" value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} placeholder="🏋️" maxLength={4} style={{ fontSize: 22 }} />
        </div>
        <button className="btn btn-primary btn-full" onClick={saveNewCat}>Add Category</button>
      </Sheet>
    </>
  )
}
