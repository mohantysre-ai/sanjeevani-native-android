// Export the Sanjeevani SQLite catalog into static JSON bundles for the
// Capacitor native build (offline data layer). Mirrors the API route logic
// in src/app/api/v1/* 1:1 so the client fetch-shim (src/lib/native-data.ts)
// can serve identical responses from local assets.
//
// Output: native-export/data/*.json  (~10-15 MB raw, gzip-friendly)
import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync, statSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const prisma = new PrismaClient()
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'native-export', 'data')
mkdirSync(join(OUT, 'sections'), { recursive: true })
mkdirSync(join(OUT, 'details'), { recursive: true })

// ── helpers (mirrors src/lib/server/*) ──────────────────────────────────────
const parseJ = (raw, fb) => { if (!raw) return fb; try { return JSON.parse(raw) } catch { return fb } }
const thumbFor = (u) => (u ? (u.endsWith('.webp') ? u.replace(/\.webp$/, '-t.webp') : u) : null)
function cleanName(name, isRemedy = false) {
  let n = (name || '').replace(/\s+for\s+.*$/i, '').replace(/\s+[-–—]\s+.*$/, '').replace(/\s*\)+\s*$/, '')
  if (isRemedy) n = n.replace(/\s+\d+\s*[CXMK]\s*(?:\(.*?\))?$/i, '')
  n = n.replace(/\s*\(([^)]*)\)\s*$/, '').replace(/\s+(Beginner|Intermediate|Advanced)\s+Variations?$/i, '').replace(/\s+(Modern|Traditional)$/i, '')
  return n.trim()
}
const SEV = { high: 3, moderate: 2, mild: 1 }
const TIER_RANK = { A: 0, B: 1, C: 2, T: 3, D: 4 }
function highestTier(tiers) {
  if (!tiers || !tiers.length) return null
  let best = null
  for (const t of tiers) if (best === null || (TIER_RANK[t] ?? 9) < (TIER_RANK[best] ?? 9)) best = t
  return best
}

async function tierMapFor(entityType) {
  const claims = await prisma.claim.findMany({
    where: { entityType, workflowStatus: 'published' },
    select: { entityType: true, entityId: true, evidenceTier: true },
  })
  const byEntity = new Map()
  for (const c of claims) {
    const arr = byEntity.get(c.entityId) || []
    arr.push(c.evidenceTier)
    byEntity.set(c.entityId, arr)
  }
  return byEntity
}
const tierOf = (m, id) => highestTier(m.get(id)) ?? 'T'

const meta = { exportedAt: new Date().toISOString(), counts: {} }
const t0 = Date.now()
const J = (f, o) => writeFileSync(join(OUT, f), JSON.stringify(o))

// ── 1. Section lists (grouped, en names; shim localizes via nameHi/translate) ──
async function exportGroups() {
  // herbs
  const herbs = await prisma.herb.findMany({
    orderBy: { commonNameEn: 'asc' },
    select: { id: true, slug: true, commonNameEn: true, commonNameHi: true, latinBinomial: true, sanskritName: true, synonyms: true, imageUrl: true },
  })
  const herbTiers = await tierMapFor('herb')
  const hg = new Map()
  for (const r of herbs) {
    const k = (cleanName(r.commonNameEn) || r.slug).trim().toLowerCase()
    const a = hg.get(k); if (a) a.push(r); else hg.set(k, [r])
  }
  const herbList = [...hg.values()].map((g) => {
    const rep = g.find((r) => r.imageUrl) || g[0]
    return {
      slug: rep.slug, name: cleanName(rep.commonNameEn), nameHi: rep.commonNameHi,
      latinBinomial: rep.latinBinomial, sanskritName: rep.sanskritName,
      synonyms: parseJ(rep.synonyms, []).slice(0, 4),
      image: rep.imageUrl, thumb: thumbFor(rep.imageUrl), variants: g.length,
      evidenceTier: tierOf(herbTiers, rep.id),
    }
  })
  J('sections/herbs.json', { herbs: herbList, total: herbList.length })

  // yoga
  const asanas = await prisma.asana.findMany({
    orderBy: { nameEn: 'asc' },
    select: { id: true, slug: true, nameEn: true, nameHi: true, nameSanskrit: true, category: true, difficultyLevel: true, imageUrl: true },
  })
  const yogaTiers = await tierMapFor('yoga')
  const ag = new Map()
  for (const r of asanas) {
    const k = (cleanName(r.nameEn) || r.slug).trim().toLowerCase()
    const a = ag.get(k); if (a) a.push(r); else ag.set(k, [r])
  }
  const yogaList = [...ag.values()].map((g) => {
    const rep = g.find((r) => r.imageUrl) || g[0]
    return {
      slug: rep.slug, name: cleanName(rep.nameEn), nameHi: rep.nameHi,
      sanskrit: rep.nameSanskrit, category: rep.category, difficulty: rep.difficultyLevel,
      image: rep.imageUrl, thumb: thumbFor(rep.imageUrl), variants: g.length,
      evidenceTier: tierOf(yogaTiers, rep.id),
    }
  })
  J('sections/yoga.json', { asanas: yogaList, total: yogaList.length })

  // foods
  const foods = await prisma.food.findMany({
    orderBy: { nameEn: 'asc' },
    select: { id: true, slug: true, nameEn: true, nameHi: true, category: true, calories: true, imageUrl: true },
  })
  const fg = new Map()
  for (const r of foods) {
    const k = (cleanName(r.nameEn) || r.slug).trim().toLowerCase()
    const a = fg.get(k); if (a) a.push(r); else fg.set(k, [r])
  }
  const foodList = [...fg.values()].map((g) => {
    const rep = g.find((r) => r.imageUrl) || g[0]
    return {
      slug: rep.slug, name: cleanName(rep.nameEn), nameHi: rep.nameHi,
      category: rep.category, calories: rep.calories,
      image: rep.imageUrl, thumb: thumbFor(rep.imageUrl), variants: g.length,
    }
  })
  J('sections/nutrition.json', { foods: foodList, total: foodList.length, sourceNote: 'ICMR-NIN 2024 / IFCT aligned approximations, per 100 g' })

  // homeopathy
  const remedies = await prisma.homeopathyRemedy.findMany({
    orderBy: { nameEn: 'asc' },
    select: { id: true, slug: true, nameEn: true, nameHi: true, nameTranslit: true, latinSource: true, category: true, evidenceTier: true, safetyLevel: true, emergencyWarning: true, dmrCompliance: true, synonyms: true, imageUrl: true },
  })
  const rg = new Map()
  for (const r of remedies) {
    const k = (cleanName(r.nameEn, true) || r.slug).trim().toLowerCase()
    const a = rg.get(k); if (a) a.push(r); else rg.set(k, [r])
  }
  const remList = [...rg.values()].map((g) => {
    const rep = g.find((r) => r.imageUrl) || g[0]
    return {
      slug: rep.slug, name: cleanName(rep.nameEn, true), nameHi: rep.nameHi,
      translit: rep.nameTranslit, latinSource: rep.latinSource, category: rep.category,
      evidenceTier: rep.evidenceTier, safetyLevel: rep.safetyLevel,
      emergencyWarning: rep.emergencyWarning,
      disclaimerRequired: parseJ(rep.dmrCompliance, { disclaimer_required: true }).disclaimer_required,
      synonyms: parseJ(rep.synonyms, []).slice(0, 4),
      image: rep.imageUrl, thumb: thumbFor(rep.imageUrl), variants: g.length,
    }
  })
  J('sections/homeopathy.json', { remedies: remList, total: remList.length })

  meta.counts.groups = { herbs: herbList.length, yoga: yogaList.length, nutrition: foodList.length, homeopathy: remList.length }
}

// ── 2. Details (en payloads keyed by slug — exact API shape) ────────────────
async function claimMaps() {
  const rows = await prisma.claim.findMany({ where: { workflowStatus: 'published' }, orderBy: { evidenceTier: 'asc' } })
  const by = new Map()
  for (const c of rows) {
    const arr = by.get(c.entityType + ':' + c.entityId) || []
    arr.push(c)
    by.set(c.entityType + ':' + c.entityId, arr)
  }
  return { rows, by }
}
const claimShape = (c, lang) => ({
  id: c.id,
  statement: lang === 'hi' && c.statementHi ? c.statementHi : c.statement,
  tier: c.evidenceTier,
  sources: parseJ(c.sources, []),
  reviewer: { name: c.reviewerName, credentials: c.reviewerCredentials },
  lastReviewed: c.lastReviewedDate instanceof Date ? c.lastReviewedDate.toISOString() : c.lastReviewedDate,
  nextReview: c.nextReviewDate instanceof Date ? c.nextReviewDate.toISOString() : c.nextReviewDate,
})

const HOMEOPATHY_DISCLAIMER = {
  en: 'Homeopathic remedies are highly diluted preparations. The scientific consensus (including the 2017 NIH-endorsed assessment by the European and Australian science academies) is that homeopathy is not a reliable, evidence-based treatment: any perceived benefit is consistent with placebo and natural recovery. This listing documents classical homeopathic materia medica for educational reference only and does not endorse clinical efficacy. Do not use homeopathic remedies as a substitute for conventional medical care in acute or serious illness.',
  hi: 'होम्योपैथिक औषधियाँ अत्यंत तनु (डाइल्यूट) रूप में होती हैं। वैज्ञानिक सहमति (2017 का NIH-समर्थित मूल्यांकन सहित) यह है कि होम्योपैथी एक विश्वसनीय, प्रमाण-आधारित उपचार नहीं है — कोई भी लाभ प्लेसीबो और स्वाभाविक स्वास्थ्य-लाभ के अनुरूप है। यह सूची केवल शैक्षिक संदर्भ हेतु शास्त्रीय होम्योपैथिक मैटेरिया मेडिका का दस्तावेज़ीकरण है और नैदानिक प्रभावकारिता का समर्थन नहीं करती। गंभीर या तीव्र बीमारी में होम्योपैथिक औषधियों को पारंपरिक चिकित्सा देखभाल का विकल्प न बनाएँ।',
}

async function exportDetails(claimsBy) {
  // Details are DEDUPED by clean-name group (the same grouping as the lists):
  // 30k variant slugs share near-identical profiles; a compact slugmap.json
  // maps every slug → [groupRepSlug, variantName] so the shim can serve any
  // slug from its group payload.
  const slugmap = {}
  const groupOf = (names, isRemedy) => {
    // names order is stable (orderBy nameEn asc) → groups keep representative order
    const m = new Map()
    for (const r of names) {
      const k = (cleanName(r.n, isRemedy) || r.slug).trim().toLowerCase()
      const a = m.get(k); if (a) a.push(r); else m.set(k, [r])
    }
    return m
  }

  // herbs
  const herbs = await prisma.herb.findMany({ orderBy: { commonNameEn: 'asc' } })
  const asanaMini = await prisma.asana.findMany({ select: { slug: true, nameEn: true, nameSanskrit: true, nameHi: true } })
  const asanaBySlug = new Map(asanaMini.map((a) => [a.slug, a]))
  const herbTiers = await tierMapFor('herb')
  const herbDetails = {}
  for (const [, members] of groupOf(herbs.map((h) => ({ n: h.commonNameEn, slug: h.slug })), false)) {
    const rep = members.find((r) => herbs.find((h) => h.slug === r.slug)?.imageUrl) || members[0]
    const h = herbs.find((x) => x.slug === rep.slug)
    const ids = new Set(members.map((m) => m.slug))
    for (const m of members) slugmap['h:' + m.slug] = [h.slug, m.n]
    const claims = []
    const seenIds = new Set()
    for (const mem of members) for (const c of claimsBy.get('herb:' + mem.id) || []) {
      if (seenIds.has(c.id)) continue
      seenIds.add(c.id); claims.push(claimShape(c, 'en'))
    }
    claims.sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9))
    const tier = highestTier(members.flatMap((m) => herbTiers.get(m.id) || [])) ?? 'T'
    const yogaSlugs = parseJ(h.linkedYogaSlugs, [])
    herbDetails[h.slug] = {
      loc: 'en',
      herb: {
        slug: h.slug, name: h.commonNameEn, nameAlt: h.commonNameHi || '',
        latinBinomial: h.latinBinomial, sanskritName: h.sanskritName,
        synonyms: parseJ(h.synonyms, []), ayurvedicProperties: parseJ(h.ayurvedicProperties, null),
        safetyFlags: parseJ(h.safetyFlags, null), usageAndDose: h.usageAndDose,
        category: h.category, description: h.description, usesBenefits: h.usesBenefits,
        precautions: h.precautions, evidenceGrade: h.evidenceGrade, safetyLevel: h.safetyLevel,
        sourceUrl: h.sourceUrl, image: h.imageUrl, evidenceTier: tier,
        linkedYoga: yogaSlugs.filter((s) => asanaBySlug.has(s)).map((s) => {
          const y = asanaBySlug.get(s)
          return { slug: y.slug, name: y.nameEn, sanskrit: y.nameSanskrit }
        }),
        claims,
      },
    }
  }
  J('details/herbs.json', herbDetails)

  // yoga
  const asanas = await prisma.asana.findMany({ orderBy: { nameEn: 'asc' } })
  const yogaTiers = await tierMapFor('yoga')
  const asanaDetails = {}
  for (const [, members] of groupOf(asanas.map((a) => ({ n: a.nameEn, slug: a.slug })), false)) {
    const rep = members.find((r) => asanas.find((x) => x.slug === r.slug)?.imageUrl) || members[0]
    const a = asanas.find((x) => x.slug === rep.slug)
    for (const m of members) slugmap['y:' + m.slug] = [a.slug, m.n]
    const claims = []
    const seenIds = new Set()
    for (const mem of members) for (const c of claimsBy.get('yoga:' + mem.id) || []) {
      if (seenIds.has(c.id)) continue
      seenIds.add(c.id); claims.push(claimShape(c, 'en'))
    }
    claims.sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9))
    const tier = highestTier(members.flatMap((m) => yogaTiers.get(m.id) || [])) ?? 'T'
    asanaDetails[a.slug] = {
      loc: 'en',
      asana: {
        slug: a.slug, name: a.nameEn, sanskrit: a.nameSanskrit, category: a.category,
        difficulty: a.difficultyLevel, description: a.description, instructions: a.instructions,
        precautions: a.precautions, evidenceGrade: a.evidenceGrade, sourceUrl: a.sourceUrl,
        image: a.imageUrl,
        contraindications: parseJ(a.contraindications, []).map((c) => c.en ?? c),
        benefits: parseJ(a.benefits, []).map((b) => b.en ?? b),
        evidenceTier: tier, claims,
      },
    }
  }
  J('details/yoga.json', asanaDetails)

  // foods
  const foods = await prisma.food.findMany({ orderBy: { nameEn: 'asc' } })
  const foodDetails = {}
  for (const [, members] of groupOf(foods.map((f) => ({ n: f.nameEn, slug: f.slug })), false)) {
    const rep = members.find((r) => foods.find((x) => x.slug === r.slug)?.imageUrl) || members[0]
    const f = foods.find((x) => x.slug === rep.slug)
    for (const m of members) slugmap['f:' + m.slug] = [f.slug, m.n]
    const claims = []
    const seenIds = new Set()
    for (const mem of members) for (const c of claimsBy.get('nutrition:' + mem.id) || []) {
      if (seenIds.has(c.id)) continue
      seenIds.add(c.id); claims.push(claimShape(c, 'en'))
    }
    claims.sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9))
    foodDetails[f.slug] = {
      loc: 'en',
      food: {
        slug: f.slug, name: f.nameEn, nameAlt: f.nameHi || '', category: f.category,
        scientificClass: f.scientificClass, servingSizeG: f.servingSizeG,
        calories: f.calories, proteinG: f.proteinG, carbsG: f.carbsG, fatG: f.fatG, fiberG: f.fiberG,
        micronutrients: parseJ(f.micronutrients, {}),
        description: f.description, usesBenefits: f.usesBenefits, servingGuidance: f.servingGuidance,
        precautions: f.precautions, evidenceGrade: f.evidenceGrade, safetyLevel: f.safetyLevel,
        sourceUrl: f.sourceUrl, image: f.imageUrl, sourceNote: f.source,
      },
      claims: claims.slice(0, 12),
    }
  }
  J('details/nutrition.json', foodDetails)

  // homeopathy (with related + dmr), grouped
  const remedies = await prisma.homeopathyRemedy.findMany({ orderBy: { nameEn: 'asc' } })
  const remTiers = await tierMapFor('homeopathy')
  const remDetails = {}
  const remGroups = groupOf(remedies.map((r) => ({ n: r.nameEn, slug: r.slug })), true)
  const allRems = [...remedies]
  for (const [, members] of remGroups) {
    const rep = members.find((r) => remedies.find((x) => x.slug === r.slug)?.imageUrl) || members[0]
    const full = remedies.find((x) => x.slug === rep.slug)
    for (const m of members) slugmap['r:' + m.slug] = [full.slug, m.n]
    const claims = []
    const seenIds = new Set()
    for (const mem of members) for (const c of claimsBy.get('homeopathy:' + mem.id) || []) {
      if (seenIds.has(c.id)) continue
      seenIds.add(c.id); claims.push(claimShape(c, 'en'))
    }
    claims.sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9))
    const dmr = parseJ(full.dmrCompliance, { disclaimer_required: true, disclaimer_key: 'homeopathy_efficacy_consensus', self_diagnosis_warning: true })
    const family = (full.category || '').split(/[/,]/)[0].trim()
    const related = []
    if (family) {
      const seen = new Set()
      for (const r of allRems) {
        if (members.some((m) => m.slug === r.slug)) continue
        if (!r.category || !r.category.includes(family)) continue
        const cn = cleanName(r.nameEn, true)
        if (!cn || seen.has(cn.toLowerCase())) continue
        seen.add(cn.toLowerCase())
        related.push({ slug: r.slug, name: r.nameEn, image: r.imageUrl, thumb: thumbFor(r.imageUrl) })
        if (related.length >= 8) break
      }
    }
    remDetails[full.slug] = {
      loc: 'en',
      remedy: {
        slug: full.slug, name: full.nameEn, nameAlt: full.nameHi || '', translit: full.nameTranslit,
        latinSource: full.latinSource, category: full.category, description: full.description,
        indications: full.indications, potencyDosage: full.potencyDosage, precautions: full.precautions,
        safetyFlags: parseJ(full.safetyFlags, []), safetyLevel: full.safetyLevel,
        emergencyWarning: full.emergencyWarning, evidenceTier: full.evidenceTier,
        evidenceBasis: full.evidenceBasis, synonyms: parseJ(full.synonyms, []),
        sourceUrl: full.sourceUrl, image: full.imageUrl, workflowStatus: full.workflowStatus,
        dmr: { ...dmr, disclaimer: HOMEOPATHY_DISCLAIMER.en },
        claims,
      },
      related,
      meta: claims[0] ? { lastReviewed: claims[0].lastReviewed, nextReview: claims[0].nextReview } : null,
    }
  }
  J('details/homeopathy.json', remDetails)
  J('slugmap.json', slugmap)

  meta.counts.details = {
    herbs: Object.keys(herbDetails).length, yoga: Object.keys(asanaDetails).length,
    nutrition: Object.keys(foodDetails).length, homeopathy: Object.keys(remDetails).length,
    slugmap: Object.keys(slugmap).length,
  }
}

// ── 3. Search index (raw rows, compact) + synonyms ──────────────────────────
async function exportSearch() {
  const herbs = await prisma.herb.findMany({ select: { slug: true, commonNameEn: true, commonNameHi: true, latinBinomial: true, sanskritName: true, synonyms: true, imageUrl: true } })
  const asanas = await prisma.asana.findMany({ select: { slug: true, nameEn: true, nameHi: true, nameSanskrit: true, category: true, imageUrl: true } })
  const foods = await prisma.food.findMany({ select: { slug: true, nameEn: true, nameHi: true, category: true, calories: true, imageUrl: true } })
  const conditions = await prisma.condition.findMany({ orderBy: { nameEn: 'asc' } })
  const remedies = await prisma.homeopathyRemedy.findMany({ select: { slug: true, nameEn: true, nameHi: true, latinSource: true, category: true, evidenceTier: true, synonyms: true, imageUrl: true } })
  const condTiers = await tierMapFor('condition')

  // merge synonyms INTO the match blob per row (server matches row fields incl. synonyms)
  const blob = (parts) => parts.filter(Boolean).join(' ').toLowerCase()
  J('search.json', {
    herbs: herbs.map((h) => ({ s: h.slug, n: h.commonNameEn, i: h.imageUrl, m: blob([h.commonNameEn, h.commonNameHi, h.latinBinomial, h.sanskritName, parseJ(h.synonyms, []).join(' ')]) })),
    yoga: asanas.map((a) => ({ s: a.slug, n: a.nameEn, i: a.imageUrl, m: blob([a.nameEn, a.nameHi, a.nameSanskrit, a.category]) })),
    foods: foods.map((f) => ({ s: f.slug, n: f.nameEn, i: f.imageUrl, m: blob([f.nameEn, f.nameHi]) })),
    conditions: conditions.map((c) => ({ s: c.slug, n: c.nameEn, nh: c.nameHi, icd: c.icdCode, t: highestTier((condTiers.get(c.id) || []).map((x) => x)) ?? 'T', m: blob([c.nameEn, c.nameHi, c.description]) })),
    homeopathy: remedies.map((r) => ({ s: r.slug, n: r.nameEn, i: r.imageUrl, t: r.evidenceTier, m: blob([r.nameEn, r.nameHi, r.latinSource, r.category, parseJ(r.synonyms, []).join(' ')]) })),
  })
  const syns = await prisma.synonym.findMany()
  J('synonyms.json', syns.map((r) => ({ c: r.canonical, s: parseJ(r.synonyms, []) })))

  // conditions detail (checker screen)
  J('conditions.json', {
    conditions: conditions.map((c) => ({
      slug: c.slug, name: c.nameEn, nameHi: c.nameHi, namasteCode: c.namasteCode,
      icdCode: c.icdCode, tm2Category: c.tm2Category, description: c.description,
      evidenceTier: highestTier(condTiers.get(c.id) || []) ?? 'T',
    })),
  })
  meta.counts.search = { herbs: herbs.length, yoga: asanas.length, foods: foods.length, conditions: conditions.length, homeopathy: remedies.length, synonyms: syns.length }
}

// ── 4. Daily candidates + quiz pool ─────────────────────────────────────────
async function exportDaily() {
  const herbs = await prisma.herb.findMany({ where: { safetyLevel: { not: 'restricted' } }, select: { slug: true, commonNameEn: true, commonNameHi: true } })
  const asanas = await prisma.asana.findMany({ select: { slug: true, nameEn: true, nameHi: true } })
  const foods = await prisma.food.findMany({ select: { slug: true, nameEn: true, nameHi: true } })
  const remedies = await prisma.homeopathyRemedy.findMany({ where: { emergencyWarning: false }, select: { slug: true, nameEn: true, nameHi: true } })
  const quizClaims = (await prisma.claim.findMany({ where: { workflowStatus: 'published', entityType: { in: ['herb', 'nutrition', 'yoga'] } }, orderBy: { id: 'asc' } }))
    .filter((c) => c.statement && c.statement.length >= 40 && c.statement.length <= 260)
    .map((c) => ({ id: c.id, et: c.entityType, st: c.statement, stHi: c.statementHi || undefined, t: c.evidenceTier, pub: (parseJ(c.sources, [])[0] || {}).publisher }))
  // nameHi inline for hi localization; display fields resolve shim-side from lists/details
  J('daily.json', {
    herbs: herbs.map((h) => [h.slug, h.commonNameEn, h.commonNameHi || '']),
    asanas: asanas.map((a) => [a.slug, a.nameEn, a.nameHi || '']),
    foods: foods.map((f) => [f.slug, f.nameEn, f.nameHi || '']),
    remedies: remedies.map((r) => [r.slug, r.nameEn, r.nameHi || '']),
    quiz: quizClaims,
  })
  meta.counts.daily = { herbs: herbs.length, asanas: asanas.length, foods: foods.length, remedies: remedies.length, quiz: quizClaims.length }
}

// ── 5. Interactions + stats ─────────────────────────────────────────────────
async function exportInteractions() {
  const rules = await prisma.interaction.findMany()
  const herbs = await prisma.herb.findMany({ select: { slug: true, commonNameEn: true, sanskritName: true, synonyms: true } })
  const norm = (s) => s.toLowerCase().replace(/[-_]+/g, ' ').trim()
  const safeSyn = (raw) => parseJ(raw, []).filter((x) => typeof x === 'string').map(norm)
  const index = herbs.map((h) => ({ slug: h.slug, terms: Array.from(new Set([norm(h.slug), norm(h.commonNameEn || ''), norm(h.sanskritName || ''), ...safeSyn(h.synonyms)].filter(Boolean))) }))
  J('interactions.json', {
    index,
    rules: rules.map((r) => ({ herbSlug: r.herbSlug, medicationPattern: r.medicationPattern, medicationLabel: r.medicationLabel, severity: r.severity, descriptionEn: r.descriptionEn, adviceEn: r.adviceEn, sources: parseJ(r.sources, []) })),
  })
  meta.counts.interactions = rules.length
}

async function exportStats() {
  const featured = async (table) => {
    const rows = await prisma[table].findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true }, orderBy: { id: 'asc' }, take: 1 })
    return rows[0]?.imageUrl ?? null
  }
  const [herbs, asanas, foods, remedies, claims, fH, fY, fF, fR] = await Promise.all([
    prisma.herb.count(), prisma.asana.count(), prisma.food.count(), prisma.homeopathyRemedy.count(), prisma.claim.count(),
    featured('herb'), featured('asana'), featured('food'), featured('homeopathyRemedy'),
  ])
  J('stats.json', { herbs, asanas, foods, remedies, claims, featured: { herbs: fH, yoga: fY, nutrition: fF, homeopathy: fR } })
  meta.counts.stats = { herbs, asanas, foods, remedies, claims }
}

// ── run ──────────────────────────────────────────────────────────────────────
;(async () => {
  const { by: claimsBy } = await claimMaps()
  await exportGroups()
  await exportDetails(claimsBy)
  await exportSearch()
  await exportDaily()
  await exportInteractions()
  await exportStats()
  J('meta.json', meta)
  console.log('EXPORT DONE in', ((Date.now() - t0) / 1000).toFixed(1) + 's')
  // size report
  let total = 0
  const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walk(p); else { total += statSync(p).size } } }
  walk(OUT)
  console.log('TOTAL SIZE:', (total / 1048576).toFixed(1) + ' MB')
  await prisma.$disconnect()
})().catch((e) => { console.error(e); process.exit(1) })
