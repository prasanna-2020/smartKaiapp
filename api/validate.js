// /api/validate.js — Pre-search validation
// Checks if the search query is a valid purchasable product
// Returns: { valid: true/false, reason: string, suggestion: string }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query, category } = req.body || {}
  if (!query) return res.status(400).json({ error: 'Query required' })

  // ── Rule-based validation first (no API cost) ──
  const q = query.toLowerCase().trim()

  const INVALID_PATTERNS = [
    // Living beings
    { pattern: /\b(puppy|puppies|kitten|kittens|dog|cat|bird|fish|rabbit|hamster|parrot|pet)\b.*\b(buy|sell|sale|adopt|male|female|breed)\b/i, reason: 'Live animals cannot be purchased on shopping platforms', suggestion: 'Try searching for pet food, accessories, or pet supplies instead' },
    { pattern: /\b(shih.?tzu|labrador|golden.?retriever|pomeranian|persian.?cat|siamese)\b/i, reason: 'Live pet breeds cannot be purchased on shopping platforms', suggestion: 'Try searching for pet food, accessories, or pet care products instead' },

    // Real estate
    { pattern: /\b(house|flat|apartment|villa|plot|land|property|bhk|sqft)\b.*\b(buy|sale|rent|lease)\b/i, reason: 'Real estate cannot be purchased through shopping platforms', suggestion: 'Use MagicBricks, 99acres, or NoBroker for property searches' },

    // Services
    { pattern: /\b(plumber|electrician|carpenter|painter|maid|cook|driver|doctor|lawyer|tutor|teacher|mechanic)\b/i, reason: 'Services cannot be compared on shopping platforms', suggestion: 'Try UrbanClap, Sulekha, or Justdial for service providers' },
    { pattern: /\b(haircut|massage|salon|spa|gym|yoga|class|coaching|repair|installation|cleaning)\b/i, reason: 'Services cannot be compared on shopping platforms', suggestion: 'Try UrbanClap or Justdial for local services' },

    // Digital / non-physical
    { pattern: /\b(netflix|hotstar|amazon prime|spotify|subscription|ott|streaming)\b/i, reason: 'Digital subscriptions are not available on product shopping platforms', suggestion: 'Visit the platform website directly to subscribe' },
    { pattern: /\b(loan|insurance|emi|credit card|mutual fund|stock|share|bitcoin|crypto)\b/i, reason: 'Financial products cannot be compared on shopping platforms', suggestion: 'Use Policybazaar, BankBazaar, or Zerodha for financial products' },

    // People / celebrities
    { pattern: /\b(marriage|bride|groom|matrimony|dating|girlfriend|boyfriend)\b/i, reason: 'People and relationships are not products', suggestion: '' },

    // Jobs
    { pattern: /\b(job|vacancy|hiring|fresher|internship|salary|resume)\b/i, reason: 'Job listings are not available on shopping platforms', suggestion: 'Try Naukri, LinkedIn, or Indeed for jobs' },
  ]

  for (const { pattern, reason, suggestion } of INVALID_PATTERNS) {
    if (pattern.test(q)) {
      return res.status(200).json({ valid: false, reason, suggestion })
    }
  }

  // ── Check for suspiciously vague queries ──
  if (q.split(' ').length === 1 && q.length < 4) {
    return res.status(200).json({
      valid: false,
      reason: 'Search query is too vague',
      suggestion: 'Please be more specific — e.g. "Amul Butter 500g" instead of just "butter"'
    })
  }

  // ── Use Groq for ambiguous cases only ──
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
          messages: [
            {
              role: 'system',
              content: 'You validate if a search query is a valid physical purchasable product for Indian shopping platforms (Amazon, Flipkart, Zepto, etc.). Return only valid JSON.'
            },
            {
              role: 'user',
              content: `Is "${query}" (category: ${category || 'unknown'}) a valid physical product that can be purchased on Indian shopping platforms like Amazon or Flipkart?

Return ONLY this JSON:
{
  "valid": true,
  "reason": "",
  "suggestion": ""
}

Set valid:false for: live animals, real estate, services, jobs, people, digital subscriptions, financial products, or anything not a physical purchasable item.
Set valid:true for: any physical product — food, electronics, clothing, appliances, medicines, household items, etc.
Keep reason and suggestion short (1 sentence each). If valid, leave them empty strings.`
            }
          ],
          temperature: 0,
          max_tokens: 150
        })
      })

      if (r.ok) {
        const d = await r.json()
        let raw = (d.choices?.[0]?.message?.content || '').trim()
        raw = raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim()
        const result = JSON.parse(raw)
        return res.status(200).json(result)
      }
    } catch (e) {
      // If Groq fails, default to valid (don't block legitimate searches)
    }
  }

  // Default: allow the search
  return res.status(200).json({ valid: true, reason: '', suggestion: '' })
}
