import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source=fs.readFileSync('src/app/auth/update-password/page.tsx','utf8')

test('password reset refuses to show the update form without a confirmed account email',()=>{
  assert.match(source,/accountMissing:/)
  assert.match(source,/if\(!email\)\{setAccountEmail\(''\);setRetryAvailable\(false\);setReady\(false\);setMessage\(c\.accountMissing\);return false\}/)
  assert.match(source,/if\(!accountEmail\)\{setReady\(false\);setMessage\(t\.accountMissing\);return\}/)
})

test('password reset re-verifies the same authenticated account immediately before changing the password',()=>{
  assert.match(source,/const identity=await supabase\.auth\.getUser\(\)/)
  assert.match(source,/currentEmail\.toLowerCase\(\)!==accountEmail\.toLowerCase\(\)/)
  assert.match(source,/setReady\(false\);setMessage\(t\.accountChanged\);return/)
  assert.match(source,/data\.user\.id!==identity\.data\.user\.id/)
})

test('missing or changed identity guidance is bilingual and fail-closed',()=>{
  assert.match(source,/accountMissing:'We opened a reset session but could not safely confirm which email account it belongs to\./)
  assert.match(source,/accountChanged:'The signed-in account changed while this reset page was open\./)
  assert.match(source,/accountMissing:'Abrimos una sesión para cambiar la contraseña, pero no pudimos confirmar de forma segura a qué correo pertenece\./)
  assert.match(source,/accountChanged:'La cuenta con sesión iniciada cambió mientras esta página estaba abierta\./)
})
