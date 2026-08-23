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
  assert.match(page,/We could not safely load Account Security/)
  assert.match(page,/No pudimos cargar Seguridad de la Cuenta de forma segura/)
})

test('Account Security actions fail closed when claims cannot be verified',()=>{
  assert.match(actions,/async function requireSignedIn/)
  assert.match(actions,/const \{data:claims,error\}=await supabase\.auth\.getClaims\(\)/)
  assert.match(actions,/failureUrl\(lang,'auth_unavailable'\)/)
  assert.match(actions,/await requireSignedIn\(supabase,lang\)/)
  assert.doesNotMatch(actions,/const lang=langOf\(formData\),supabase=await createClient\(\),\{data:claims\}=await supabase\.auth\.getClaims\(\)/)
})

test('Account Security diagnostics and changed credentials are bounded',()=>{
  assert.match(actions,/candidate\.name\.slice\(0,80\)/)
  assert.match(actions,/candidate\.code\.slice\(0,80\)/)
  assert.match(actions,/const EMAIL_MAX=254/)
  assert.match(actions,/const PASSWORD_MAX=128/)
  assert.match(actions,/email\.length>EMAIL_MAX/)
  assert.match(actions,/password\.length>PASSWORD_MAX\|\|confirm\.length>PASSWORD_MAX/)
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
