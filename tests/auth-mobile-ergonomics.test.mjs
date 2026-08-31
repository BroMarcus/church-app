import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const passwordField=fs.readFileSync('src/components/password-field.tsx','utf8')
const pendingSubmit=fs.readFileSync('src/app/login/pending-submit.tsx','utf8')
const pendingAction=fs.readFileSync('src/app/login/pending-action.tsx','utf8')

test('password fields resist mobile keyboard autocorrection and keep a large reveal target',()=>{
  assert.match(passwordField,/autoCapitalize="none"/)
  assert.match(passwordField,/autoCorrect="off"/)
  assert.match(passwordField,/spellCheck=\{false\}/)
  assert.match(passwordField,/width:44,height:44/)
  assert.match(passwordField,/touchAction:'manipulation'/)
  assert.match(passwordField,/aria-pressed=\{visible\}/)
})

test('primary auth submit stays large and blocks repeat taps while pending',()=>{
  assert.match(pendingSubmit,/disabled=\{status\.pending\}/)
  assert.match(pendingSubmit,/minHeight:44/)
  assert.match(pendingSubmit,/touchAction:'manipulation'/)
  assert.match(pendingSubmit,/aria-busy=\{status\.pending\}/)
})

test('recovery actions stay large and preserve cooldown protection',()=>{
  assert.match(pendingAction,/disabled=\{status\.pending\|\|cooling\}/)
  assert.match(pendingAction,/minHeight:44/)
  assert.match(pendingAction,/touchAction:'manipulation'/)
  assert.match(pendingAction,/localStorage/)
  assert.match(pendingAction,/fallbackUntilRef/)
})
