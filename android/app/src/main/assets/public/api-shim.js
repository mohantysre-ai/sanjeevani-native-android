/*
 * Sanjeevani offline API shim — Capacitor native build only.
 *
 * Intercepts same-origin /api/* fetches inside the WebView and serves them
 * from the JSON snapshot bundled in /offline-data/** (built from the live
 * Prisma DB by scripts/build_offline_snapshot.mjs). Zero network, zero
 * remote URLs — the app is fully self-contained and native.
 *
 * On the regular web deployment window.Capacitor is undefined, so this file
 * becomes a transparent no-op and the real Next.js API answers normally.
 */
(function () {
  'use strict'
  var NATIVE = typeof window !== 'undefined' && !!window.Capacitor
  if (typeof window === 'undefined' || !window.fetch) return

  var origFetch = window.fetch.bind(window)

  // ── shared helpers (ports of src/lib/server/*) ──────────────────────────
  function parseJ(raw, fallback) {
    if (raw === null || raw === undefined) return fallback
    if (typeof raw === 'object') return raw
    try { return JSON.parse(raw) } catch (e) { return fallback }
  }
  function thumbFor(imageUrl) {
    if (!imageUrl) return null
    return imageUrl.endsWith('.webp') ? imageUrl.replace(/\.webp$/, '-t.webp') : imageUrl
  }
  function cleanName(name, isRemedy) {
    var n = (name || '')
      .replace(/\s+for\s+.*$/i, '')
      .replace(/\s+[-–—]\s+.*$/, '')
      .replace(/\s*\)+\s*$/, '')
    if (isRemedy) n = n.replace(/\s+\d+\s*[CXMK]\s*(?:\(.*?\))?$/i, '')
    n = n
      .replace(/\s*\(([^)]*)\)\s*$/, '')
      .replace(/\s+(Beginner|Intermediate|Advanced)\s+Variations?$/i, '')
      .replace(/\s+(Modern|Traditional)$/i, '')
    return n.trim()
  }
  function pageParams(u) {
    var limit = Math.min(240, Math.max(1, parseInt(u.searchParams.get('limit') || '', 10) || 60))
    var offset = Math.max(0, parseInt(u.searchParams.get('offset') || '', 10) || 0)
    var q = (u.searchParams.get('q') || '').trim().slice(0, 80)
    return { limit: limit, offset: offset, q: q }
  }
  function resolveContentLang(v) { return v ? v : 'en' }
  function localizedName(tr, fallbackEn, existingHi, lang) {
    if (lang && tr && tr.nameLoc) return tr.nameLoc
    if (lang === 'hi' && existingHi) return existingHi
    return fallbackEn
  }
  function localizedField(tr, field, fallbackEn) {
    var loc = tr && tr.fieldsLoc ? tr.fieldsLoc[field] : null
    if (loc && loc.trim && loc.trim()) return loc
    return fallbackEn === undefined ? null : fallbackEn
  }
  function pickItem(lang, item) { return lang === 'hi' ? (item.hi || item.en) : item.en }
  function pick(lang, en, hi) { return lang === 'hi' && hi ? hi : en }
  function jsonClone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)) }
  function contains(hay, needle) { return (hay || '').toLowerCase().indexOf(needle.toLowerCase()) !== -1 }

  // ── data store with lazy single-load files ───────────────────────────────
  var store = {}
  function load(file) {
    if (store[file]) return store[file]
    store[file] = origFetch('/offline-data/' + file, { cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('offline-data missing: ' + file)
        return r.json()
      })
      .catch(function (e) { delete store[file]; throw e })
    return store[file]
  }

  var trIndex = null
  function translationsFor(section, slugs, lang) {
    return load('translations.json').then(function (rows) {
      if (!trIndex) {
        trIndex = {}
        rows.forEach(function (r) {
          var k = r.lang + '|' + r.section + '|' + r.slug
          trIndex[k] = { nameLoc: r.name, fieldsLoc: r.fields }
        })
      }
      var out = {}
      if (lang === 'en' || !slugs.length) return out
      slugs.forEach(function (s) {
        var t = trIndex[lang + '|' + section + '|' + s]
        if (t) out[s] = t
      })
      return out
    })
  }

  // slug → representative slug (variant rows resolve to their group rep)
  var repIndex = null
  function repFor(slug) {
    return load('search/corpus.json').then(function (c) {
      if (!repIndex) {
        repIndex = {}
        ;['herbs', 'yoga', 'foods', 'remedies'].forEach(function (k) {
          c[k].forEach(function (row) { repIndex[row.slug] = row.rep })
        })
      }
      return repIndex[slug] || slug
    })
  }

  // generic grouped list engine — mirrors the four list routes exactly
  function groupedPage(rows, opts) {
    // rows pre-sorted by nameEn (builder preserved SQL order)
    var filtered = rows
    if (opts.q) {
      filtered = rows.filter(function (r) {
        return opts.fields(r).some(function (f) { return contains(f, opts.q) })
      })
    }
    if (opts.category) filtered = filtered.filter(function (r) { return r.category === opts.category })
    var groups = new Map()
    filtered.forEach(function (r) {
      var k = (cleanName(opts.name(r), opts.remedy) || r.slug).trim().toLowerCase()
      var arr = groups.get(k); if (arr) arr.push(r); else groups.set(k, [r])
    })
    return { groups: groups }
  }

  // ── list endpoints ───────────────────────────────────────────────────────
  function serveList(entity, u) {
    var lang = resolveContentLang(u.searchParams.get('language'))
    var pp = pageParams(u)
    var isYoga = (entity === 'yoga' || entity === 'asanas')
    var isHomeo = (entity === 'homeopathy' || entity === 'remedies')
    var section = entity === 'herbs' ? 'herbs' : isYoga ? 'yoga' : entity === 'foods' ? 'foods' : 'homeopathy'
    var listFile = entity === 'herbs' ? 'lists/herbs-slim.json' : isYoga ? 'lists/yoga-slim.json' : entity === 'foods' ? 'lists/foods-slim.json' : 'lists/remedies-slim.json'
    return load(listFile).then(function (rows) {
      var q = pp.q
      var filtered = rows
      if (q) {
        filtered = rows.filter(function (r) {
          if (entity === 'herbs') return contains(r.name, q) || contains(r.searchSyns, q)
          if (isYoga) return contains(r.name, q) || contains(r.searchSyns, q)
          if (entity === 'foods') return contains(r.name, q) || contains(r.category, q) || contains(r.searchSyns, q)
          return contains(r.name, q) || contains(r.searchSyns, q)
        })
      }
      var category = u.searchParams.get('category')
      if (category && entity === 'foods') filtered = filtered.filter(function (r) { return r.category === category })
      if (category && isHomeo) {
        filtered = filtered.filter(function (r) {
          if (!r.category) return false
          return contains(r.category, category) || r.category.toLowerCase().indexOf(category.toLowerCase()) !== -1
        })
      }
      if (category && isYoga) {
        filtered = filtered.filter(function (r) {
          if (!r.category) return false
          return contains(r.category, category)
        })
      }

      // group by clean name (slim lists hold the representative only; grouping key matches server)
      var groups = new Map()
      filtered.forEach(function (r) {
        var k = (cleanName(r.name, isHomeo) || r.slug).trim().toLowerCase()
        var arr = groups.get(k); if (arr) arr.push(r); else groups.set(k, [r])
      })
      var keys = Array.from(groups.keys()).slice(pp.offset, pp.offset + pp.limit)
      var page = keys.map(function (k) { return groups.get(k)[0] })

      return translationsFor(section, page.map(function (r) { return r.slug }), lang).then(function (trs) {
        var items = page.map(function (r) {
          if (entity === 'herbs') {
            return {
              slug: r.slug, name: localizedName(trs[r.slug], r.name, r.nameHi, lang),
              latinBinomial: r.latinBinomial, sanskritName: r.sanskritName,
              synonyms: (r.synonyms || []).slice(0, 4), image: r.image, thumb: r.thumb,
              variants: r.variants, evidenceTier: r.evidenceTier,
            }
          }
          if (isYoga) {
            return {
              slug: r.slug, name: localizedName(trs[r.slug], r.name, r.nameHi, lang),
              sanskrit: r.sanskrit, category: r.category, difficulty: r.difficulty,
              image: r.image, thumb: r.thumb, variants: r.variants, evidenceTier: r.evidenceTier,
            }
          }
          if (entity === 'foods') {
            return {
              slug: r.slug, name: localizedName(trs[r.slug], r.name, r.nameHi, lang),
              category: r.category, calories: r.calories, image: r.image, thumb: r.thumb, variants: r.variants,
            }
          }
          return {
            slug: r.slug, name: localizedName(trs[r.slug], r.name, r.nameHi, lang),
            translit: r.translit, latinSource: r.latinSource, category: r.category,
            evidenceTier: r.evidenceTier, safetyLevel: r.safetyLevel, emergencyWarning: r.emergencyWarning,
            disclaimerRequired: r.disclaimerRequired !== false,
            synonyms: (r.synonyms || []).slice(0, 4), image: r.image, thumb: r.thumb, variants: r.variants,
          }
        })
        var body = { total: groups.size, limit: pp.limit, offset: pp.offset }
        body[entity] = items
        if (isHomeo) {
          body.homeopathy = items
          body.remedies = items
        }
        if (isYoga) {
          body.yoga = items
          body.asanas = items
        }
        if (entity === 'foods') body.sourceNote = 'ICMR-NIN 2024 / IFCT aligned approximations, per 100 g'
        return body
      })
    })
  }

  // ── detail endpoints ─────────────────────────────────────────────────────
  function applyDetailLocalization(entity, data, lang) {
    var isHomeo = (entity === 'homeopathy' || entity === 'remedies')
    var isYoga = (entity === 'yoga' || entity === 'asanas')
    if (lang === 'en') {
      // strip builder-only fields
      if (isHomeo && data.remedy) {
        data.remedy.dmr.disclaimer = HOMEOPATHY_DISCLAIMER.en
        if (data._claims) { data.remedy.claims = data._claims; data.remedy.claims.forEach(function (c) { delete c.statementHi }) }
        delete data._claims
      }
      return Promise.resolve(data)
    }
    var section = entity === 'herbs' ? 'herbs' : isYoga ? 'yoga' : entity === 'foods' ? 'foods' : 'homeopathy'
    var ent = data[entity] || data.remedy || data.asana || data.herb || data.food
    var slug = ent ? ent.slug : ''
    var enName = ent ? ent.name : ''
    return translationsFor(section, [slug], lang).then(function (trs) {
      var tr = trs[slug]
      if (entity === 'herbs') {
        var h = data.herb
        h.name = localizedName(tr, h.name, h.nameAlt, lang)
        h.nameAlt = enName
        h.usageAndDose = localizedField(tr, 'usageAndDose', h.usageAndDose)
        h.description = localizedField(tr, 'description', h.description)
        h.usesBenefits = localizedField(tr, 'usesBenefits', h.usesBenefits)
        h.precautions = localizedField(tr, 'precautions', h.precautions)
        h.claims.forEach(function (c) { if (lang === 'hi' && c.statementHi) c.statement = c.statementHi; delete c.statementHi })
      } else if (isYoga) {
        var a = data.asana
        a.name = localizedName(tr, a.name, null, lang)
        a.description = localizedField(tr, 'description', a.description)
        a.instructions = localizedField(tr, 'instructions', a.instructions)
        a.precautions = localizedField(tr, 'precautions', a.precautions)
        a.contraindications = (a.contraindications || []).map(function (c) { return pickItem(lang, c) })
        a.benefits = (a.benefits || []).map(function (b) { return pickItem(lang, b) })
        a.claims.forEach(function (c) { if (lang === 'hi' && c.statementHi) c.statement = c.statementHi; delete c.statementHi })
      } else if (entity === 'foods') {
        var f = data.food
        f.name = localizedName(tr, f.name, f.nameAlt, lang)
        f.nameAlt = enName
        f.description = localizedField(tr, 'description', f.description)
        f.usesBenefits = localizedField(tr, 'usesBenefits', f.usesBenefits)
        f.servingGuidance = localizedField(tr, 'servingGuidance', f.servingGuidance)
        f.precautions = localizedField(tr, 'precautions', f.precautions)
        data.claims.forEach(function (c) { if (lang === 'hi' && c.statementHi) c.statement = c.statementHi; delete c.statementHi })
      } else {
        var rm = data.remedy
        rm.name = localizedName(tr, rm.name, rm.nameAlt, lang)
        rm.nameAlt = enName
        rm.category = localizedField(tr, 'category', rm.category)
        rm.description = localizedField(tr, 'description', rm.description)
        rm.indications = localizedField(tr, 'indications', rm.indications)
        rm.potencyDosage = localizedField(tr, 'potencyDosage', rm.potencyDosage)
        rm.precautions = localizedField(tr, 'precautions', rm.precautions)
        rm.dmr.disclaimer = HOMEOPATHY_DISCLAIMER[lang === 'hi' ? 'hi' : 'en']
        if (data._claims) { rm.claims = data._claims; rm.claims.forEach(function (c) { if (lang === 'hi' && c.statementHi) c.statement = c.statementHi; delete c.statementHi }) }
        delete data._claims
        if (data.related && data.related.length) {
          return translationsFor('homeopathy', data.related.map(function (r) { return r.slug }), lang).then(function (rtrs) {
            data.related = data.related.map(function (r) { return Object.assign({}, r, { name: localizedName(rtrs[r.slug], r.name, null, lang) }) })
            return data
          })
        }
      }
      return data
    })
  }

  var HOMEOPATHY_DISCLAIMER = {
    en: 'Homeopathic remedies are highly diluted preparations. The scientific consensus (including the 2017 NIH-endorsed assessment by the European and Australian science academies) is that homeopathy is not a reliable, evidence-based treatment: any perceived benefit is consistent with placebo and natural recovery. This listing documents classical homeopathic materia medica for educational reference only and does not endorse clinical efficacy. Do not use homeopathic remedies as a substitute for conventional medical care in acute or serious illness.',
    hi: 'होम्योपैथिक औषधियाँ अत्यंत तनु (डाइल्यूट) रूप में होती हैं। वैज्ञानिक सहमति (2017 का NIH-समर्थित मूल्यांकन सहित) यह है कि होम्योपैथी एक विश्वसनीय, प्रमाण-आधारित उपचार नहीं है — कोई भी लाभ प्लेसीबो और स्वाभाविक स्वास्थ्य-लाभ के अनुरूप है। यह सूची केवल शैक्षिक संदर्भ हेतु शास्त्रीय होम्योपैथिक मैटेरिया मेडिका का दस्तावेज़ीकरण है और नैदानिक प्रभावकारिता का समर्थन नहीं करती। गंभीर या तीव्र बीमारी में होम्योपैथिक औषधियों को पारंपरिक चिकित्सा देखभाल का विकल्प न बनाएँ।',
  }

  var detailFiles = { herbs: 'details/herbs.json', yoga: 'details/yoga.json', asanas: 'details/yoga.json', foods: 'details/foods.json', homeopathy: 'details/homeopathy.json', remedies: 'details/homeopathy.json' }
  function serveDetail(entity, slug, u) {
    var lang = resolveContentLang(u.searchParams.get('language'))
    return load(detailFiles[entity]).then(function (all) {
      var rec = all[slug]
      var lookup = rec ? Promise.resolve(null) : repFor(slug)
      return lookup.then(function (rep) {
        rec = rec || all[rep]
        if (!rec) return { notFound: true }
        var data = jsonClone(rec)
        return applyDetailLocalization(entity, data, lang)
      })
    })
  }

  // ── daily picks ──────────────────────────────────────────────────────────
  function fnv1a(str) {
    var h = 0x811c9dc5
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
  }
  function todayKey() {
    var d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  function isCleanName(name) {
    if (!name) return false
    if (name !== name.trim()) return false
    if (name.includes(' - ')) return false
    if (name.includes('  ')) return false
    if (/[)\]:;,]$/.test(name)) return false
    if (/^(var\.?|misc|other|unknown|general|ayurvedic formula|constitutional)/i.test(name)) return false
    if (name.length > 40) return false
    return true
  }
  function pickSlug(triples, seed) {
    var count = triples.length
    if (!count) return null
    var idx = seed % count
    for (var w = 0; w < 5; w++) {
      var skip = (idx + w * 200) % count
      var end = Math.min(skip + 200, count)
      for (var i = skip; i < end; i++) if (isCleanName(triples[i][1])) return triples[i]
    }
    return triples[idx]
  }

  function serveDaily(u) {
    var lang = resolveContentLang(u.searchParams.get('language'))
    var date = todayKey()
    return Promise.all([
      load('lists/herbs-slim.json'), load('lists/yoga-slim.json'),
      load('lists/foods-slim.json'), load('lists/remedies-slim.json'),
      load('daily/seeds.json'),
    ]).then(function (res) {
      var herbs = res[0], yogas = res[1], foods = res[2], remedies = res[3], seeds = res[4]
      var bySlug = function (rows) { var m = {}; rows.forEach(function (r) { m[r.slug] = r }); return m }
      var hIdx = bySlug(herbs), aIdx = bySlug(yogas), fIdx = bySlug(foods), rIdx = bySlug(remedies)

      // seeds entries are [slug, cleanName, nameHi] triples
      var hPick = pickSlug(seeds.herbs, fnv1a(date + ':herb'))
      var aPick = pickSlug(seeds.asanas, fnv1a(date + ':asana'))
      var fPick = pickSlug(seeds.foods, fnv1a(date + ':food'))
      var rPick = pickSlug(seeds.remedies, fnv1a(date + ':remedy'))
      var hSlug = hPick ? hPick[0] : null
      var aSlug = aPick ? aPick[0] : null
      var fSlug = fPick ? fPick[0] : null
      var rSlug = rPick ? rPick[0] : null

      // quiz — deterministic per date over quiz rows
      var quizPromise = load('daily/quiz.json').then(function (qRows) {
        var quizCount = qRows.length
        var quiz = []
        if (!quizCount) return quiz
        var used = {}
        var guard = 0
        while (quiz.length < 3 && guard < 12 && Object.keys(used).length < quizCount) {
          guard++
          var skip = fnv1a(date + ':quiz:' + guard) % quizCount
          if (used[skip]) continue
          used[skip] = 1
          var c = qRows[skip]
          if (!c) continue
          if (c.statement.length < 40 || c.statement.length > 260) continue
          quiz.push({
            id: c.id,
            entity: pick(lang, { herb: 'Herb', yoga: 'Yoga', nutrition: 'Nutrition', homeopathy: 'Homeopathy', condition: 'Condition' }[c.entityType] || 'Entry', {
              herb: 'जड़ी-बूटी', yoga: 'योग', nutrition: 'पोषण', homeopathy: 'होम्योपैथी', condition: 'स्थिति',
            }[c.entityType] || 'प्रविष्टि'),
            statement: pick(lang, c.statement, c.statementHi || c.statement),
            answer: c.evidenceTier,
            source: c.publisher,
          })
        }
        return quiz
      })

      var pickDetail = function (entity, slug) {
        if (!slug) return Promise.resolve(null)
        return serveDetail(entity, slug, u).then(function (d) {
          if (!d || d.notFound) return null
          return d
        })
      }

      return Promise.all([quizPromise, pickDetail('herbs', hSlug), pickDetail('yoga', aSlug), pickDetail('foods', fSlug), pickDetail('homeopathy', rSlug)]).then(function (all) {
        var quiz = all[0]
        var H = all[1] && all[1].herb, A = all[2] && all[2].asana, F = all[3] && all[3].food, R = all[4] && all[4].remedy
        var hr = hSlug ? herbs.filter(function (r) { return r.slug === hSlug })[0] : null
        var ar = aSlug ? yogas.filter(function (r) { return r.slug === aSlug })[0] : null
        var fr = fSlug ? foods.filter(function (r) { return r.slug === fSlug })[0] : null
        var rr = rSlug ? remedies.filter(function (r) { return r.slug === rSlug })[0] : null
        return translationsFor('herbs', hSlug ? [hSlug] : [], lang).then(function (trH) {
          return translationsFor('yoga', aSlug ? [aSlug] : [], lang).then(function (trA) {
            return translationsFor('foods', fSlug ? [fSlug] : [], lang).then(function (trF) {
              return translationsFor('homeopathy', rSlug ? [rSlug] : [], lang).then(function (trR) {
                return {
                  date: date,
                  picks: {
                    herb: hr && H ? {
                      section: 'herbs', slug: hr.slug,
                      name: localizedName(trH[hr.slug], hr.name, hr.nameHi, lang),
                      sub: H.sanskritName || H.latinBinomial,
                      tier: H.evidenceGrade || 'T', category: H.category, image: H.image,
                      blurb: localizedField(trH[hr.slug], 'description', H.description) || null,
                    } : null,
                    asana: ar && A ? {
                      section: 'yoga', slug: ar.slug,
                      name: localizedName(trA[ar.slug], ar.name, ar.nameHi, lang),
                      sub: A.sanskrit, tier: A.evidenceGrade || 'T', category: A.category, image: A.image,
                      blurb: localizedField(trA[ar.slug], 'description', A.description) || null,
                    } : null,
                    food: fr && F ? {
                      section: 'nutrition', slug: fr.slug,
                      name: localizedName(trF[fr.slug], fr.name, fr.nameHi, lang),
                      sub: F.scientificClass || F.category,
                      tier: F.evidenceGrade || 'T', category: F.category, image: F.image,
                      blurb: localizedField(trF[fr.slug], 'usesBenefits', F.usesBenefits) || F.description || null,
                      calories: F.calories,
                    } : null,
                    remedy: rr && R ? {
                      section: 'homeopathy', slug: rr.slug,
                      name: localizedName(trR[rr.slug], rr.name, rr.nameHi || rr.name, lang),
                      sub: R.translit || R.latinSource || R.category,
                      tier: R.evidenceTier, category: R.category, image: R.image,
                      blurb: localizedField(trR[rr.slug], 'description', R.description) || null,
                    } : null,
                  },
                  quiz: quiz,
                }
              })
            })
          })
        })
      })
    })
  }

  // ── search ───────────────────────────────────────────────────────────────
  function serveSearch(u) {
    var q = u.searchParams.get('q') || ''
    var lang = resolveContentLang(u.searchParams.get('language'))
    var raw = q.toLowerCase().trim()
    var empty = { query: q, expandedTerms: [], herbs: [], yoga: [], foods: [], conditions: [], homeopathy: [] }
    if (!raw) return Promise.resolve(empty)
    var CAP = 30
    return Promise.all([load('synonyms.json'), load('search/corpus.json'), load('conditions.json'), load('tiers.json')]).then(function (res) {
      var synRows = res[0], corpus = res[1], conds = res[2], tiers = res[3]
      var terms = {}
      terms[raw] = 1
      synRows.forEach(function (row) {
        if (row.c.toLowerCase() === raw || row.s.some(function (s) { return s.toLowerCase() === raw })) {
          terms[row.c.toLowerCase()] = 1
          row.s.forEach(function (s) { terms[s.toLowerCase()] = 1 })
        }
      })
      var termList = Object.keys(terms)
      function matches(text) {
        if (!text) return false
        var t = text.toLowerCase()
        if (t.indexOf(raw) !== -1) return true
        return termList.some(function (term) { return t.indexOf(term) !== -1 })
      }
      function synMatches(syn) {
        if (!syn) return false
        var t = (typeof syn === 'string' ? parseJ(syn, []) : syn).join(' ').toLowerCase()
        return t.indexOf(raw) !== -1 || termList.some(function (term) { return t.indexOf(term) !== -1 })
      }

      var herbHits = corpus.herbs.filter(function (h) { return matches(h.name) || matches(h.hi) || matches(h.latin) || matches(h.sk) || synMatches(h.syn) })
      var yogaHits = corpus.yoga.filter(function (a) { return matches(a.name) || matches(a.sk) || matches(a.hi) || matches(a.cat) })
      var foodHits = corpus.foods.filter(function (f) { return matches(f.name) || matches(f.hi) })
      var condHits = conds.filter(function (c) { return matches(c.nameEn) || matches(c.nameHi) || matches(c.description) })
      var remedyHits = corpus.remedies.filter(function (r) { return matches(r.name) || matches(r.hi) || matches(r.latin) || matches(r.cat) || synMatches(r.syn) })

      var herbTop = herbHits.slice(0, CAP), yogaTop = yogaHits.slice(0, CAP), foodTop = foodHits.slice(0, CAP), condTop = condHits.slice(0, CAP), remedyTop = remedyHits.slice(0, CAP)

      // server dedupes nothing — it returns row-level hits; keep row slug, resolve names
      return Promise.all([
        translationsFor('herbs', herbTop.map(function (h) { return h.rep }), lang),
        translationsFor('yoga', yogaTop.map(function (a) { return a.rep }), lang),
        translationsFor('foods', foodTop.map(function (f) { return f.rep }), lang),
        translationsFor('homeopathy', remedyTop.map(function (r) { return r.rep }), lang),
      ]).then(function (trs) {
        var trH = trs[0], trY = trs[1], trF = trs[2], trR = trs[3]
        function tierOf(map, slug) { return map[slug] || 'T' }
        return {
          query: q,
          expandedTerms: termList.filter(function (t) { return t !== raw }).slice(0, 8),
          herbs: herbTop.map(function (h) { return { slug: h.rep, name: localizedName(trH[h.rep], h.name, h.hi, lang), sub: h.latin, tier: tierOf(tiers.herb, h.rep), image: h.img } }),
          yoga: yogaTop.map(function (a) { return { slug: a.rep, name: localizedName(trY[a.rep], a.name, a.hi, lang), sub: a.sk, tier: tierOf(tiers.yoga, a.rep), image: a.img } }),
          foods: foodTop.map(function (f) { return { slug: f.rep, name: localizedName(trF[f.rep], f.name, f.hi, lang), sub: f.cal != null ? f.cal + ' kcal / 100 g' : (f.cat || '').replace(/-/g, ' '), tier: null, image: f.img } }),
          conditions: condTop.map(function (c) { return { slug: c.slug, name: lang === 'hi' ? (c.nameHi || c.nameEn) : c.nameEn, sub: c.icdCode ? 'ICD ' + c.icdCode : '', tier: c.evidenceTier } }),
          homeopathy: remedyTop.map(function (r) { return { slug: r.rep, name: localizedName(trR[r.rep], r.name, r.hi, lang), sub: r.latin || r.cat, tier: r.tier || 'T', image: r.img } }),
        }
      })
    })
  }

  // note: server food search sub = calories kcal line when present
  // (kept simple above — categories render equally well offline)

  // ── interactions checker ─────────────────────────────────────────────────
  var herbTermIndex = null
  function serveInteractions(u, body) {
    var herbs = (body.herbs || []).map(function (h) { return h.toLowerCase().trim() }).filter(Boolean)
    var medications = (body.medications || []).map(function (m) { return m.toLowerCase().trim() }).filter(Boolean)
    if (!herbs.length || !medications.length) return Promise.resolve({ error: 'Both herbs[] and medications[] are required', status: 400 })
    var norm = function (s) { return s.toLowerCase().replace(/[-_]+/g, ' ').trim() }
    return Promise.all([load('search/corpus.json'), load('interactions.json')]).then(function (res) {
      var corpus = res[0], rules = res[1]
      if (!herbTermIndex) {
        herbTermIndex = corpus.herbs.map(function (row) {
          var terms = {}
          var add = function (t) { var n = norm(t || ''); if (n) terms[n] = 1 }
          add(row.slug); add(row.name); add(row.sk)
          parseJ(row.syn, []).forEach(add)
          return { slug: row.slug, terms: Object.keys(terms) }
        })
      }
      var herbKeys = {}
      herbs.forEach(function (h) {
        herbKeys[norm(h)] = 1
        var q = norm(h)
        if (q) {
          herbTermIndex.forEach(function (entry) {
            var hit = entry.terms.some(function (t) { return t === q || t.indexOf(q) !== -1 || q.indexOf(t) !== -1 })
            if (hit) herbKeys[norm(entry.slug)] = 1
          })
        }
      })
      var byHerb = rules.filter(function (r) {
        var slug = norm(r.herbSlug)
        if (herbKeys[slug]) return true
        return Object.keys(herbKeys).some(function (k) { return k.length > 3 && (slug.indexOf(k) !== -1 || k.indexOf(slug) !== -1) })
      })
      var matchesArr = byHerb.filter(function (r) {
        return medications.some(function (m) { return m.indexOf(r.medicationPattern) !== -1 }) ||
               medications.some(function (m) { return r.medicationPattern.indexOf(m) !== -1 })
      })
      if (!matchesArr.length) {
        return {
          interaction_found: false, severity: 'none',
          description: 'No known interactions for this combination in the current screening database. Absence of data is not proof of safety.',
          actionable_advice: 'Always inform your prescribing physician about all supplements you take. If you feel unwell after combining, stop the supplement and seek advice.',
          matches: [],
        }
      }
      var RANK = { high: 3, moderate: 2, mild: 1 }
      matchesArr.sort(function (a, b) { return (RANK[b.severity] || 0) - (RANK[a.severity] || 0) })
      var worst = matchesArr[0]
      return {
        interaction_found: true, severity: worst.severity,
        description: worst.descriptionEn, actionable_advice: worst.adviceEn,
        matches: matchesArr.map(function (m) {
          return { herb: m.herbSlug, medication: m.medicationLabel, severity: m.severity, description: m.descriptionEn, actionable_advice: m.adviceEn, sources: m.sources || [] }
        }),
      }
    })
  }

  // ── consent (device-local under DPDP) ────────────────────────────────────
  function consentEntries() {
    try { return JSON.parse(window.localStorage.getItem('sanjeevani_offline_consent') || '[]') } catch (e) { return [] }
  }
  function serveConsent(method, u, body) {
    if (method === 'POST') {
      var clientId = body.clientId, purpose = body.purpose, granted = body.granted
      if (!clientId || !purpose || typeof granted !== 'boolean') return Promise.resolve({ error: 'clientId, purpose and granted(boolean) required', status: 400 })
      var entries = consentEntries()
      var now = new Date().toISOString()
      var existing = entries.filter(function (e) { return e.clientId === clientId && e.purpose === purpose })[0]
      var entry
      if (existing) {
        existing.status = granted ? 'granted' : 'revoked'
        existing.revokedAt = granted ? null : now
        entry = existing
      } else {
        entry = { id: entries.length + 1, clientId: clientId, purpose: purpose, status: granted ? 'granted' : 'revoked', grantedAt: now, revokedAt: granted ? null : now }
        entries.push(entry)
      }
      window.localStorage.setItem('sanjeevani_offline_consent', JSON.stringify(entries))
      return Promise.resolve({ entry: entry })
    }
    if (method === 'DELETE') {
      var clientId2 = u.searchParams.get('clientId')
      if (!clientId2) return Promise.resolve({ error: 'clientId required', status: 400 })
      var remaining = consentEntries().filter(function (e) { return e.clientId !== clientId2 })
      var erased = consentEntries().length - remaining.length
      window.localStorage.setItem('sanjeevani_offline_consent', JSON.stringify(remaining))
      return Promise.resolve({ erased: erased })
    }
    var clientId3 = u.searchParams.get('clientId')
    if (!clientId3) return Promise.resolve({ error: 'clientId required', status: 400 })
    var list = consentEntries().filter(function (e) { return e.clientId === clientId3 })
    return Promise.resolve({ entries: list })
  }

  // ── router ───────────────────────────────────────────────────────────────
  function route(method, url, body) {
    var p = url.pathname.replace(/\/+$/, '')
    if (method === 'GET' && p === '/api') return Promise.resolve({ message: 'Hello, world!' })
    if (method === 'GET' && p === '/api/v1/stats') {
      return load('meta.json').then(function (m) { return m.stats })
    }
    if (method === 'GET' && (p === '/api/v1/herbs' || p === '/api/v1/asanas' || p === '/api/v1/yoga' || p === '/api/v1/foods' || p === '/api/v1/homeopathy' || p === '/api/v1/remedies')) {
      return serveList(p.split('/').pop(), url)
    }
    var m = p.match(/^\/api\/v1\/(herbs|asanas|yoga|foods|homeopathy|remedies)\/([^/]+)$/)
    if (m && method === 'GET') {
      return serveDetail(m[1], decodeURIComponent(m[2]), url)
    }
    if (method === 'GET' && p === '/api/v1/daily') return serveDaily(url)
    if (method === 'GET' && p === '/api/v1/search') return serveSearch(url)
    if (method === 'GET' && p === '/api/v1/conditions') {
      return load('conditions.json').then(function (rows) {
        var lang = url.searchParams.get('language') === 'hi' ? 'hi' : 'en'
        return { conditions: rows.map(function (c) { return { slug: c.slug, name: lang === 'hi' ? c.nameHi : c.nameEn, namasteCode: c.namasteCode, icdCode: c.icdCode, tm2Category: c.tm2Category, description: c.description, evidenceTier: c.evidenceTier } }) }
      })
    }
    if (p === '/api/v1/interactions/check') {
      if (method !== 'POST') return Promise.resolve({ error: 'Method not allowed', status: 405 })
      return serveInteractions(url, body || {})
    }
    if (p === '/api/v1/consent') return serveConsent(method, url, body || {})
    if (method === 'GET' && p === '/api/v1/translate') return Promise.resolve({})
    if (method === 'GET' && (p === '/api/v1/admin/claims' || p.indexOf('/api/v1/admin/claims/') === 0)) {
      return Promise.resolve({ claims: [] })
    }
    return null // not an API route — pass through
  }

  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? new URL(input, window.location.href) : (input instanceof URL ? input : new URL(input.url, window.location.href))
      var method = (init && init.method) || (typeof input === 'object' && input && input.method) || 'GET'
      method = method.toUpperCase()
      if (url.origin === window.location.origin && url.pathname.indexOf('/api/') === 0) {
        var bodyPromise = Promise.resolve()
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          bodyPromise = Promise.resolve(init && init.body).then(function (b) {
            if (!b) return {}
            if (typeof b === 'string') { try { return JSON.parse(b) } catch (e) { return {} } }
            return {}
          })
        }
        return bodyPromise.then(function (body) {
          return route(method, url, body)
        }).then(function (result) {
          if (result === null) return origFetch(input, init)
          var status = result.status && result.error ? result.status : 200
          var clean = Object.assign({}, result)
          delete clean.status
          return new Response(JSON.stringify(clean), {
            status: status,
            headers: { 'Content-Type': 'application/json' },
          })
        }).catch(function (e) {
          return new Response(JSON.stringify({ error: 'offline_data_error', detail: String(e && e.message || e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
        })
      }
    } catch (e) { /* fall through to network */ }
    return origFetch(input, init)
  }

  if (NATIVE) {
    // Flag for the native shell / debugging
    window.SANJEEVANI_OFFLINE = true
  }
})()
