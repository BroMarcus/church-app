import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const updatePasswordError=read('src/app/auth/update-password/error.tsx')
const verifyError=read('src/app/auth/verify/error.tsx')
const linkUnavailableError=read('src/app/auth/link-unavailable/error.tsx')

for(const [name,source] of [
  ['password reset',updatePasswordError],
  ['email verification',verifyError],
  ['account recovery fallback',linkUnavailableError],
]){
  test(`${name} crash recovery uses one selected language`,()=>{
    assert.match(source,/useSearchParams/)
    assert.match(source,/params\.get\('lang'\)===['"]es['"]\?['"]es['"]:['"]en['"]/)
    assert.doesNotMatch(source,/Try again\s*\/\s*Intentar/)
    assert.doesNotMatch(source,/temporarily unavailable\.\s*(El|La)/)
    assert.match(source,/role="alert"/)
  })

  test(`${name} crash recovery preserves only validated same-account context`,()=>{
    assert.match(source,/INVITE_ID_PATTERN/)
    assert.match(source,/value\.length<=128/)
    assert.match(source,/value\.length>500/)
    assert.match(source,/!value\.startsWith\('\/'\)/)
    assert.match(source,/value\.startsWith\('\/\/'\)/)
    assert.match(source,/parsed\.pathname\.startsWith\('\/join\/'\)/)
    assert.match(source,/mode=signin/)
    assert.match(source,/encodeURIComponent\(inviteId\)/)
    assert.match(source,/encodeURIComponent\(joinNext\)/)
  })

  test(`${name} crash recovery has a simple retry action`,()=>{
    assert.match(source,/onClick=\{\(\)=>reset\(\)\}/)
  })
}

test('password reset crash recovery explicitly prevents duplicate-account recovery',()=>{
  assert.ok(updatePasswordError.includes('Do not create another account.'))
  assert.ok(updatePasswordError.includes('No crees otra cuenta.'))
})

test('verification crash recovery keeps the newest email guidance in both languages',()=>{
  assert.ok(verifyError.includes('newest confirmation or password-reset link'))
  assert.ok(verifyError.includes('enlace de confirmación o cambio de contraseña más reciente'))
  assert.ok(verifyError.includes('Do not request several new emails'))
  assert.ok(verifyError.includes('No solicites varios correos nuevos'))
})

test('account recovery fallback can return to a validated church join page',()=>{
  assert.match(linkUnavailableError,/\{joinNext&&<a className="ghost" href=\{joinNext\}/)
  assert.ok(linkUnavailableError.includes('Do not create another account'))
  assert.ok(linkUnavailableError.includes('No crees otra cuenta'))
})
