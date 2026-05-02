import React, { useState, useEffect } from 'react';
import { getWishlist, removeFromWishlist } from '../lib/storage.js';
import styles from './Wishlist.module.css';

const PLAT_COLORS = {
  'Amazon': '#f59e0b', 'Flipkart': '#2563eb', 'Myntra': '#e11d48',
  'Meesho': '#ec4899', 'Zepto': '#7c5cfc', 'Blinkit': '#f59e0b',
  'Swiggy Instamart': '#f97316', 'BigBasket': '#16a34a',
  'PharmEasy': '#10b981', '1mg': '#ef4444', 'Croma': '#6366f1',
  'Tata Cliq': '#8b5cf6', 'Reliance Digital': '#dc2626',
};

function WishlistItem({ item, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const platColor = PLAT_COLORS[item.chosenPlatform] || item.platformColor || '#7c5cfc';
  const dateStr = item.addedAt ? new Date(item.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

  return (
    <div className={`${styles.item} fade-in`}>
      <div className={styles.itemRow} onClick={() => setExpanded(e => !e)}>
        {/* Image */}
        <div className={styles.itemImg}>
          {item.image && !imgError ? (
            <img src={item.image} alt={item.name} onError={() => setImgError(true)} className={styles.img} />
          ) : (
            <span className={styles.imgFallback}>📦</span>
          )}
        </div>

        {/* Info */}
        <div className={styles.itemInfo}>
          <div className={styles.itemName}>{item.name}</div>
          {item.brand && <div className={styles.itemBrand}>{item.brand} · {item.category}</div>}
          <div className={styles.itemPlat}>
            <div className={styles.platDot} style={{ background: platColor }} />
            <span>{item.chosenPlatform}</span>
            {item.chosenPlatformPrice && (
              <span className={styles.platPrice}>{item.chosenPlatformPrice}</span>
            )}
            {item.chosenPlatformDelivery && (
              <span className={styles.platDeliv}>{item.chosenPlatformDelivery}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.itemRight}>
          {dateStr && <span className={styles.dateAdded}>{dateStr}</span>}
          <button
            className={styles.deleteBtn}
            onClick={e => { e.stopPropagation(); onRemove(item.id); }}
            title="Remove"
          >
            ×
          </button>
          <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded buy panel */}
      {expanded && (
        <div className={styles.buyPanel} style={{ borderColor: platColor + '30' }}>
          {item.image && !imgError && (
            <img src={item.image} alt={item.name} className={styles.expandedImg} onError={() => setImgError(true)} />
          )}
          {item.description && (
            <p className={styles.expandedDesc}>{item.description}</p>
          )}
          <a
            href={item.chosenPlatformUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyBtn}
            style={{ background: platColor }}
          >
            <span className={styles.buyBtnLogo} style={{ background: 'rgba(255,255,255,0.2)' }}>
              {item.chosenPlatform?.slice(0, 2).toUpperCase()}
            </span>
            Buy on {item.chosenPlatform}
            {item.chosenPlatformPrice && ` · ${item.chosenPlatformPrice}`}
            →
          </a>
          <p className={styles.buyNote}>
            Opens {item.chosenPlatform} search pre-filled with this product · Verify final price on platform
          </p>
        </div>
      )}
    </div>
  );
}

export default function Wishlist({ onWishlistChange }) {
  const [items, setItems] = useState([]);
  const [filterCat, setFilterCat] = useState('All');

  useEffect(() => {
    setItems(getWishlist());
  }, []);

  const handleRemove = (id) => {
    const updated = removeFromWishlist(id);
    setItems(updated);
    onWishlistChange?.();
  };

  const categories = ['All', ...new Set(items.map(i => i.category).filter(Boolean))];
  const filtered = filterCat === 'All' ? items : items.filter(i => i.category === filterCat);
  const total = filtered.reduce((s, i) => s + (i.priceNum || 0), 0);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🛒</div>
        <h2 className={styles.emptyTitle}>Your wishlist is empty</h2>
        <p className={styles.emptySub}>Search for products and add them here to compare prices and buy later</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>My Wishlist</h2>
          <p className={styles.sub}>{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        {total > 0 && (
          <div className={styles.totalBadge}>
            Est. total: ₹{total.toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 2 && (
        <div className={styles.catFilter}>
          {categories.map(c => (
            <button
              key={c}
              className={`${styles.catBtn} ${filterCat === c ? styles.catBtnActive : ''}`}
              onClick={() => setFilterCat(c)}
            >
              {c} {c !== 'All' && `(${items.filter(i => i.category === c).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Items */}
      <div className={styles.list}>
        {filtered.map(item => (
          <WishlistItem key={item.id} item={item} onRemove={handleRemove} />
        ))}
      </div>
    </div>
  );
}
