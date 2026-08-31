import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const start=fs.readFileSync(new URL('../src/app/start/page.tsx',import.meta.url),'utf8')

test('Start Here shows the signed-in account and consistently uses One Kingdom',()=>{
  assert.match(start,/account:'Signed in as'/)
  assert.match(start,/account:'Sesión iniciada como'/)
  assert.match(start,/user\.email&&/)
  assert.match(start,/Keep using this same One Kingdom account\. Do not create another account for this church\./)
  assert.match(start,/Sigue usando esta misma cuenta de One Kingdom\. No crees otra cuenta para esta iglesia\./)
  assert.match(start,/className="brand">One <span>Kingdom<\/span>/)
  assert.doesNotMatch(start,/Kingdom Network account/)
  assert.doesNotMatch(start,/className="brand">Kingdom <span>Network<\/span>/)
})
