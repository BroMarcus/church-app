import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const login=fs.readFileSync(new URL('../src/app/login/page.tsx',import.meta.url),'utf8')

test('low-tech login uses One Kingdom consistently without weakening the login-first flow',()=>{
  assert.match(login,/Welcome to One Kingdom\./)
  assert.match(login,/Bienvenido a One Kingdom\./)
  assert.match(login,/ONE KINGDOM • PILOT/)
  assert.match(login,/Choose Log in if you have ever used One Kingdom before/)
  assert.match(login,/Elige Iniciar sesión si alguna vez has usado One Kingdom/)
  assert.match(login,/account you already have\. Log in with that same account/)
  assert.match(login,/cuenta de One Kingdom que ya tienes/)
  assert.doesNotMatch(login,/Kingdom Network/)
  assert.match(login,/const mode=explicitSignup&&canCreate\?'signup':'signin'/)
  assert.match(login,/Do not make another one/)
  assert.match(login,/No crees otra/)
})
