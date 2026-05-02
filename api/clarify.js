// /api/clarify.js — v3
// Rule-based first (fast, accurate), Groq only for edge cases
// Key principle: NEVER ask for something user already mentioned

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Query required' })

  const { query } = req.body || {}
  if (!query) return res.status(400).json({ error: 'Query required' })

  const q = query.toLowerCase().trim()
  const groqKey = process.env.GROQ_API_KEY

  // ── STEP 1: Extract what user already told us ──────────────────
  const known = extractKnown(q, query)

  // ── STEP 2: Detect category ───────────────────────────────────
  const category = detectCategory(q)

  // ── STEP 3: Use Groq to intelligently pick questions ─────────
  // Pass known facts so it NEVER asks about them
  if (groqKey) {
    try {
      const result = await askGroq(query, q, known, category, groqKey)
      return res.status(200).json(result)
    } catch (e) {
      console.error('Groq failed, using rule fallback:', e.message)
    }
  }

  // ── Fallback: rule-based questions ───────────────────────────
  return res.status(200).json(buildRuleBased(query, q, known, category))
}

// ─────────────────────────────────────────────────────────────────
// Extract what user already told us from the query text
// ─────────────────────────────────────────────────────────────────
function extractKnown(q, original) {
  const known = {}

  // Brand detection
  const BRANDS = {
    // Grocery/Dairy
    akshayakalpa:{ brand:'Akshayakalpa', organic:true, category:'grocery' },
    amul:        { brand:'Amul', category:'grocery' },
    nandini:     { brand:'Nandini', category:'grocery' },
    aavin:       { brand:'Aavin', category:'grocery' },
    nestle:      { brand:'Nestle' },
    britannia:   { brand:'Britannia', category:'grocery' },
    // Footwear/Clothing
    nike:        { brand:'Nike', category:'fashion' },
    adidas:      { brand:'Adidas', category:'fashion' },
    puma:        { brand:'Puma', category:'fashion' },
    reebok:      { brand:'Reebok', category:'fashion' },
    skechers:    { brand:'Skechers', category:'fashion' },
    bata:        { brand:'Bata', category:'fashion' },
    woodland:    { brand:'Woodland', category:'fashion' },
    // Electronics
    samsung:     { brand:'Samsung', category:'electronics' },
    apple:       { brand:'Apple', category:'electronics' },
    oneplus:     { brand:'OnePlus', category:'electronics' },
    redmi:       { brand:'Redmi', category:'electronics' },
    realme:      { brand:'Realme', category:'electronics' },
    oppo:        { brand:'Oppo', category:'electronics' },
    vivo:        { brand:'Vivo', category:'electronics' },
    boAt:        { brand:'boAt', category:'electronics' },
    jbl:         { brand:'JBL', category:'electronics' },
    sony:        { brand:'Sony', category:'electronics' },
    lg:          { brand:'LG', category:'electronics' },
    dell:        { brand:'Dell', category:'electronics' },
    hp:          { brand:'HP', category:'electronics' },
    lenovo:      { brand:'Lenovo', category:'electronics' },
    asus:        { brand:'Asus', category:'electronics' },
    // Home
    prestige:    { brand:'Prestige', category:'home_kitchen' },
    preethi:     { brand:'Preethi', category:'home_kitchen' },
    bajaj:       { brand:'Bajaj', category:'appliances' },
    philips:     { brand:'Philips', category:'home_kitchen' },
    bosch:       { brand:'Bosch', category:'home_kitchen' },
    havells:     { brand:'Havells', category:'appliances' },
    // Pharma
    himalaya:    { brand:'Himalaya', category:'medicine' },
    dabur:       { brand:'Dabur', category:'medicine' },
  }

  for (const [key, val] of Object.entries(BRANDS)) {
    if (q.includes(key)) {
      known.brand = val.brand
      if (val.organic) known.organic = true
      if (val.category) known.suggested_category = val.category
      break
    }
  }

  // Size detection — numeric sizes like "500ml", "1l", "1ltr", "1litre", "size 9", "uk 8"
  const mlMatch = q.match(/(\d+)\s*ml/)
  if (mlMatch) known.quantity = mlMatch[1] + 'ml'
  const ltrMatch = q.match(/(\d+)\s*(l|ltr|litre|liter)\b/)
  if (ltrMatch) known.quantity = ltrMatch[1] + 'L'
  const kgMatch = q.match(/(\d+\.?\d*)\s*kg/)
  if (kgMatch) known.quantity = kgMatch[1] + 'kg'
  const gMatch = q.match(/(\d+)\s*g\b/)
  if (gMatch) known.quantity = gMatch[1] + 'g'

  // Shoe/clothing size
  const sizeMatch = q.match(/(?:size|uk|us|eu)\s*(\d+)/i)
  if (sizeMatch) known.size = 'UK ' + sizeMatch[1]
  const clothSizeMatch = q.match(/\b(xs|small|medium|large|xl|xxl|2xl|3xl)\b/i)
  if (clothSizeMatch) known.size = clothSizeMatch[1].toUpperCase()

  // Gender
  if (/\b(men|man|male|boys|gents)\b/.test(q)) known.gender = 'Men'
  else if (/\b(women|woman|female|ladies|girls)\b/.test(q)) known.gender = 'Women'
  else if (/\b(kids|child|children|baby|toddler)\b/.test(q)) known.gender = 'Kids'
  else if (/\bunisex\b/.test(q)) known.gender = 'Unisex'

  // Occasion / activity (for shoes, clothing, sports)
  if (/\b(running|jogging|marathon|trail run)\b/.test(q)) known.occasion = 'Running'
  else if (/\b(training|gym|workout|exercise)\b/.test(q)) known.occasion = 'Gym/Training'
  else if (/\b(casual|daily|everyday)\b/.test(q)) known.occasion = 'Casual'
  else if (/\b(formal|office|work)\b/.test(q)) known.occasion = 'Formal'
  else if (/\b(football|cricket|tennis|badminton|basketball)\b/.test(q)) known.occasion = q.match(/\b(football|cricket|tennis|badminton|basketball)\b/)[1]

  // Color
  const colorMatch = q.match(/\b(black|white|red|blue|green|grey|gray|brown|navy|beige|pink|yellow|orange|purple)\b/)
  if (colorMatch) known.color = colorMatch[1]

  // Budget hints from model name (e.g. "Adidas Runfalcon" is ₹3000+)
  const PRICE_HINTS = {
    'runfalcon': { min: 2500, max: 4500 },
    'ultraboost': { min: 12000, max: 20000 },
    'air max': { min: 6000, max: 15000 },
    'pegasus': { min: 8000, max: 12000 },
    'iphone': { min: 30000, max: 150000 },
    'galaxy s': { min: 40000, max: 130000 },
    'macbook': { min: 80000, max: 200000 },
  }
  for (const [model, hint] of Object.entries(PRICE_HINTS)) {
    if (q.includes(model)) {
      known.price_hint = `₹${(hint.min/1000).toFixed(0)}K–₹${(hint.max/1000).toFixed(0)}K range`
      known.budget_skip = true // Don't ask budget — we know it
      break
    }
  }

  // Organic — Akshayakalpa is always organic
  if (known.organic) known.organic_known = true

  return known
}

// ─────────────────────────────────────────────────────────────────
// Detect product category from query
// ─────────────────────────────────────────────────────────────────
function detectCategory(q) {
  // Grocery / dairy / food
  if (/\b(milk|butter|ghee|paneer|curd|yogurt|cheese|cream|dahi|lassi|ice cream)\b/.test(q)) return 'grocery'
  if (/\b(rice|dal|flour|atta|oil|sugar|salt|spice|masala|tea|coffee|biscuit|snack|chocolate|juice|cold drink|water|egg|chicken|mutton|fish|vegetable|fruit|onion|tomato|potato)\b/.test(q)) return 'grocery'
  if (/\b(organic|natural food|grocery|staple)\b/.test(q)) return 'grocery'

  // Electronics
  if (/\b(phone|mobile|smartphone|iphone|galaxy|laptop|notebook|computer|pc|tablet|ipad|tv|television|monitor|headphone|earphone|earbuds|speaker|camera|smartwatch|watch|charger|powerbank|router|printer|keyboard|mouse)\b/.test(q)) return 'electronics'

  // Fashion / clothing / footwear
  if (/\b(shoe|sneaker|boot|sandal|slipper|chappal|heel|loafer|moccasin|running shoe|sports shoe)\b/.test(q)) return 'fashion'
  if (/\b(shirt|tshirt|t-shirt|top|kurta|kurti|saree|sari|dress|jeans|trouser|pant|shorts|skirt|jacket|hoodie|sweater|coat|suit|blazer|lehenga|dupatta)\b/.test(q)) return 'fashion'
  if (/\b(bag|purse|handbag|clutch|wallet|backpack|sling bag|tote)\b/.test(q)) return 'fashion'

  // Beauty
  if (/\b(face wash|cleanser|toner|serum|moisturiser|moisturizer|sunscreen|spf|lipstick|foundation|kajal|mascara|eyeliner|blush|makeup|shampoo|conditioner|hair oil|hair mask|perfume|deodorant|deo|body lotion|body wash|soap|face pack|skin care|skincare|hair care)\b/.test(q)) return 'beauty'

  // Medicine & Wellness
  if (/\b(medicine|tablet|capsule|syrup|drops|cream|ointment|strip|vitamin|supplement|protein powder|whey|probiotic|omega|antibiotic|paracetamol|dolo|crocin|combiflam|antacid|inhaler|bandage|thermometer|bp monitor|glucometer)\b/.test(q)) return 'medicine'

  // Home & Kitchen / Home decor
  if (/\b(wall clock|clock|photo frame|picture frame|mirror|vase|candle|lamp|light|led|bulb|curtain|cushion|pillow|bedsheet|duvet|towel|mat|rug|carpet|wall decor|decoration|indoor plant|flower pot)\b/.test(q)) return 'home_kitchen'
  if (/\b(pressure cooker|cooker|pan|kadai|tawa|fry pan|vessel|utensil|knife|chopper|plate|bowl|glass|bottle|flask|lunch box|container|mixer|grinder|juicer|toaster|kettle|induction|gas stove)\b/.test(q)) return 'home_kitchen'

  // Appliances
  if (/\b(washing machine|refrigerator|fridge|ac|air conditioner|fan|cooler|water heater|geyser|microwave|oven|dishwasher|vacuum cleaner|air purifier|water purifier|ro)\b/.test(q)) return 'appliances'

  // Sports & Fitness
  if (/\b(dumbbell|barbell|gym equipment|yoga mat|treadmill|cycle|bicycle|resistance band|protein|creatine|sports jersey|cricket bat|football|tennis racket|badminton|swimming)\b/.test(q)) return 'sports'

  // Baby
  if (/\b(diaper|nappy|baby wipe|baby food|formula milk|baby lotion|baby shampoo|stroller|pram|baby carrier|feeding bottle|pacifier|teether|baby toy|baby clothes|romper)\b/.test(q)) return 'baby'

  // Furniture
  if (/\b(sofa|couch|bed|cot|mattress|pillow|table|dining table|coffee table|chair|office chair|wardrobe|almirah|cupboard|bookshelf|bookcase|TV unit|cabinet|drawer|rack|shelf)\b/.test(q)) return 'furniture'

  // Automotive
  if (/\b(car|bike|motorcycle|tyre|tire|engine oil|brake pad|battery|headlight|car cover|car mat|car seat|helmet|horn|wiper)\b/.test(q)) return 'automotive'

  // Toys
  if (/\b(toy|lego|puzzle|doll|action figure|board game|video game|playstation|xbox|nintendo|game console|remote control car|rc car|building blocks|clay)\b/.test(q)) return 'toys'

  // Pet
  if (/\b(dog food|cat food|pet food|dog collar|leash|cat litter|aquarium|fish food|bird cage|pet toy|pet bed|pet shampoo)\b/.test(q)) return 'pet'

  // Books
  if (/\b(book|novel|textbook|ncert|rd sharma|rs aggarwal|syllabus book|workbook|storybook|comic|magazine)\b/.test(q)) return 'books'

  // Jewellery
  if (/\b(necklace|ring|earring|bracelet|bangle|anklet|mangalsutra|chain|pendant|jewellery|jewelry|gold|silver|diamond)\b/.test(q)) return 'jewellery'

  // Travel
  if (/\b(suitcase|luggage|trolley bag|travel bag|passport cover|travel pillow|packing cube)\b/.test(q)) return 'travel'

  // Stationery
  if (/\b(pen|pencil|notebook|diary|sticky note|stapler|file folder|highlighter|marker|eraser|geometry box|calculator)\b/.test(q)) return 'stationery'

  // Gardening
  if (/\b(seed|soil|fertiliser|fertilizer|plant food|pot|planter|garden tool|watering can|garden hose|compost|cocopeat)\b/.test(q)) return 'gardening'

  return 'other'
}

// ─────────────────────────────────────────────────────────────────
// Platform map — PRODUCT-TYPE aware
// Only show platforms that actually sell this category
// ─────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  grocery:      { label:'Grocery',             icon:'🛒', platforms:['Zepto','Blinkit','Swiggy Instamart','BigBasket'] },
  electronics:  { label:'Electronics',         icon:'📱', platforms:['Amazon','Flipkart','Croma','Reliance Digital'] },
  fashion:      { label:'Fashion & Footwear',  icon:'👟', platforms:['Myntra','Amazon','Flipkart','Meesho'] },
  beauty:       { label:'Beauty',              icon:'💄', platforms:['Nykaa','Amazon','Flipkart','Purplle'] },
  medicine:     { label:'Medicine & Wellness', icon:'💊', platforms:['PharmEasy','1mg','Netmeds','Apollo Pharmacy'] },
  home_kitchen: { label:'Home & Kitchen',      icon:'🏠', platforms:['Amazon','Flipkart','Pepperfry','IKEA'] },
  appliances:   { label:'Appliances',          icon:'🔌', platforms:['Amazon','Flipkart','Croma','Reliance Digital'] },
  sports:       { label:'Sports & Fitness',    icon:'🏃', platforms:['Amazon','Flipkart','Decathlon','Myntra'] },
  baby:         { label:'Baby Products',       icon:'👶', platforms:['Amazon','Flipkart','FirstCry','Myntra'] },
  furniture:    { label:'Furniture',           icon:'🪑', platforms:['Amazon','Flipkart','Pepperfry','Urban Ladder'] },
  automotive:   { label:'Automotive',          icon:'🚗', platforms:['Amazon','Flipkart','AutoZone'] },
  toys:         { label:'Toys & Games',        icon:'🎮', platforms:['Amazon','Flipkart','FirstCry'] },
  pet:          { label:'Pet Supplies',        icon:'🐾', platforms:['Amazon','Flipkart','Heads Up For Tails'] },
  books:        { label:'Books',               icon:'📚', platforms:['Amazon','Flipkart'] },
  jewellery:    { label:'Jewellery',           icon:'💍', platforms:['Amazon','Flipkart','Tanishq','Myntra'] },
  travel:       { label:'Travel & Luggage',    icon:'🧳', platforms:['Amazon','Flipkart','Myntra'] },
  stationery:   { label:'Stationery',          icon:'✏️', platforms:['Amazon','Flipkart'] },
  gardening:    { label:'Gardening',           icon:'🌱', platforms:['Amazon','Flipkart','Ugaoo'] },
  other:        { label:'Other',               icon:'📦', platforms:['Amazon','Flipkart','Meesho'] },
}

// ─────────────────────────────────────────────────────────────────
// Groq: figure out which 2-3 questions to ask
// ─────────────────────────────────────────────────────────────────
async function askGroq(original, q, known, category, groqKey) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  const knownSummary = Object.entries(known)
    .filter(([k]) => !['suggested_category','budget_skip','organic_known'].includes(k))
    .map(([k,v]) => `${k}: ${v}`).join(', ')

  // Category question areas from Excel
  const AREA_MAP = {
    grocery:     ['Quantity/Pack size', 'Delivery urgency', 'Dietary preference'],
    electronics: ['Main usage purpose', 'Budget range', 'Feature priority', 'Portability preference'],
    fashion:     ['Size', 'Gender', 'Color preference', 'Fit type', 'Budget range'],
    beauty:      ['Skin type', 'Main concern', 'Ingredient preference', 'Budget range'],
    medicine:    ['Purpose/usage', 'Age group', 'Pack size', 'Prescription availability'],
    home_kitchen:['Brand preference', 'Budget range', 'Room type / usage', 'Family size'],
    appliances:  ['Capacity requirement', 'Energy efficiency', 'Budget range', 'Brand preference'],
    sports:      ['Fitness goal', 'Activity type', 'Experience level', 'Budget range'],
    baby:        ['Baby age group', 'Skin sensitivity', 'Quantity'],
    furniture:   ['Room type', 'Material preference', 'Budget range', 'Space size'],
    automotive:  ['Vehicle brand/model', 'Fuel type', 'Budget range'],
    toys:        ['Child age group', 'Play type', 'Budget range'],
    pet:         ['Pet type', 'Pet age', 'Dietary preference'],
    books:       ['Genre', 'Age group', 'Format preference'],
    jewellery:   ['Occasion', 'Material preference', 'Budget range'],
    travel:      ['Trip type', 'Capacity', 'Budget range'],
    stationery:  ['Usage purpose', 'Quantity', 'Brand preference'],
    gardening:   ['Indoor/Outdoor', 'Plant type', 'Maintenance level'],
    other:       ['Brand preference', 'Budget range', 'Usage purpose'],
  }

  const availableAreas = (AREA_MAP[category] || AREA_MAP.other).join(', ')

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      messages: [
        { role: 'system', content: 'Indian shopping assistant. Return only valid JSON. No markdown.' },
        { role: 'user', content: `User searched: "${original}"
Category: ${category} (${meta.label})
What we ALREADY KNOW from the query: ${knownSummary || 'nothing'}
Available question areas for this category: ${availableAreas}
${known.budget_skip ? 'DO NOT ask budget — price range is obvious from the product model name.' : ''}
${known.organic_known ? 'DO NOT ask organic preference — brand is inherently organic.' : ''}

Pick 2-3 questions that would genuinely help narrow the search.
STRICT RULES:
1. NEVER ask about something in "already known" list
2. NEVER ask brand — it's already known or not needed
3. If "occasion/activity" is already known, skip it
4. For grocery/dairy items — NEVER ask organic if brand is inherently organic (Akshayakalpa = organic)
5. For named product models (Runfalcon, Air Max etc) — skip budget, ask size and color instead
6. Grocery: prioritize quantity/pack size and delivery urgency
7. Keep questions minimal — only what truly helps

Return JSON:
{
  "product_name": "Akshayakalpa Organic Milk",
  "questions": [
    {
      "id": "quantity",
      "label": "Which pack size?",
      "type": "chips",
      "options": ["500ml", "1L", "2L"]
    },
    {
      "id": "urgency",
      "label": "How soon do you need it?",
      "type": "chips",
      "options": ["Express (10-20 mins)", "Same day", "Flexible"]
    }
  ]
}` }
      ],
      temperature: 0,
      max_tokens: 600
    })
  })

  if (!r.ok) throw new Error(`Groq ${r.status}`)
  const d = await r.json()
  let raw = (d.choices?.[0]?.message?.content || '').trim()
    .replace(/^```json\s*/i,'').replace(/```$/,'').trim()
  const parsed = JSON.parse(raw)

  const meta2 = CATEGORY_META[category] || CATEGORY_META.other
  return {
    product_name: parsed.product_name || original,
    category_id: category,
    category_label: meta2.label,
    category_icon: meta2.icon,
    all_categories: Object.entries(CATEGORY_META).map(([id,c]) => ({ id, label:c.label, icon:c.icon })),
    already_known: Object.entries(known)
      .filter(([k]) => !['suggested_category','budget_skip','organic_known','price_hint'].includes(k))
      .map(([k,v]) => `${k}: ${v}`),
    questions: (parsed.questions || []).slice(0, 3),
    search_hint: original,
    platforms: meta2.platforms,
    known_raw: known,
  }
}

// ─────────────────────────────────────────────────────────────────
// Rule-based fallback
// ─────────────────────────────────────────────────────────────────
function buildRuleBased(original, q, known, category) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  const questions = []

  if (category === 'grocery') {
    if (!known.quantity) questions.push({ id:'quantity', label:'Which pack size?', type:'chips', options:['250ml','500ml','1L','2L','5kg','1kg','500g','250g'] })
    if (!known.organic_known && !known.organic) questions.push({ id:'organic', label:'Organic or regular?', type:'chips', options:['Organic','Regular','Either'] })
    questions.push({ id:'urgency', label:'How soon do you need it?', type:'chips', options:['Express (10-20 mins)','Same day','Flexible'] })
  } else if (category === 'fashion') {
    if (!known.size) questions.push({ id:'size', label:'Your size?', type:'chips', options: q.includes('shoe')||q.includes('sneaker')||q.includes('boot')||q.includes('sandal') ? ['UK 5','UK 6','UK 7','UK 8','UK 9','UK 10','UK 11','UK 12'] : ['XS','S','M','L','XL','XXL','3XL'] })
    if (!known.gender) questions.push({ id:'gender', label:'For whom?', type:'chips', options:['Men','Women','Kids','Unisex'] })
    if (!known.color) questions.push({ id:'color', label:'Color preference?', type:'chips', options:['Black','White','Grey','Navy','Brown','Any'] })
    if (!known.budget_skip) questions.push({ id:'budget', label:'Budget?', type:'chips', options:['Under ₹1000','₹1000–2000','₹2000–5000','₹5000–10000','Above ₹10000'] })
  } else if (category === 'electronics') {
    questions.push({ id:'usage', label:'What will you use it for?', type:'chips', options:['Work/Study','Gaming','Photography','Everyday use','Entertainment'] })
    if (!known.budget_skip) questions.push({ id:'budget', label:'Budget?', type:'chips', options:['Under ₹5000','₹5000–15000','₹15000–30000','₹30000–60000','Above ₹60000'] })
  } else {
    if (!known.brand) questions.push({ id:'brand', label:'Brand preference?', type:'text', placeholder:'e.g. Prestige, Samsung, or type "Any"' })
    if (!known.budget_skip) questions.push({ id:'budget', label:'Budget?', type:'chips', options:['Under ₹500','₹500–1000','₹1000–2000','₹2000–5000','₹5000–10000','Above ₹10000'] })
  }

  return {
    product_name: original,
    category_id: category,
    category_label: meta.label,
    category_icon: meta.icon,
    all_categories: Object.entries(CATEGORY_META).map(([id,c]) => ({ id, label:c.label, icon:c.icon })),
    already_known: Object.entries(known)
      .filter(([k]) => !['suggested_category','budget_skip','organic_known','price_hint'].includes(k))
      .map(([k,v]) => `${k}: ${v}`),
    questions: questions.slice(0, 3),
    search_hint: original,
    platforms: meta.platforms,
    known_raw: known,
  }
}
