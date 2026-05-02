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

export default function LinksScreen({ toast }) {
  const [links, setLinks] = useState(() => store.getLinks())
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [cat, setCat] = useState('')

  function save(items) { setLinks(items); store.saveLinks(items) }
  function add() {
    if (!title.trim() || !url.trim()) { toast('Title and URL required'); return }
    let u = url.trim(); if (!u.startsWith('http')) u = 'https://' + u
    save([{ id: Date.now(), title: title.trim(), url: u, category: cat }, ...links])
    setTitle(''); setUrl(''); setCat(''); setOpen(false); toast('Link saved ✓')
  }
  function del(id) { save(links.filter(x=>x.id!==id)); toast('Removed') }

  const list = q ? links.filter(l => l.title.toLowerCase().includes(q.toLowerCase()) || l.url.toLowerCase().includes(q)) : links

  return (
    <>
      <div className="scroll">
        <div className="search-bar">
          <input className="search-inp" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search links…" />
        </div>
        {list.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔗</div><div className="empty-title">{q?'No results':'No links'}</div><div className="empty-sub">Tap + to save a link</div></div>
        ) : list.map(l => (
          <div key={l.id} className="link-card" onClick={()=>window.open(l.url,'_blank')}>
            <div style={{width:32,height:32,borderRadius:8,background:'var(--surface2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🔗</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.title}</div>
              <div style={{fontSize:11,color:'var(--text-faint)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:2}}>{l.url}</div>
            </div>
            {l.category && <span className="tag tag-violet">{l.category}</span>}
            <button className="btn btn-ghost btn-sm" style={{padding:'6px 9px'}} onClick={e=>{e.stopPropagation();del(l.id)}}>×</button>
          </div>
        ))}
      </div>
      <button className="fab" onClick={()=>setOpen(true)}>+</button>
      <Sheet open={open} onClose={()=>setOpen(false)}>
        <div className="sheet-title">Add Link</div>
        <div className="field"><div className="field-lbl">Title <span className="req">*</span></div><input className="inp" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Link title" /></div>
        <div className="field"><div className="field-lbl">URL <span className="req">*</span></div><input className="inp" type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://" inputMode="url" /></div>
        <div className="field"><div className="field-lbl">Category</div>
          <select className="inp" value={cat} onChange={e=>setCat(e.target.value)}>
            <option value="">None</option>
            {['Work','Reference','Shopping','News','Social','Other'].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={add}>Save Link</button>
      </Sheet>
    </>
  )
}
