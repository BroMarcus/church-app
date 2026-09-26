import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const reset=fs.readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

test('password reset identifies the authenticated account before changing its password',()=>{
  assert.match(reset,/account:'Resetting password for'/)
  assert.match(reset,/account:'Cambiando la contraseña para'/)
  assert.match(reset,/const \[accountEmail,setAccountEmail\]=useState\(''\)/)
  assert.match(reset,/setAccountEmail\(data\.session\.user\.email\|\|''\)/)
  assert.match(reset,/setAccountEmail\(session\.user\.email\|\|''\)/)
  assert.match(reset,/ready&&accountEmail&&/)
  assert.match(reset,/Make sure this is the One Kingdom account you meant to reset/)
  assert.match(reset,/Confirma que esta sea la cuenta de One Kingdom que querías cambiar/)
})
