import React, { useState } from 'react';
import styles from './ProductGrid.module.css';

const PLATFORM_COLORS = {
  'amazon': '#f59e0b', 'flipkart': '#2563eb', 'myntra': '#e11d48',
  'meesho': '#ec4899', 'tata': '#7c3aed', 'nykaa': '#f97316',
  'ajio': '#111', 'snapdeal': '#ef4444', 'paytm': '#3b82f6',
  'bigbasket': '#16a34a', 'blinkit': '#f59e0b', 'zepto': '#7c5cfc',
};

function getPlatformColor(source) {
  if (!source) return '#7c5cfc';
  const key = source.toLowerCase().split('.')[0];
  for (const [k, v] of Object.entries(PLATFORM_COLORS)) {
    if (key.includes(k)) return v;
  }
  return '#7c5cfc';
}

function ProductCard({ product, onSelect, index }) {
  const [imgError, setImgError] = useState(false);
  const platColor = getPlatformColor(product.source);

  return (
    <div
      className={`${styles.card} ${product.is_popular ? styles.cardPopular : ''} fade-in`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onSelect(product)}
    >
      {product.is_popular && (
        <div className={styles.popularBadge}>⭐ Most relevant</div>
      )}

      {/* Product image */}
      <div className={styles.imgWrap}>
        {product.image && !imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className={styles.img}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className={styles.imgPlaceholder}>
            <span className={styles.imgEmoji}>📦</span>
          </div>
        )}
        {/* Platform source badge */}
        {product.source && (
          <div className={styles.sourceBadge} style={{ background: platColor }}>
            {product.source.split('.')[0].slice(0, 8)}
          </div>
        )}
      </div>

      {/* Product info */}
      <div className={styles.info}>
        <h3 className={styles.name}>{product.name}</h3>

        {product.description && (
          <p className={styles.desc}>{product.description}</p>
        )}

        <div className={styles.footer}>
          <div className={styles.priceWrap}>
            {product.price ? (
              <span className={styles.price}>{product.price}</span>
            ) : (
              <span className={styles.priceTba}>See price</span>
            )}
            {product.rating && (
              <span className={styles.rating}>★ {product.rating}</span>
            )}
          </div>
          <button className={styles.compareBtn} onClick={(e) => { e.stopPropagation(); onSelect(product); }}>
            Compare →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductGrid({ products, onSelect }) {
  return (
    <div className={styles.grid}>
      {products.map((product, i) => (
        <ProductCard key={product.id || i} product={product} onSelect={onSelect} index={i} />
      ))}
    </div>
  );
}
