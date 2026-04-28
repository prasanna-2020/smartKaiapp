import React, { useState, useEffect } from 'react';
import { compareProduct } from '../lib/api.js';
import styles from './CompareModal.module.css';

const PLAT_COLORS = {
  'Amazon': '#f59e0b', 'Flipkart': '#2563eb', 'Myntra': '#e11d48',
  'Meesho': '#ec4899', 'Zepto': '#7c5cfc', 'Blinkit': '#f59e0b',
  'Swiggy Instamart': '#f97316', 'BigBasket': '#16a34a',
  'PharmEasy': '#10b981', '1mg': '#ef4444', 'Netmeds': '#3b82f6',
  'Apollo Pharmacy': '#0ea5e9', 'Croma': '#6366f1', 'Tata Cliq': '#8b5cf6',
  'Reliance Digital': '#dc2626', 'Nykaa': '#f97316',
};

export default function CompareModal({ product, category, onAdd, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    loadComparison();
  }, [product]);

  const loadComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await compareProduct({ product, category });
      setComparison(data);
      // Auto-select best overall platform
      const best = data.platforms?.find(p => p.is_lowest && p.available !== false)
        || data.platforms?.find(p => p.available !== false);
      if (best) setSelectedPlatform(best);
    } catch (err) {
      setError(err.message || 'Could not load comparison');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!selectedPlatform) return;
    onAdd(product, selectedPlatform);
  };

  return (
    <div className={styles.wrap}>
      {/* Selected product summary */}
      <div className={styles.productCard}>
        <div className={styles.productImgWrap}>
          {product.image && !imgError ? (
            <img
              src={product.image}
              alt={product.name}
              className={styles.productImg}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.productImgPlaceholder}>📦</div>
          )}
        </div>
        <div className={styles.productInfo}>
          <h2 className={styles.productName}>{product.name}</h2>
          {product.description && (
            <p className={styles.productDesc}>{product.description}</p>
          )}
          <div className={styles.productTags}>
            {product.brand && <span className={styles.tagBrand}>{product.brand}</span>}
            {category && <span className={styles.tagCat}>{category}</span>}
            {product.price && <span className={styles.tagPrice}>{product.price}</span>}
          </div>
        </div>
      </div>

      {/* AI note */}
      <div className={styles.aiNote}>
        <span>⚠️</span>
        <span>Prices are AI-estimated based on current market data. Click <strong>Search →</strong> on any platform to verify the exact live price.</span>
      </div>

      {/* Platform comparison */}
      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <p>Comparing prices across {category === 'Grocery' || category === 'Medicine' ? 'quick-commerce' : 'e-commerce'} platforms…</p>
        </div>
      )}

      {error && !loading && (
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={loadComparison}>Retry</button>
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Best overall banner */}
          {comparison.summary && (
            <div className={styles.summaryBanner}>
              <span className={styles.trophyIcon}>🏆</span>
              <span>{comparison.summary}</span>
            </div>
          )}

          <h3 className={styles.platformsTitle}>Select platform to buy from</h3>

          <div className={styles.platforms}>
            {(comparison.platforms || []).map((plat, i) => {
              const color = PLAT_COLORS[plat.name] || '#7c5cfc';
              const isSelected = selectedPlatform?.name === plat.name;
              const unavailable = plat.available === false;

              return (
                <div
                  key={i}
                  className={`${styles.platRow} ${isSelected ? styles.platRowSelected : ''} ${unavailable ? styles.platRowUnavail : ''}`}
                  style={isSelected ? { borderColor: color, background: color + '10' } : {}}
                  onClick={() => !unavailable && setSelectedPlatform(plat)}
                >
                  {/* Radio */}
                  <div
                    className={`${styles.radio} ${isSelected ? styles.radioSelected : ''}`}
                    style={isSelected ? { background: color, borderColor: color } : {}}
                  />

                  {/* Platform logo pill */}
                  <div
                    className={styles.platLogo}
                    style={{ background: color }}
                  >
                    {plat.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Platform info */}
                  <div className={styles.platInfo}>
                    <div className={styles.platName}>{plat.name}</div>
                    <div className={styles.platMeta}>
                      {plat.available !== false ? (
                        <>
                          <span
                            className={`${styles.priceTag} ${plat.is_lowest ? styles.priceLowest : ''}`}
                          >
                            {plat.price_display || `₹${plat.estimated_price?.toLocaleString('en-IN')}`}
                            {plat.is_lowest && ' · Lowest'}
                          </span>
                          {plat.price_note && (
                            <span className={styles.priceNote}>{plat.price_note}</span>
                          )}
                          <span
                            className={`${styles.delivTag} ${plat.is_fastest ? styles.delivFastest : ''}`}
                          >
                            🚚 {plat.delivery_display || plat.delivery_time}
                            {plat.is_fastest && ' · Fastest'}
                          </span>
                        </>
                      ) : (
                        <span className={styles.unavailText}>Not available</span>
                      )}
                    </div>
                  </div>

                  {/* Search link */}
                  {plat.search_url && plat.available !== false && (
                    <a
                      href={plat.search_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.searchLink}
                      onClick={e => e.stopPropagation()}
                    >
                      Search →
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <button className={styles.backBtn} onClick={onBack}>← Back</button>
            <button
              className={styles.addBtn}
              disabled={!selectedPlatform}
              style={selectedPlatform ? { background: PLAT_COLORS[selectedPlatform.name] || '#7c5cfc' } : {}}
              onClick={handleAdd}
            >
              + Add to Wishlist
              {selectedPlatform && ` · ${selectedPlatform.name}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
