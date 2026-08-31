import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const actions=fs.readFileSync('src/app/start/actions.ts','utf8')
const page=fs.readFileSync('src/app/start/page.tsx','utf8')

test('Start Here action failures use the error_code contract consumed by the page',()=>{
  assert.match(actions,/const startFailure=.*error_code=\$\{code\}/)
  assert.doesNotMatch(actions,/\/start\?lang=\$\{selectedLang\}&error=/)
  assert.match(page,/error_code\?:string/)
  assert.match(page,/params\.error_code/)
})

test('connection and save failures are mapped to distinct plain-language recovery states',()=>{
  assert.match(actions,/startFailure\(selectedLang,'connection_unavailable'\)/)
  assert.match(actions,/startFailure\(selectedLang,'onboarding_save_failed'\)/)
  assert.match(page,/connection_unavailable:/)
  assert.match(page,/onboarding_save_failed:/)
})

test('Start Here preserves the selected language on every failure redirect',()=>{
  assert.match(actions,/`\/start\?lang=\$\{lang\}&error_code=\$\{code\}`/)
})
