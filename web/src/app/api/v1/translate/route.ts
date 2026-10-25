// GET /api/v1/translate?language=<lang>&section=<s>&slug=<slug>
// On-demand translation of one entry into any supported language. Result is
// persisted into ContentTranslation, so it is computed at most once per
// (lang, section, slug) — afterwards it is a plain DB read for the whole
// platform. 404/400 for bad input; 503 (graceful) when the LLM is
// unavailable, so the client keeps showing English.
import { NextRequest, NextResponse } from 'next/server'
import { translateEntity } from '@/lib/server/translate'

export async function GET(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('language') || ''
  const section = req.nextUrl.searchParams.get('section') || ''
  const slug = req.nextUrl.searchParams.get('slug') || ''

  if (!lang || !section || !slug) {
    return NextResponse.json({ error: 'language, section and slug are required' }, { status: 400 })
  }

  const res = await translateEntity(section, slug, lang)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })

  return NextResponse.json({ language: lang, section, slug, name: res.name, fields: res.fields, cached: res.cached })
}
