import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Start Here never exposes an unknown internal membership role code',async()=>{
  const source=await read('src/app/start/page.tsx')
  assert.match(source,/return labels\[lang\]\[value\]\|\|labels\[lang\]\.member/)
  assert.doesNotMatch(source,/return labels\[lang\]\[value\]\|\|value\.replaceAll/)
  assert.match(source,/member:'Member'/)
  assert.match(source,/member:'Miembro'/)
})

test('first-login and Kingdom Guide crash recovery stays bilingual and member-safe',async()=>{
  for(const path of ['src/app/start/error.tsx','src/app/guide/error.tsx']){
    const source=await read(path)
    assert.match(source,/en:\{/)
    assert.match(source,/es:\{/)
    assert.match(source,/params\.get\('lang'\)==='es'/)
    assert.match(source,/role="alert"/)
    assert.doesNotMatch(source,/error\.message/)
  }
})

test('Fresh Church Setup recovery stays bilingual and does not render raw provider errors',async()=>{
  for(const path of ['src/app/church/launch/error.tsx','src/app/church/setup-inbox/error.tsx']){
    const source=await read(path)
    assert.match(source,/en:\{/)
    assert.match(source,/es:\{/)
    assert.match(source,/lang/)
    assert.match(source,/role="alert"/)
    assert.doesNotMatch(source,/error\.message/)
  }
})

test('pilot auth and join surfaces keep raw provider messages out of rendered redirects',async()=>{
  const paths=['src/app/login/actions.ts','src/app/join/[slug]/actions.ts','src/app/auth/callback/route.ts','src/app/auth/verify/actions.ts']
  for(const path of paths){
    const source=await read(path)
    assert.doesNotMatch(source,/encodeURIComponent\(\s*(?:error|authError|rpcError)\.message\s*\)/)
    assert.doesNotMatch(source,/redirect\([^\n]*(?:error|authError|rpcError)\.message/)
  }
})
