import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('password recovery always returns members to sign in instead of public signup',async()=>{
  const callback=await read('src/app/auth/callback/route.ts')
  const update=await read('src/app/auth/update-password/page.tsx')
  assert.match(callback,/\/login\?lang=\$\{lang\}&mode=signin&error=/)
  assert.match(update,/router\.replace\(`\/login\?lang=\$\{lang\}&mode=signin&message=/)
  assert.match(update,/href=\{`\/login\?lang=\$\{lang\}&mode=signin`\}/)
})

test('password update blocks accidental duplicate submission while saving',async()=>{
  const update=await read('src/app/auth/update-password/page.tsx')
  assert.match(update,/if\(busy\)return/)
  assert.match(update,/disabled=\{busy\}/)
  assert.match(update,/aria-busy=\{busy\}/)
})
