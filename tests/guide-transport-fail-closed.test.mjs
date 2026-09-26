import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const guide=fs.readFileSync(path.join(process.cwd(),'src/app/guide/page.tsx'),'utf8')

test('Kingdom Guide catches client and Auth transport failures before account state is inferred',()=>{
  assert.match(guide,/try\{supabase=await createClient\(\)\}[\s\S]*Kingdom Guide client unavailable/)
  assert.match(guide,/try\{authResult=await supabase\.auth\.getUser\(\)\}[\s\S]*Kingdom Guide auth transport unavailable/)
  assert.ok(guide.includes('Do not create another account. Nothing was changed.'))
  assert.ok(guide.includes('No crees otra cuenta. No se cambió nada.'))
})

test('Kingdom Guide catches thrown church-membership reads and uses connection recovery',()=>{
  assert.match(guide,/try\{membershipResult=await supabase\.from\('church_memberships'\)[\s\S]*Kingdom Guide membership transport unavailable/)
  assert.match(guide,/Kingdom Guide membership transport unavailable[\s\S]*t\.connectionUnavailable[\s\S]*t\.retryGuide/)
})

test('Kingdom Guide catches thrown trusted-resource searches without showing a false empty result',()=>{
  assert.match(guide,/try\{resourceResult=await supabase\.from\('media_assets'\)[\s\S]*catch\(error\)\{resourceSearchFailed=true/)
  assert.match(guide,/Kingdom Guide resource transport unavailable/)
  assert.match(guide,/resourceSearchFailed\?<div className="guide-beta" role="alert"><strong>\{t\.resourceUnavailable\}/)
})

test('Kingdom Guide thrown-failure diagnostics stay bounded',()=>{
  assert.match(guide,/const diagnosticCode=/)
  assert.match(guide,/boundedCode\(error\.name\)/)
  assert.doesNotMatch(guide,/error\.message/)
  assert.doesNotMatch(guide,/console\.error\([^\n]*,\s*error\s*\)/)
})
