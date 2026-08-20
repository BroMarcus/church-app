import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('login ignores arbitrary query text and renders only allowlisted bilingual status codes',async()=>{
  const page=await read('src/app/login/page.tsx')
  const actions=await read('src/app/login/actions.ts')
  const callback=await read('src/app/auth/callback/route.ts')
  assert.match(page,/error_code\?:string;message_code\?:string/)
  assert.match(page,/const authStatus=/)
  assert.doesNotMatch(page,/params\.error\b/)
  assert.doesNotMatch(page,/params\.message\b/)
  assert.match(actions,/statusPart\('message','reset_sent'\)/)
  assert.match(actions,/statusPart\('message','confirmation_sent'\)/)
  assert.doesNotMatch(actions,/[&?]error=\+?encodeURIComponent/)
  assert.doesNotMatch(actions,/[&?]message=\+?encodeURIComponent/)
  assert.match(callback,/error_code=/)
})

test('public church join uses fixed bilingual error codes and never renders raw query error text',async()=>{
  const page=await read('src/app/join/[slug]/page.tsx')
  const actions=await read('src/app/join/[slug]/actions.ts')
  assert.match(page,/error_code\?:string/)
  assert.match(page,/const joinErrors=/)
  assert.doesNotMatch(page,/query\.error\b/)
  assert.match(actions,/error_code=/)
  assert.match(actions,/fail\('capacity_full'\)/)
  assert.match(actions,/fail\('inactive_access'\)/)
  assert.match(actions,/fail\('join_failed'\)/)
  assert.doesNotMatch(actions,/[&?]error=\$\{encodeURIComponent/)
})

test('Start Here uses fixed status codes for onboarding and existing-account join results',async()=>{
  const page=await read('src/app/start/page.tsx')
  const actions=await read('src/app/start/actions.ts')
  const joinActions=await read('src/app/join/[slug]/actions.ts')
  assert.match(page,/error_code\?:string;message_code\?:string/)
  assert.match(page,/const startStatus=/)
  assert.doesNotMatch(page,/params\.error\b/)
  assert.doesNotMatch(page,/params\.message\b/)
  assert.match(page,/role="alert"/)
  assert.match(page,/role="status" aria-live="polite"/)
  assert.match(actions,/error_code=save_failed/)
  assert.match(actions,/console\.error\('complete onboarding failed'/)
  assert.match(joinActions,/message_code=\$\{row\?\.already_member\?'already_joined':'joined_existing'\}/)
})