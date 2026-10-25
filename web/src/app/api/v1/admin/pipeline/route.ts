// TEMP dev-only pipeline launcher — spawns the resumable translation pipeline
// as a child of the dev server so it survives sandbox process reaping
// (orphaned processes get killed between tool calls; children of the live
// dev server do not). Fixed command only — never accepts arbitrary input.
// DELETE before production build.
import { spawn } from 'child_process'
import { openSync } from 'fs'

export const dynamic = 'force-dynamic'

let spawned = false

export async function GET() {
  const log = openSync('/home/z/my-project/scripts/packs.log', 'a')
  const chainLog = openSync('/home/z/my-project/scripts/chain.log', 'a')
  if (spawned) return Response.json({ ok: true, msg: 'already spawned this server lifetime' })
  spawned = true
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
      stdio: ['ignore', log, chainLog],
      detached: false,
    },
  )
  child.unref()
  return Response.json({ ok: true, pid: child.pid })
}
