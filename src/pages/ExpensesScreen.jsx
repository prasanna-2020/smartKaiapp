import React, { useState } from 'react'
import { store } from '../lib/store.js'

// Fix 7: Category first, then amount (mandatory), description optional, custom categories

const DEFAULT_EXP_CATS = ['Food','Transport','Shopping','Health','Bills','Entertainment','Education','Other']

function Sheet({ open, onClose, children }) {
  return (
    <div className={`overlay${open?' open':''}`} onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-drag"/>
        <div className="sheet-content">{children}</div>
      </div>
    </div>
  )
}

export default function ExpensesScreen({ toast }) {
  const [expenses, setExpenses] = useState(() => store.getExpenses())
  const [expCats, setExpCats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sk_exp_cats') || 'null') || DEFAULT_EXP_CATS } catch { return DEFAULT_EXP_CATS }
  })
  const [open, setOpen] = useState(false)
  const [addCatOpen, setAddCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Form fields — category first, then amount, description optional
  const [cat, setCat] = useState(expCats[0] || 'Food')
  const [amt, setAmt] = useState('')
  const [desc, setDesc] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  function saveCats(cats) {
    setExpCats(cats)
    try { localStorage.setItem('sk_exp_cats', JSON.stringify(cats)) } catch {}
  }
  function saveItems(items) { setExpenses(items); store.saveExpenses(items) }

  function addCat() {
    const n = newCatName.trim()
    if (!n) { toast('Enter category name'); return }
    if (expCats.includes(n)) { toast('Category already exists'); return }
    saveCats([...expCats, n])
    setCat(n)
    setNewCatName('')
    setAddCatOpen(false)
    setOpen(true)
    toast(`"${n}" added ✓`)
  }

  function add() {
    const a = parseFloat(amt)
    if (!cat) { toast('Select a category'); return }
    if (isNaN(a) || a <= 0) { toast('Enter a valid amount'); return }
    saveItems([{ id: Date.now(), desc: desc.trim() || cat, amount: a, category: cat, date }, ...expenses])
    setAmt(''); setDesc(''); setCat(expCats[0] || 'Food'); setDate(new Date().toISOString().split('T')[0])
    setOpen(false); toast('Expense saved ✓')
  }

  function del(id) { saveItems(expenses.filter(x => x.id !== id)); toast('Removed') }

  const total = expenses.reduce((s,e) => s + e.amount, 0)

  // Group by category for summary
  const byCat = {}
  expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount })

  return (
    <>
      <div className="scroll">
        {/* Total */}
        <div className="exp-total">
          <span style={{fontSize:13,color:'var(--emerald)',fontWeight:500}}>Total</span>
          <span style={{fontSize:20,fontWeight:700,fontFamily:'var(--mono)',color:'var(--emerald)'}}>₹{total.toFixed(2)}</span>
        </div>

        {/* Category summary chips */}
        {Object.keys(byCat).length > 0 && (
          <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:14,scrollbarWidth:'none'}}>
            {Object.entries(byCat).map(([c,v]) => (
              <div key={c} className="tag tag-violet" style={{whiteSpace:'nowrap',fontSize:11}}>
                {c}: ₹{v.toFixed(0)}
              </div>
            ))}
          </div>
        )}

        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">₹</div>
            <div className="empty-title">No expenses</div>
            <div className="empty-sub">Tap + to track spending</div>
          </div>
        ) : expenses.map(e => (
          <div key={e.id} className="exp-card">
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600}}>{e.desc}</div>
              <div style={{display:'flex',gap:6,marginTop:3,alignItems:'center'}}>
                <span className="tag tag-gray" style={{fontSize:10}}>{e.category}</span>
                <span style={{fontSize:11,color:'var(--text-faint)'}}>{e.date}</span>
              </div>
            </div>
            <div style={{fontSize:16,fontWeight:700,fontFamily:'var(--mono)',color:'var(--emerald)',flexShrink:0}}>₹{e.amount.toFixed(0)}</div>
            <button className="btn btn-ghost btn-sm" style={{padding:'6px 9px'}} onClick={()=>del(e.id)}>×</button>
          </div>
        ))}
      </div>

      <button className="fab" onClick={() => setOpen(true)}>+</button>

      {/* ADD EXPENSE SHEET */}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="sheet-title">Add Expense</div>

        {/* STEP 1: Category (mandatory) */}
        <div className="field">
          <div className="field-lbl">Category <span className="req">*</span></div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
            {expCats.map(c => (
              <div key={c} className={`cat-chip${cat===c?' active':''}`} onClick={() => setCat(c)}>{c}</div>
            ))}
            <button className="cat-chip-add" onClick={() => { setOpen(false); setAddCatOpen(true) }}>+ New</button>
          </div>
        </div>

        {/* STEP 2: Amount (mandatory) */}
        <div className="field">
          <div className="field-lbl">Amount (₹) <span className="req">*</span></div>
          <input
            className="inp" type="number" inputMode="decimal"
            value={amt} onChange={e => setAmt(e.target.value)}
            placeholder="0.00"
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{fontSize:20,fontWeight:700}}
          />
        </div>

        {/* STEP 3: Description (optional) */}
        <div className="field">
          <div className="field-lbl">Description <span style={{fontSize:10,color:'var(--text-faint)',textTransform:'none',letterSpacing:0}}>(optional)</span></div>
          <input className="inp" value={desc} onChange={e => setDesc(e.target.value)} placeholder={`e.g. ${cat} at Nilgiris`} />
        </div>

        {/* Date */}
        <div className="field">
          <div className="field-lbl">Date</div>
          <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={add}>Save Expense</button>
      </Sheet>

      {/* ADD CATEGORY SHEET */}
      <Sheet open={addCatOpen} onClose={() => setAddCatOpen(false)}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAddCatOpen(false); setOpen(true) }}>← Back</button>
          <div className="sheet-title" style={{margin:0}}>New Category</div>
        </div>
        <div className="field">
          <div className="field-lbl">Category Name <span className="req">*</span></div>
          <input className="inp" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Groceries, Fuel, Rent" onKeyDown={e => e.key==='Enter'&&addCat()} />
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={addCat}>Add Category</button>
      </Sheet>
    </>
  )
}
