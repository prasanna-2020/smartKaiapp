import React, { useState } from 'react'
import { store } from '../lib/store.js'

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

export default function PhonesScreen({ toast }) {
  const [phones, setPhones] = useState(() => store.getPhones())
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [name, setName] = useState(''); const [num, setNum] = useState(''); const [grp, setGrp] = useState('')

  function save(items) { setPhones(items); store.savePhones(items) }
  function add() {
    if (!name.trim() || !num.trim()) { toast('Name and number required'); return }
    save([{ id: Date.now(), name: name.trim(), number: num.trim(), group: grp }, ...phones])
    setName(''); setNum(''); setGrp(''); setOpen(false); toast('Contact saved ✓')
  }
  function del(id) { save(phones.filter(x=>x.id!==id)); toast('Removed') }

  const list = q ? phones.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.number.includes(q)) : phones

  return (
    <>
      <div className="scroll">
        <div className="search-bar">
          <input className="search-inp" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search contacts…" />
        </div>
        {list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📞</div><div className="empty-title">{q?'No results':'No contacts'}</div><div className="empty-sub">Tap + to add a contact</div></div>
        ) : list.map(p => (
          <div key={p.id} className="contact-card">
            <div className="contact-av">{p.name.charAt(0).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600}}>{p.name}</div>
              <div style={{fontSize:13,color:'var(--text-dim)',fontFamily:'var(--mono)',marginTop:2}}>{p.number}</div>
              {p.group && <div style={{fontSize:11,color:'var(--text-faint)',marginTop:1}}>{p.group}</div>}
            </div>
            <a href={`tel:${p.number}`} className="btn btn-emerald btn-sm">Call</a>
            <button className="btn btn-ghost btn-sm" style={{padding:'6px 9px'}} onClick={()=>del(p.id)}>×</button>
          </div>
        ))}
      </div>
      <button className="fab" onClick={()=>setOpen(true)}>+</button>
      <Sheet open={open} onClose={()=>setOpen(false)}>
        <div className="sheet-title">Add Contact</div>
        <div className="field"><div className="field-lbl">Name <span className="req">*</span></div><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" /></div>
        <div className="field"><div className="field-lbl">Number <span className="req">*</span></div><input className="inp" type="tel" value={num} onChange={e=>setNum(e.target.value)} placeholder="Phone number" inputMode="tel" /></div>
        <div className="field"><div className="field-lbl">Group</div>
          <select className="inp" value={grp} onChange={e=>setGrp(e.target.value)}>
            <option value="">None</option>
            {['Family','Work','Friends','Emergency','Other'].map(g=><option key={g}>{g}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={add}>Save Contact</button>
      </Sheet>
    </>
  )
}
