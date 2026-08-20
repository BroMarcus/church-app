import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('church-specific public join never exposes raw Supabase auth errors',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/friendlySignupError/)
  assert.match(source,/console\.error\('joinChurch signup failed'/)
  assert.doesNotMatch(source,/fail\(error\.message,error\.message\)/)
})

test('church-specific public join gives safe guidance for an existing account',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/data\.user&&Array\.isArray\(data\.user\.identities\)&&data\.user\.identities\.length===0/)
  assert.match(source,/church admin can add that account without creating another one/)
  assert.match(source,/un administrador puede añadir tu cuenta sin crear otra/)
  assert.match(source,/mode=signin&message=/)
})

test('church-specific public join preserves bilingual onboarding destination',async()=>{
  const source=await read('src/app/join/[slug]/actions.ts')
  assert.match(source,/const startPath=`\/start\?welcome=1\$\{lang==='es'\?'&lang=es':''\}`/)
  assert.match(source,/preferred_language:lang/)
  assert.match(source,/public_signup_church_id:church\.church_id/)
})
