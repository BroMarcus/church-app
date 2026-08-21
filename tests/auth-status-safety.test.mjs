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
  assert.match(callback,/const joinNext=next\.startsWith\('\/join\/'\)\?next:''/)
  assert.match(callback,/nextPart=joinNext\?`&next=\$\{encodeURIComponent\(joinNext\)\}`:''/)
})

test('token-hash confirmation and recovery use fixed statuses and preserve safe join context',async()=>{
  const confirm=await read('src/app/auth/confirm/route.ts')
  const verify=await read('src/app/auth/verify/actions.ts')
  for(const source of [confirm,verify]){
    assert.match(source,/function allowedAuthDestination/)
    assert.match(source,/new URL\(raw,canonical\)/)
    assert.match(source,/requested\.origin!==canonical\.origin/)
    assert.match(source,/startsWith\('\/join\/'\)/)
    assert.doesNotMatch(source,/[&?]error=\$?\{?encodeURIComponent/)
    assert.doesNotMatch(source,/[&?]message=\$?\{?encodeURIComponent/)
  }
  assert.match(confirm,/error_code=callback_incomplete/)
  assert.match(verify,/error_code=callback_incomplete/)
  assert.match(verify,/error_code=callback_expired/)
  assert.match(verify,/console\.error\('auth token verification failed'/)
  assert.match(verify,/redirect\(`\/auth\/update-password\?lang=\$\{lang\}\$\{nextPart\}`\)/)
})

test('password reset completion is explicit and preserves only canonical church-join return paths',async()=>{
  const page=await read('src/app/auth/update-password/page.tsx')
  assert.match(page,/function safeJoinNext/)
  assert.match(page,/new URL\(value,base\)/)
  assert.match(page,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(page,/value\.length>500/)
  assert.match(page,/setCompleted\(true\)/)
  assert.match(page,/Continue to sign in/)
  assert.match(page,/Continuar a Iniciar sesión/)
  assert.match(page,/signInHref=`\/login\?lang=\$\{lang\}&mode=signin\$\{nextPart\}`/)
  assert.doesNotMatch(page,/[&?]message=\$\{encodeURIComponent/)
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

test('Join and Start Here recover from unexpected failures in the selected language',async()=>{
  const joinError=await read('src/app/join/[slug]/error.tsx')
  const startError=await read('src/app/start/error.tsx')
  for(const source of [joinError,startError]){
    assert.match(source,/useSearchParams/)
    assert.match(source,/params\.get\('lang'\)==='es'/)
    assert.match(source,/console\.error/)
    assert.match(source,/onClick=\{reset\}/)
    assert.match(source,/mode=signin/)
  }
  assert.match(joinError,/No pudimos abrir esta página de la iglesia/)
  assert.match(startError,/No pudimos cargar tus primeros pasos/)
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
