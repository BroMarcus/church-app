import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('failed auth email links return to sign in',async()=>{
  const source=await read('src/app/auth/callback/route.ts')
  assert.match(source,/\/login\?lang=\$\{lang\}&mode=signin&error=/)
})

test('password update blocks duplicate submissions and returns to sign in',async()=>{
  const source=await read('src/app/auth/update-password/page.tsx')
  assert.match(source,/if\(busy\)return/)
  assert.match(source,/disabled=\{busy\}/)
  assert.match(source,/aria-busy=\{busy\}/)
  assert.match(source,/mode=signin&message=/)
})

test('church-specific signup hides raw auth failures',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/friendlySignupError/)
  assert.match(source,/console\.error\('joinChurch signup failed'/)
  assert.doesNotMatch(source,/fail\(error\.message,error\.message\)/)
})

test('existing-account church signup guidance does not imply automatic membership',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/church admin can add that account without creating another one/)
  assert.match(source,/un administrador puede añadir tu cuenta sin crear otra/)
  assert.match(source,/mode=signin&message=/)
})

test('Kingdom Guide resource search is accent tolerant and language preserving',async()=>{
  const source=await read('src/app/guide/page.tsx')
  assert.match(source,/normalize\('NFD'\)/)
  assert.match(source,/queryTokens=normalizedQuery\.split/)
  assert.match(source,/__matchedTokens===queryTokens\.length/)
  assert.match(source,/withLang\(`\/resources\?q=/)
})

test('pilot readiness hides raw backend errors and exposes one next action',async()=>{
  const source=await read('src/app/church/readiness/page.tsx')
  assert.match(source,/console\.error\('church_pilot_readiness failed'/)
  assert.doesNotMatch(source,/\{t\.load\} \{error\.message\}/)
  assert.match(source,/const nextAction=rows\.find/)
  assert.match(source,/statusLabel\(r\.check_status,lang\)/)
})
