import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const loginError=fs.readFileSync(path.join(process.cwd(),'src/app/login/error.tsx'),'utf8')
const joinError=fs.readFileSync(path.join(process.cwd(),'src/app/join/[slug]/error.tsx'),'utf8')

test('login crash recovery uses one selected language and discourages duplicate accounts',()=>{
  assert.match(loginError,/useSearchParams/)
  assert.match(loginError,/params\.get\('lang'\)===['"]es['"]\?['"]es['"]:['"]en['"]/)
  assert.ok(loginError.includes('do not create another one'))
  assert.ok(loginError.includes('no crees otra'))
  assert.doesNotMatch(loginError,/Try again \/ Intentar de nuevo/)
  assert.doesNotMatch(loginError,/temporarily unavailable\. El inicio/)
})

test('login crash recovery gives simple retry and home actions',()=>{
  assert.match(loginError,/onClick=\{\(\)=>reset\(\)\}/)
  assert.match(loginError,/href=\{`\/\?lang=\$\{lang\}`\}/)
  assert.match(loginError,/role="alert"/)
})

test('church join crash recovery preserves same-account sign-in return context',()=>{
  assert.match(joinError,/usePathname/)
  assert.match(joinError,/const next=pathname\.startsWith\('\/join\/'\)\?`\$\{pathname\}\?lang=\$\{lang\}`:''/)
  assert.match(joinError,/mode=signin\$\{next\?`&next=\$\{encodeURIComponent\(next\)\}`:''\}/)
  assert.ok(joinError.includes('do not create another one'))
  assert.ok(joinError.includes('no crees otra'))
})

test('church join crash diagnostics never expose raw provider error messages',()=>{
  assert.match(joinError,/const boundedCode=/)
  assert.match(joinError,/console\.error\('church join page failed',\{code:boundedCode\(error\.name\),digest:boundedCode\(error\.digest\)\}\)/)
  assert.doesNotMatch(joinError,/error\.message/)
})
