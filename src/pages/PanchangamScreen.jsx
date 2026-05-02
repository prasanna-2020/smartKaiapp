import React, { useState, useMemo, useEffect, useRef } from 'react'

// ══ PANCHANG ENGINE ══
function jd(y,m,d){if(m<=2){y--;m+=12;}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+5.5/24+B-1524.5;}
function sL(j){const T=(j-2451545)/36525,L0=280.46646+36000.76983*T,M=(357.52911+35999.05029*T)*Math.PI/180,C=(1.914602-0.004817*T)*Math.sin(M)+(0.019993-0.000101*T)*Math.sin(2*M);return((L0+C)%360+360)%360;}
function mL(j){const T=(j-2451545)/36525,d_=(297.85036+445267.11148*T)*Math.PI/180,M=(357.52772+35999.05034*T)*Math.PI/180,Mp=(134.96298+477198.867398*T)*Math.PI/180;let S=6.288774*Math.sin(Mp)+1.274027*Math.sin(2*d_-Mp)+0.658314*Math.sin(2*d_)+0.213618*Math.sin(2*Mp)-0.185116*Math.sin(M)-0.114332*Math.sin(2*(93.27191+483202.017538*T)*Math.PI/180);return((218.3164477+481267.88123421*T+S)%360+360)%360;}

const NAKSH_TM=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீர்ஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','அஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி']
const NAKSH_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']
// Chandrastamam: nakshatra index 4 houses away from janma nakshatra (rashi-based, approximate by weekday)
// Per tradition: Chandrastamam nakshatra falls when Moon is in the 8th nakshatra from Janma nakshatra
// We compute it from Moon's position
const CHANDRA_SHTAMA_NAKSH=[2,3,5,6,9,10,12,13,16,17,20,21,24,25] // indices that are traditionally inauspicious for general action
const TITHI_TM=['பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி','ஷஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','பௌர்ணமி / அமாவாசை']
const YOGA_LIST=['Vishkambha','Preeti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarman','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti']
const TM_MONTHS=['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி']
const GM=['January','February','March','April','May','June','July','August','September','October','November','December']
const VAARAM=['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி']

// Rahu kalam slots (day part index, 1-based): Sun=8,Mon=2,Tue=7,Wed=5,Thu=6,Fri=4,Sat=3
const RAHU_SLOT  = [8,2,7,5,6,4,3]
// Gulika: Sun=6,Mon=7,Tue=1,Wed=3,Thu=4,Fri=2,Sat=5
const GULIKA_SLOT = [6,7,1,3,4,2,5]
// Yama: Sun=4,Mon=1,Tue=5,Wed=3,Thu=2,Fri=6,Sat=7
const YAMA_SLOT   = [4,1,5,3,2,6,7]

// Nalla neram (auspicious period) by weekday — morning, afternoon
const NALLA = {
  0: ['07:30–09:00', '16:30–18:00'],
  1: ['06:00–07:30', '13:30–15:00'],
  2: ['09:00–10:30', '18:00–19:30'],
  3: ['07:30–09:00', '12:00–13:30'],
  4: ['06:00–07:30', '15:00–16:30'],
  5: ['10:30–12:00', '16:30–18:00'],
  6: ['09:00–10:30', '15:00–16:30'],
}

function fmt(h) {
  const hh = Math.floor(h < 0 ? h + 24 : h)
  const mm = Math.round((h - Math.floor(h)) * 60)
  return String(hh).padStart(2,'0') + ':' + String(Math.min(mm,59)).padStart(2,'0')
}

function getSunriseSunset(j) {
  const lat=13.0827*Math.PI/180
  const T=(j-2451545)/36525
  const L0=(280.46646+36000.76983*T)%360
  const M=(357.52911+35999.05029*T)*Math.PI/180
  const C=(1.914602-0.004817*T)*Math.sin(M)
  const sl=(L0+C)*Math.PI/180
  const obl=(23.439291111-0.013004167*T)*Math.PI/180
  const dec=Math.asin(Math.sin(obl)*Math.sin(sl))
  const cosH=-Math.tan(lat)*Math.tan(dec)
  const H=Math.acos(Math.max(-1,Math.min(1,cosH)))*180/Math.PI
  const RA=Math.atan2(Math.cos(obl)*Math.sin(sl),Math.cos(sl))*180/Math.PI
  const eot=L0-0.0057183-RA+180*(Math.floor((L0-RA)/180))
  const transit=12+(80.2707/15)*(-1)-(eot/60)
  return { rH: transit-H/15, sH: transit+H/15, rise: fmt(transit-H/15), set: fmt(transit+H/15) }
}

function getSlot(slotArr, wd, rH, sH) {
  const dayLen = (sH - rH) / 8
  const s = slotArr[wd] - 1
  const st = rH + s * dayLen
  return { s: fmt(st), e: fmt(st + dayLen) }
}

function isChandrastamam(nIdx) {
  // Chandrastamam nakshatras (generally inauspicious for new beginnings)
  // These are: Krittika(2), Rohini(3), Ardra(5), Pushya(7), Magha(9), Uttara Phalguni(11),
  // Hasta(12), Anuradha(16), Jyeshtha(17), Uttara Ashadha(20), Shatabhisha(23), Uttara Bhadrapada(25)
  const chtm = [2, 3, 5, 7, 9, 11, 12, 16, 17, 20, 23, 25]
  return chtm.includes(nIdx)
}

function calcP(date) {
  const y=date.getFullYear(), mo=date.getMonth()+1, d=date.getDate(), wd=date.getDay()
  const j = jd(y, mo, d)
  const sl_ = sL(j), ml_ = mL(j)
  const elong = ((ml_ - sl_) % 360 + 360) % 360
  const tNum = Math.floor(elong / 12) % 15
  const paksha = Math.floor(elong / 12) < 15 ? 'சுக்ல பக்ஷம் (Shukla)' : 'கிருஷ்ண பக்ஷம் (Krishna)'
  const nIdx = Math.floor(ml_ / 13.3333) % 27
  const sun = getSunriseSunset(j)
  const rahu   = getSlot(RAHU_SLOT,   wd, sun.rH, sun.sH)
  const gulika = getSlot(GULIKA_SLOT, wd, sun.rH, sun.sH)
  const yama   = getSlot(YAMA_SLOT,   wd, sun.rH, sun.sH)
  const abh_s  = (sun.rH + sun.sH) / 2 - 0.4
  const brahma_s = sun.rH - 1.6
  const chandrastamam = isChandrastamam(nIdx)

  const specials = []
  if (tNum === 10) specials.push({ name:'Ekadasi',   tm:'ஏகாதசி',   icon:'🙏', color:'#6366f1' })
  if (tNum === 4)  specials.push({ name:'Panchami',   tm:'பஞ்சமி',   icon:'⭐', color:'#10b981' })
  if (nIdx === 2)  specials.push({ name:'Krittikai',  tm:'கார்த்திகை',icon:'🔥', color:'#f97316' })
  if (tNum === 12) specials.push({ name:'Pradosham',  tm:'பிரதோஷம்', icon:'✨', color:'#ec4899' })
  if (tNum === 14) {
    if (Math.floor(elong/12) < 15) specials.push({ name:'Pournami', tm:'பௌர்ணமி', icon:'🌕', color:'#f59e0b' })
    else specials.push({ name:'Amavasai', tm:'அமாவாசை', icon:'🌑', color:'#8b5cf6' })
  }

  return {
    date, wd, vaaram: VAARAM[wd],
    tithi: { num: tNum+1, tm: TITHI_TM[tNum], paksha },
    nakshatra: { tm: NAKSH_TM[nIdx], en: NAKSH_EN[nIdx], idx: nIdx },
    yoga: YOGA_LIST[Math.floor((sl_+ml_)%360/13.3333)%27],
    sunrise: sun.rise, sunset: sun.set, rH: sun.rH, sH: sun.sH,
    rahu, gulika, yama,
    abhijit: { s: fmt(abh_s), e: fmt(abh_s+0.8) },
    brahma:  { s: fmt(brahma_s), e: fmt(brahma_s+0.8) },
    nalla: NALLA[wd] || [],
    chandrastamam,
    specials,
    tmMonth: TM_MONTHS[Math.floor(sl_/30)%12]
  }
}

const pcache = {}
function getP(date) {
  const k = date.toISOString().split('T')[0]
  if (!pcache[k]) pcache[k] = calcP(date)
  return pcache[k]
}

// ══ REMINDER SYSTEM ══
function loadReminders(dateKey) {
  try {
    const dt = JSON.parse(localStorage.getItem('dailytracker_v4') || '{}')
    return dt[dateKey]?.reminders || []
  } catch { return [] }
}
function saveReminder(dateKey, rem) {
  try {
    const dt = JSON.parse(localStorage.getItem('dailytracker_v4') || '{}')
    if (!dt[dateKey]) dt[dateKey] = { todos:[], reminders:[] }
    dt[dateKey].reminders = [rem, ...dt[dateKey].reminders]
    localStorage.setItem('dailytracker_v4', JSON.stringify(dt))
    return true
  } catch { return false }
}
function checkAndFireReminders() {
  const now = new Date()
  const key = now.toISOString().split('T')[0]
  const rems = loadReminders(key)
  rems.filter(r => !r.done && !r.fired).forEach(r => {
    const t = new Date(r.time)
    const diff = Math.abs(t - now)
    if (diff < 60000) { // within 1 minute
      if (window.Notification && Notification.permission === 'granted') {
        new Notification('🔔 SmartKai Reminder', { body: r.text, icon: '/favicon.ico' })
      }
      // Mark as fired
      try {
        const dt = JSON.parse(localStorage.getItem('dailytracker_v4') || '{}')
        const rem = (dt[key]?.reminders || []).find(x => x.id === r.id)
        if (rem) rem.fired = true
        localStorage.setItem('dailytracker_v4', JSON.stringify(dt))
      } catch {}
    }
  })
}

// ══ CALENDAR DAY CELL ══
function CalCell({ date, today, onSelect }) {
  const p = getP(date)
  const isToday = date.toDateString() === today.toDateString()
  const sp = p.specials[0]
  const wd = date.getDay()
  return (
    <div
      onClick={() => onSelect(date)}
      style={{
        minHeight: 64, minWidth: 0, background: 'var(--surface2)',
        borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        padding: '3px 2px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1,
        outline: isToday ? '2px solid var(--amber)' : 'none', outlineOffset: -1,
        overflow: 'hidden', width: '100%'
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', minWidth:0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: wd===0?'var(--rose)':wd===6?'var(--sky)':'var(--text)', lineHeight:1, flexShrink:0 }}>{date.getDate()}</span>
        <span style={{ fontSize: 8, color: 'var(--amber)', fontFamily: 'var(--mono)', fontWeight: 700, flexShrink:0 }}>{p.tithi.num}</span>
      </div>
      <div style={{ fontSize: 7, color: 'var(--violet-l)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.2 }}>{p.nakshatra.tm.slice(0,4)}</div>
      {sp && (
        <div style={{ fontSize: 6, background: `${sp.color}25`, color: sp.color, border: `1px solid ${sp.color}50`, borderRadius: 2, padding: '0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.4 }}>
          {sp.icon}{sp.tm.slice(0,4)}
        </div>
      )}
    </div>
  )
}

// ══ TIMING ROW ══
function TimeRow({ label, time, good, sub }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'9px 11px',
      background: good ? 'var(--emerald-soft)' : 'rgba(244,63,94,0.07)',
      border: `1px solid ${good ? 'rgba(16,185,129,.18)' : 'rgba(244,63,94,.18)'}`,
      borderRadius: 9, marginBottom: 6
    }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background: good?'var(--emerald)':'var(--rose)', flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:'var(--text-faint)', marginTop:1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize:12, fontFamily:'var(--mono)', color: good?'var(--emerald)':'var(--rose)', fontWeight:600, flexShrink:0 }}>{time}</div>
    </div>
  )
}

// ══ MAIN COMPONENT ══
export default function PanchangamScreen() {
  const today = useMemo(() => new Date(), [])
  const [view, setView] = useState('month')
  const [calDate, setCalDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [dayDate, setDayDate] = useState(today)
  const [remText, setRemText] = useState('')
  const [remTime, setRemTime] = useState('')
  const [reminders, setReminders] = useState([])
  const [notifPerm, setNotifPerm] = useState(() => window.Notification?.permission || 'default')
  const intervalRef = useRef(null)

  const p = getP(dayDate)
  const dayKey = dayDate.toISOString().split('T')[0]

  // Load reminders for selected day
  useEffect(() => {
    setReminders(loadReminders(dayKey))
  }, [dayKey])

  // Check reminders every 30 seconds + on mount
  useEffect(() => {
    checkAndFireReminders()  // check immediately on load
    intervalRef.current = setInterval(checkAndFireReminders, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  async function requestNotif() {
    if (!window.Notification) return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }

  function addReminder() {
    if (!remText.trim()) { alert('Enter reminder text'); return }
    if (!remTime) { alert('Select a time'); return }
    const isoTime = `${dayKey}T${remTime}:00`
    const rem = { id: Date.now(), text: remText.trim(), time: isoTime, done: false, fired: false }
    saveReminder(dayKey, rem)
    setReminders(loadReminders(dayKey))
    setRemText('')
    setRemTime('')
  }

  function toggleRemDone(id) {
    try {
      const dt = JSON.parse(localStorage.getItem('dailytracker_v4') || '{}')
      const rem = (dt[dayKey]?.reminders || []).find(r => r.id === id)
      if (rem) rem.done = !rem.done
      localStorage.setItem('dailytracker_v4', JSON.stringify(dt))
      setReminders(loadReminders(dayKey))
    } catch {}
  }

  function deleteRem(id) {
    try {
      const dt = JSON.parse(localStorage.getItem('dailytracker_v4') || '{}')
      if (dt[dayKey]?.reminders) dt[dayKey].reminders = dt[dayKey].reminders.filter(r => r.id !== id)
      localStorage.setItem('dailytracker_v4', JSON.stringify(dt))
      setReminders(loadReminders(dayKey))
    } catch {}
  }

  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1).getDay()
  const daysInMonth = new Date(calDate.getFullYear(), calDate.getMonth()+1, 0).getDate()

  // ── RENDER ──
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      {/* View tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
        {[['month','📅 Month'],['day','☀️ Day'],['panch','🪔 Panchang']].map(([v,lbl]) => (
          <button key={v} onClick={() => setView(v)} style={{
            flex:1, padding:'10px 4px', border:'none', background: view===v ? 'var(--surface2)' : 'transparent',
            color: view===v ? 'var(--amber)' : 'var(--text-faint)', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'var(--font)', borderBottom: view===v ? '2px solid var(--amber)' : '2px solid transparent'
          }}>{lbl}</button>
        ))}
      </div>

      <div className="scroll" style={{ paddingTop: 14 }}>

        {/* ══ MONTH VIEW ══ */}
        {view === 'month' && (
          <>
            {/* Nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--amber)' }}>
                  {getP(new Date(calDate.getFullYear(), calDate.getMonth(), 15)).tmMonth}
                </div>
                <div style={{ fontSize:11, color:'var(--text-dim)' }}>{GM[calDate.getMonth()]} {calDate.getFullYear()}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
            </div>

            {/* DOW header */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'8px 8px 0 0', borderBottom:'none' }}>
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d,i) => (
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color: i===0?'var(--rose)':i===6?'var(--sky)':'var(--text-faint)', padding:'5px 0', fontFamily:'var(--mono)' }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', border:'1px solid var(--border)', borderRadius:'0 0 8px 8px', overflow:'hidden', marginBottom:8 }}>
              {Array.from({length:firstDay}).map((_,i) => (
                <div key={`e${i}`} style={{ minHeight:68, background:'var(--bg)', opacity:.2 }} />
              ))}
              {Array.from({length:daysInMonth}).map((_,i) => {
                const d = new Date(calDate.getFullYear(), calDate.getMonth(), i+1)
                return <CalCell key={i} date={d} today={today} onSelect={d => { setDayDate(d); setView('day') }} />
              })}
            </div>

            <div style={{ fontSize:10, color:'var(--text-faint)', display:'flex', gap:10, flexWrap:'wrap' }}>
              <span>Date | Tithi # top-right</span>
              <span>· Nakshatra below</span>
              <span>· Rahu kalam</span>
              <span style={{ color:'var(--amber)' }}>· 🙏 Auspicious day</span>
            </div>
          </>
        )}

        {/* ══ DAY VIEW ══ */}
        {view === 'day' && (
          <>
            {/* Nav */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { const d=new Date(dayDate); d.setDate(d.getDate()-1); setDayDate(d) }}>‹</button>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:52, fontWeight:900, lineHeight:1, fontFamily:'var(--mono)', color: dayDate.getDay()===0?'var(--rose)':dayDate.getDay()===6?'var(--sky)':'var(--rose)' }}>
                  {dayDate.getDate()}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{GM[dayDate.getMonth()]} {dayDate.getFullYear()}</div>
                  <div style={{ fontSize:12, color:'var(--text-dim)', marginTop:2 }}>{p.vaaram} · {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayDate.getDay()]}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { const d=new Date(dayDate); d.setDate(d.getDate()+1); setDayDate(d) }}>›</button>
            </div>

            <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginBottom:12 }} onClick={() => setDayDate(today)}>Today</button>

            {/* Tamil date */}
            <div style={{ background:'var(--amber-soft)', border:'1px solid rgba(217,119,6,.25)', borderRadius:9, padding:'8px 12px', marginBottom:10, fontSize:13, color:'var(--amber)', fontWeight:500 }}>
              {p.tmMonth} {p.tithi.num} · {p.tithi.paksha}
            </div>

            {/* Specials */}
            {p.specials.map(s => (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:10, background:`${s.color}18`, border:`1px solid ${s.color}40`, borderRadius:9, padding:'10px 12px', marginBottom:8, fontSize:14, fontWeight:500, color:s.color }}>
                {s.icon} <strong>{s.name}</strong> · {s.tm}
              </div>
            ))}

            {/* Chandrastamam banner — replaces top நல்ல நேரம் as requested */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background: p.chandrastamam?'rgba(244,63,94,.08)':'rgba(16,185,129,.08)', border:`1px solid ${p.chandrastamam?'rgba(244,63,94,.2)':'rgba(16,185,129,.2)'}`, borderRadius:9, padding:'9px 12px', marginBottom:12 }}>
              <span style={{ fontSize:16 }}>{p.chandrastamam?'⚠️':'✅'}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color: p.chandrastamam?'var(--rose)':'var(--emerald)' }}>
                  சந்திராஷ்டமம் (Chandrastamam) — {p.chandrastamam?'Today':'Not today'}
                </div>
                <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:1 }}>
                  Moon in {p.nakshatra.tm} ({p.nakshatra.en}) · {p.chandrastamam?'Avoid new beginnings':'Favourable for new work'}
                </div>
              </div>
            </div>

            {/* Panchang grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
              {[
                ['தீதி (Tithi)', p.tithi.tm],
                ['நட்சத்திரம்', `${p.nakshatra.tm} (${p.nakshatra.en})`],
                ['யோகம் (Yoga)', p.yoga],
                ['சூரிய உதயம்', `🌅 ${p.sunrise}`],
                ['சூரிய அஸ்தமனம்', `🌇 ${p.sunset}`],
                ['வாரம்', p.vaaram],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500, lineHeight:1.4 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Timings — ORDER: பிரம்ம, நல்ல நேரம், குளிகை (good) then ராகு, யமகண்டம் (bad) */}
            <div style={{ fontSize:10, color:'var(--emerald)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', marginBottom:8 }}>✅ Auspicious Times</div>
            <TimeRow label="பிரம்ம முஹூர்த்தம்" time={`${p.brahma.s} – ${p.brahma.e}`} good={true} sub="Best for spiritual practice & study" />
            {p.nalla.map((n,i) => (
              <TimeRow key={i} label="நல்ல நேரம்" time={n} good={true} sub={i===0?'Morning auspicious period':'Evening auspicious period'} />
            ))}
            <TimeRow label="குளிகை காலம்" time={`${p.gulika.s} – ${p.gulika.e}`} good={true} sub="Mildly auspicious" />

            <div style={{ fontSize:10, color:'var(--rose)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', margin:'10px 0 8px' }}>⛔ Inauspicious Times</div>
            <TimeRow label="ராகு காலம்" time={`${p.rahu.s} – ${p.rahu.e}`} good={false} sub="Avoid important activities" />
            <TimeRow label="யமகண்டம்" time={`${p.yama.s} – ${p.yama.e}`} good={false} sub="Avoid auspicious ceremonies" />

            {/* Set Reminder */}
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:14, marginTop:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>🔔 Set Reminder for {dayDate.toLocaleDateString('en-IN',{weekday:'short',month:'short',day:'numeric'})}</div>

              {/* Notification permission */}
              {notifPerm !== 'granted' && (
                <div style={{ background:'var(--amber-soft)', border:'1px solid rgba(245,158,11,.2)', borderRadius:8, padding:'8px 11px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <span style={{ fontSize:12, color:'var(--amber)' }}>Enable notifications for reminders</span>
                  <button className="btn btn-sm" style={{ background:'var(--amber)', border:'none', color:'#000', padding:'5px 10px', fontSize:11 }} onClick={requestNotif}>Enable</button>
                </div>
              )}

              <input
                className="inp"
                value={remText}
                onChange={e => setRemText(e.target.value)}
                placeholder="Reminder text…"
                style={{ marginBottom:8 }}
                onKeyDown={e => e.key==='Enter' && addReminder()}
              />
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input
                  className="inp"
                  type="time"
                  value={remTime}
                  onChange={e => setRemTime(e.target.value)}
                  style={{ flex:1, minHeight:44, fontSize:16, colorScheme:'dark' }}
                />
                <button className="btn btn-primary" style={{ flexShrink:0 }} onClick={addReminder}>+ Add</button>
              </div>

              {/* Saved reminders for this day */}
              {reminders.length > 0 && (
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
                  <div style={{ fontSize:11, color:'var(--text-faint)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Reminders for this day</div>
                  {reminders.map(r => {
                    const t = new Date(r.time)
                    const timeStr = t.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true })
                    return (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, marginBottom:6, opacity: r.done?0.5:1 }}>
                        <div
                          onClick={() => toggleRemDone(r.id)}
                          style={{ width:18, height:18, borderRadius:5, border:`2px solid ${r.done?'var(--emerald)':'var(--border2)'}`, background:r.done?'var(--emerald)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, fontSize:10, color:'#fff' }}
                        >{r.done?'✓':''}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, textDecoration:r.done?'line-through':'none' }}>{r.text}</div>
                          <div style={{ fontSize:11, color:'var(--sky)', fontFamily:'var(--mono)', marginTop:2 }}>🕐 {timeStr}</div>
                        </div>
                        <button onClick={() => deleteRem(r.id)} style={{ background:'none', border:'none', color:'var(--rose)', fontSize:16, cursor:'pointer', padding:2 }}>×</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ FULL PANCHANG VIEW ══ */}
        {view === 'panch' && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:16 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--amber)', marginBottom:4 }}>🪔 Tamil Panchangam</div>
            <div style={{ fontSize:12, color:'var(--text-faint)', marginBottom:14 }}>
              {dayDate.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
            {/* Specials */}
            {p.specials.map(s => (
              <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8, background:`${s.color}18`, border:`1px solid ${s.color}40`, borderRadius:8, padding:'9px 12px', marginBottom:8, fontSize:13, color:s.color }}>
                {s.icon} <strong>{s.name} · {s.tm}</strong>
              </div>
            ))}
            {/* Chandrastamam */}
            <div style={{ display:'flex', alignItems:'center', gap:8, background: p.chandrastamam?'var(--rose-soft)':'var(--emerald-soft)', border:`1px solid ${p.chandrastamam?'rgba(244,63,94,.2)':'rgba(16,185,129,.2)'}`, borderRadius:8, padding:'9px 12px', marginBottom:12, fontSize:13, color: p.chandrastamam?'var(--rose)':'var(--emerald)' }}>
              {p.chandrastamam?'⚠️':'✅'} <strong>சந்திராஷ்டமம் — {p.chandrastamam?'Yes (avoid new starts)':'No (favourable)'}</strong>
            </div>
            {/* Panchang grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[['தீதி',`${p.tithi.tm}`],['நட்சத்திரம்',`${p.nakshatra.tm}`],['யோகம்',p.yoga],['பக்ஷம்',p.tithi.paksha],['வாரம்',p.vaaram],['சூரிய உதயம்',`🌅 ${p.sunrise}`],['அஸ்தமனம்',`🌇 ${p.sunset}`],['நட்சத்திரம் (EN)',p.nakshatra.en]].map(([k,v]) => (
                <div key={k} style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:9, padding:'10px 12px' }}>
                  <div style={{ fontSize:9, color:'var(--text-faint)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Timings in correct order */}
            <div style={{ fontSize:10, color:'var(--emerald)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', marginBottom:8 }}>✅ Auspicious</div>
            <TimeRow label="பிரம்ம முஹூர்த்தம்" time={`${p.brahma.s} – ${p.brahma.e}`} good={true} sub="Best for spiritual practice" />
            {p.nalla.map((n,i) => <TimeRow key={i} label="நல்ல நேரம்" time={n} good={true} sub={i===0?'Morning':'Evening'} />)}
            <TimeRow label="குளிகை காலம்" time={`${p.gulika.s} – ${p.gulika.e}`} good={true} sub="Mildly auspicious" />
            <div style={{ fontSize:10, color:'var(--rose)', textTransform:'uppercase', letterSpacing:.5, fontFamily:'var(--mono)', margin:'10px 0 8px' }}>⛔ Inauspicious</div>
            <TimeRow label="ராகு காலம்" time={`${p.rahu.s} – ${p.rahu.e}`} good={false} sub="Avoid important work" />
            <TimeRow label="யமகண்டம்" time={`${p.yama.s} – ${p.yama.e}`} good={false} sub="Avoid ceremonies" />
          </div>
        )}
      </div>
    </div>
  )
}
