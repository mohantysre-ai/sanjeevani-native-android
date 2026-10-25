// Auto-resume the resumable translation pipeline at server boot.
// The sandbox reboots unpredictably and kills every process; the dev server
// is relaunched by the supervisor, so hooking here means the pipeline always
// comes back. Self-disabling once all UI packs are complete. Idempotent via
// a lock file. Harmless in production (only spawns while packs are missing).
//
// TURBOFIX-2: imports are routed through a Function constructor so the
// bundler cannot statically resolve them — Turbopack used to hoist
// `await import('fs')` into the Edge runtime bundle and crash compilation.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>
    const fs = (await dynImport('fs')) as typeof import('fs')
    const cp = (await dynImport('child_process')) as typeof import('child_process')
    const { readdirSync, readFileSync, existsSync, openSync, closeSync, unlinkSync } = fs
    const { spawn } = cp

    const LOCALES = '/home/z/my-project/public/locales'
    const LOCK = '/home/z/my-project/scripts/.pipeline.lock'

    // stale-lock liveness: if a lock exists but no pipeline process is
    // actually running (sandbox killed everything), reclaim the lock.
    if (existsSync(LOCK)) {
      let alive = false
      try {
        for (const pid of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
          try {
            const cmd = readFileSync(`/proc/${pid}/cmdline`, 'utf8')
            if (cmd.includes('gen_packs') || cmd.includes('chain_content_seed')) {
              alive = true
              break
            }
          } catch {}
        }
      } catch {}
      if (!alive) {
        try {
          unlinkSync(LOCK)
        } catch {}
      } else {
        return // pipeline genuinely running — do nothing
      }
    }

    // completeness: every language pack declared in the registry must have
    // 363 UI keys (the current table size). Count registry packs from
    // src/lib/i18n.ts so this stays correct if packs are added.
    const src = readFileSync('/home/z/my-project/src/lib/i18n.ts', 'utf8')
    const packs = [...src.matchAll(/pack:\s*'([^']+)'/g)].map((m) => m[1])
    const distinct = [...new Set(packs)]
    let missing = 0
    for (const p of distinct) {
      const f = `${LOCALES}/${p}.json`
      if (!existsSync(f)) {
        missing++
        continue
      }
      try {
        if (Object.keys(JSON.parse(readFileSync(f, 'utf8'))).length < 363) missing++
      } catch {
        missing++
      }
    }
    if (missing === 0) return // all packs complete — nothing to do, forever

    closeSync(openSync(LOCK, 'w'))
    const child = spawn(
      'bash',
      [
        '-c',
        [
          'WORKERS=3 npx tsx scripts/gen_packs.mts >> scripts/packs.log 2>&1',
          'echo "$(date) packs exit=$?" >> scripts/chain.log',
          'bash scripts/chain_content_seed.sh >> scripts/chain.log 2>&1',
          'rm -f scripts/.pipeline.lock',
        ].join(' && '),
      ],
      {
        cwd: '/home/z/my-project',
        env: { ...process.env },
        stdio: 'ignore',
        detached: false,
      },
    )
    child.unref()
    console.log(`[instrumentation] pipeline auto-resumed (${missing} packs incomplete), pid ${child.pid}`)
  } catch (e) {
    console.log(`[instrumentation] pipeline resume skipped: ${String(e).slice(0, 120)}`)
  }
}
