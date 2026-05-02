import React, { useState } from 'react';
import { getCategories, saveCategories } from '../lib/storage.js';
import styles from './SearchForm.module.css';

export default function SearchForm({ onSearch, loading, error }) {
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [hint, setHint] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState(getCategories);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('');

  const selectedCat = categories.find(c => c.id === categoryId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (!categoryId) { alert('Please select a category'); return; }
    onSearch({
      query: query.trim(),
      brand: brand.trim(),
      hint: hint.trim(),
      category: selectedCat?.name || '',
    });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const id = 'custom_' + Date.now();
    const newCat = {
      id,
      name: newCatName.trim(),
      icon: newCatIcon.trim() || '📦',
      color: '#7c5cfc'
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);
    setCategoryId(id);
    setShowAddCat(false);
    setNewCatName('');
    setNewCatIcon('');
  };

  return (
    <div className={styles.wrap}>
      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Find the best price</h1>
        <p className={styles.heroSub}>
          Search any product — we fetch real results from Google Shopping and compare prices across Amazon, Flipkart, Myntra and more
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Product */}
        <div className={styles.field}>
          <label className={styles.label}>
            Product <span className={styles.req}>*</span>
          </label>
          <input
            className={styles.input}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. Gas stove, Running shoes, Laptop"
            required
            autoFocus
          />
        </div>

        {/* Brand + Hint row */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Brand</label>
            <input
              className={styles.input}
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g. Preethi, Nike, Dell"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Extra detail</label>
            <input
              className={styles.input}
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="e.g. 4 burner, black, 16GB"
            />
          </div>
        </div>

        {/* Category */}
        <div className={styles.field}>
          <label className={styles.label}>
            Category <span className={styles.req}>*</span>
          </label>
          <div className={styles.catGrid}>
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.catChip} ${categoryId === cat.id ? styles.catChipActive : ''}`}
                style={categoryId === cat.id ? { borderColor: cat.color, background: cat.color + '18', color: cat.color } : {}}
                onClick={() => setCategoryId(cat.id)}
              >
                <span className={styles.catIcon}>{cat.icon}</span>
                <span className={styles.catName}>{cat.name}</span>
              </button>
            ))}
            <button
              type="button"
              className={styles.addCatBtn}
              onClick={() => setShowAddCat(true)}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Add category inline */}
        {showAddCat && (
          <div className={styles.addCatForm}>
            <div className={styles.row}>
              <input
                className={styles.input}
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name"
                style={{ flex: 2 }}
              />
              <input
                className={styles.input}
                value={newCatIcon}
                onChange={e => setNewCatIcon(e.target.value)}
                placeholder="🎯 emoji"
                maxLength={4}
                style={{ flex: 1, fontSize: '18px' }}
              />
            </div>
            <div className={styles.row} style={{ marginTop: 8 }}>
              <button type="button" className={styles.cancelBtn} onClick={() => setShowAddCat(false)}>Cancel</button>
              <button type="button" className={styles.addBtn} onClick={handleAddCategory}>Add Category</button>
            </div>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.searchBtn}
          disabled={loading || !query.trim() || !categoryId}
        >
          {loading ? (
            <span className={styles.btnSpinner} />
          ) : (
            '🔍 Search & Compare Prices'
          )}
        </button>
      </form>

      {/* Example searches */}
      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Try:</span>
        {[
          { q: 'Gas stove', b: 'Preethi', h: '4 burner', c: 'kitchen' },
          { q: 'Running shoes', b: 'Nike', h: '', c: 'clothing' },
          { q: 'Laptop', b: 'Dell', h: '16GB RAM', c: 'electronics' },
          { q: 'Rice', b: 'India Gate', h: '5kg', c: 'grocery' },
        ].map((ex, i) => (
          <button
            key={i}
            type="button"
            className={styles.exampleChip}
            onClick={() => {
              setQuery(ex.q);
              setBrand(ex.b);
              setHint(ex.h);
              setCategoryId(ex.c);
            }}
          >
            {[ex.b, ex.q].filter(Boolean).join(' ')}
          </button>
        ))}
      </div>
    </div>
  );
}
