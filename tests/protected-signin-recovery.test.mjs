import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('protected pilot pages send signed-out returning users to Sign In, not public signup',()=>{
  const start=read('src/app/start/page.tsx')
  const guide=read('src/app/guide/page.tsx')
  const launch=read('src/app/church/launch/page.tsx')
  const inbox=read('src/app/church/setup-inbox/page.tsx')
  const readiness=read('src/app/church/readiness/page.tsx')

  assert.match(start,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin`\)/)
  assert.match(guide,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin`\)/)
  assert.match(launch,/redirect\(l\('\/login\?mode=signin'\)\)/)
  assert.match(launch,/href=\{l\('\/login\?mode=signin'\)\}/)
  assert.match(inbox,/redirect\(l\('\/login\?mode=signin'\)\)/)
  assert.match(readiness,/redirect\(`\/login\?lang=\$\{lang\}&mode=signin`\)/)

  assert.doesNotMatch(start,/redirect\(`\/login\$\{suffix\}`\)/)
  assert.doesNotMatch(guide,/redirect\(`\/login\?lang=\$\{lang\}`\)/)
  assert.doesNotMatch(inbox,/redirect\(l\('\/login'\)\)/)
})

test('Start Here uses only the selected language in its hero label',()=>{
  const start=read('src/app/start/page.tsx')
  assert.match(start,/className="pill">\{t\.start\.toUpperCase\(\)\}<\/div>/)
  assert.doesNotMatch(start,/START HERE • EMPIEZA AQUÍ/)
})
