import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const page=readFileSync(new URL('../src/app/auth/verify/page.tsx',import.meta.url),'utf8')
const actions=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')

test('verification UI only hands a canonical church join destination to the server action',()=>{
  assert.match(page,/name="next" value=\{joinNext\}/)
  assert.doesNotMatch(page,/joinNext\|\|params\.next/)
  assert.match(page,/raw\.length>500/)
  assert.match(page,/requested\.origin!==canonical\.origin\|\|!requested\.pathname\.startsWith\('\/join\/'\)/)
})

test('server independently constrains recovery to church join and signup to Start Here or join',()=>{
  assert.match(actions,/rawType==='recovery'\?joinNext:safeSignupDestination/)
  assert.match(actions,/parsed\.pathname==='\/start'\|\|parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(actions,/redirect\(`\/auth\/update-password\?lang=\$\{lang\}/)
})
