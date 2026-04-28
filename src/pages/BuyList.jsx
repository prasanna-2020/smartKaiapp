import React, { useState } from 'react';
import SearchForm from '../components/SearchForm.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import CompareModal from '../components/CompareModal.jsx';
import { searchProducts } from '../lib/api.js';
import { addToWishlist } from '../lib/storage.js';
import styles from './BuyList.module.css';

export default function BuyList({ onWishlistChange }) {
  const [step, setStep] = useState('search'); // search | results | compare
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSearch = async (formData) => {
    setLoading(true);
    setError('');
    setProducts([]);
    setStep('results');
    setSearchMeta(formData);
    try {
      const data = await searchProducts(formData);
      if (!data.products || data.products.length === 0) {
        setError('No products found. Try a different search term or brand.');
        setStep('search');
        return;
      }
      setProducts(data.products);
    } catch (err) {
      setError(err.message || 'Search failed. Please try again.');
      setStep('search');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setStep('compare');
  };

  const handleAddToWishlist = (product, platform) => {
    const item = {
      id: Date.now(),
      name: product.name,
      brand: product.brand,
      image: product.image,
      description: product.description,
      category: searchMeta?.category || 'General',
      price: product.price || platform?.price_display || '',
      priceNum: product.price_num || platform?.estimated_price || 0,
      chosenPlatform: platform?.name || product.source || '',
      chosenPlatformPrice: platform?.price_display || product.price || '',
      chosenPlatformDelivery: platform?.delivery_display || product.delivery || '',
      chosenPlatformUrl: platform?.search_url || product.link || '',
      platformColor: getPlatformColor(platform?.name || product.source),
    };
    addToWishlist(item);
    onWishlistChange?.();
    showToast(`✓ Added to wishlist!`);
    setStep('search');
    setSelectedProduct(null);
  };

  const handleBack = () => {
    if (step === 'compare') { setStep('results'); setSelectedProduct(null); }
    else if (step === 'results') { setStep('search'); setProducts([]); }
  };

  return (
    <div className={styles.page}>
      {/* Step indicator */}
      {step !== 'search' && (
        <div className={styles.stepBar}>
          <button className={styles.backBtn} onClick={handleBack}>
            ← Back
          </button>
          <div className={styles.steps}>
            <span className={`${styles.step} ${step === 'results' || step === 'compare' ? styles.stepDone : ''}`}>
              1 · Search
            </span>
            <span className={styles.stepLine} />
            <span className={`${styles.step} ${step === 'results' ? styles.stepActive : step === 'compare' ? styles.stepDone : ''}`}>
              2 · Pick product
            </span>
            <span className={styles.stepLine} />
            <span className={`${styles.step} ${step === 'compare' ? styles.stepActive : ''}`}>
              3 · Compare & add
            </span>
          </div>
        </div>
      )}

      {/* Search form */}
      {step === 'search' && (
        <SearchForm onSearch={handleSearch} loading={loading} error={error} />
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingWrap}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Searching Google Shopping for real products…</p>
          <p className={styles.loadingSubtext}>Fetching names, images and prices from across the web</p>
        </div>
      )}

      {/* Results grid */}
      {step === 'results' && !loading && products.length > 0 && (
        <>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>
              {products.length} products found
            </h2>
            <p className={styles.resultsSub}>
              Showing real results for <strong>{[searchMeta?.brand, searchMeta?.query, searchMeta?.hint].filter(Boolean).join(' ')}</strong> — tap any product to compare prices across platforms
            </p>
          </div>
          <ProductGrid products={products} onSelect={handleSelectProduct} />
        </>
      )}

      {/* Compare modal */}
      {step === 'compare' && selectedProduct && (
        <CompareModal
          product={selectedProduct}
          category={searchMeta?.category}
          onAdd={handleAddToWishlist}
          onBack={() => { setStep('results'); setSelectedProduct(null); }}
        />
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

function getPlatformColor(name) {
  const map = {
    'Amazon': '#f59e0b', 'Flipkart': '#2563eb', 'Myntra': '#e11d48',
    'Meesho': '#ec4899', 'Zepto': '#7c5cfc', 'Blinkit': '#f59e0b',
    'Swiggy Instamart': '#f97316', 'BigBasket': '#16a34a',
    'PharmEasy': '#10b981', '1mg': '#ef4444', 'Croma': '#6366f1',
    'Tata Cliq': '#8b5cf6', 'Nykaa': '#f97316',
  };
  return map[name] || '#7c5cfc';
}
