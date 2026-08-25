import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const page=read('src/app/account/security/page.tsx')
const actions=read('src/app/account/security/actions.ts')

test('Account Security page distinguishes Auth outages from real signed-out state',()=>{
  assert.match(page,/error:claimsError/)
  assert.match(page,/if\(claimsError\)return recovery/)
  assert.match(page,/error:userError/)
  assert.match(page,/if\(userError\)return recovery/)
  assert.match(page,/if\(!userId\)redirect/)
  assert.match(page,/mode=signin/)
  assert.match(page,/We could not safely load Account Security/)
  assert.match(page,/No pudimos cargar Seguridad de la Cuenta de forma segura/)
})

test('Account Security page catches thrown client and Auth verification failures',()=>{
  assert.match(page,/try\{supabase=await createClient\(\)\}catch\(error\)\{return recovery\(`client:/)
  assert.match(page,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}catch\(error\)\{return recovery\(`claims:/)
  assert.match(page,/try\{userDataResult=await supabase\.auth\.getUser\(\)\}catch\(error\)\{return recovery\(`user:/)
  assert.match(page,/const thrownCode=/)
})

test('Account Security actions fail closed when client startup or claims verification throws',()=>{
  assert.match(actions,/async function getSupabaseOrRedirect/)
  assert.match(actions,/try\{return await createClient\(\)\}/)
  assert.match(actions,/Account security client unavailable/)
  assert.match(actions,/redirect\(failureUrl\(lang,'auth_unavailable',next,invite\)\)/)
  assert.match(actions,/async function requireSignedIn/)
  assert.match(actions,/try\{claimsResult=await supabase\.auth\.getClaims\(\)\}/)
  assert.match(actions,/Account security auth state request unavailable/)
  assert.match(actions,/const \{data:claims,error\}=claimsResult/)
  assert.match(actions,/await requireSignedIn\(supabase,lang,next,invite\)/)
  assert.doesNotMatch(actions,/supabase=await createClient\(\)/)
})

test('All three Account Security actions use protected client startup',()=>{
  const helperCalls=actions.match(/await getSupabaseOrRedirect\(lang,next,invite\)/g)??[]
  assert.equal(helperCalls.length,3)
  assert.match(actions,/export async function changeLoginEmail/)
  assert.match(actions,/export async function changePassword/)
  assert.match(actions,/export async function signOutEverywhere/)
})

test('Sign out everywhere verifies the local browser session is actually gone',()=>{
  assert.match(actions,/signOut\(\{scope:'global'\}\)/)
  assert.match(actions,/verification=await supabase\.auth\.getSession\(\)/)
  assert.match(actions,/global sign-out verification unavailable/)
  assert.match(actions,/global sign-out verification failed/)
  assert.match(actions,/global sign-out left local session present/)
  assert.match(actions,/if\(verification\.data\.session\)/)
  assert.match(actions,/failureUrl\(lang,'signout_failed',next,invite\)/)
})

test('Account Security diagnostics and changed credentials are bounded',()=>{
  assert.match(actions,/candidate\.name\.slice\(0,80\)/)
  assert.match(actions,/candidate\.code\.slice\(0,80\)/)
  assert.match(actions,/const EMAIL_MAX=254/)
  assert.match(actions,/const PASSWORD_MAX=128/)
  assert.match(actions,/email\.length>EMAIL_MAX/)
  assert.match(actions,/password\.length>PASSWORD_MAX\|\|confirm\.length>PASSWORD_MAX/)
  assert.match(page,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
  assert.match(page,/maxLength=\{254\}/)
  assert.match(page,/maxLength=\{128\}/)
})

test('Account Security recovery stays bilingual and does not expose provider text',()=>{
  assert.match(page,/Nothing was changed\. This is usually temporary/)
  assert.match(page,/No se cambió nada\. Normalmente esto es temporal/)
  assert.match(page,/Try again/)
  assert.match(page,/Intentar otra vez/)
  assert.match(page,/Help & Feedback/)
  assert.match(page,/Ayuda y Comentarios/)
  assert.doesNotMatch(page,/claimsError\.message/)
  assert.doesNotMatch(page,/userError\.message/)
})
