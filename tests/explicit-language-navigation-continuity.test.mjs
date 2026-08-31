import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const start=fs.readFileSync('src/app/start/page.tsx','utf8')
const launch=fs.readFileSync('src/app/church/launch/page.tsx','utf8')

test('Start Here preserves either explicit language on every internal handoff',()=>{
  assert.match(start,/const withLang=\(path:string\)=>`\$\{path\}\$\{path\.includes\('\?'\)\?'&':'\?'\}lang=\$\{lang\}`/)
  assert.match(start,/redirect\(withLang\('\/'\)\)/)
  assert.match(start,/href=\{withLang\('\/'\)\} className="brand"/)
  assert.match(start,/href=\{withLang\('\/church\/launch'\)\}/)
  assert.doesNotMatch(start,/lang==='es'\?`\$\{path\}.*lang=es`:path/)
  assert.match(start,/minister:'Ministro'/)
})

test('Church Builder preserves explicit English as well as Spanish on setup steps',()=>{
  assert.match(launch,/const l=\(path:string\)=>`\$\{path\}\$\{path\.includes\('\?'\)\?'&':'\?'\}lang=\$\{lang\}`/)
  for(const path of ['/church/settings','/church/admin-backup','/church/join-center','/learning','/groups','/calendar','/church/readiness']){
    assert.ok(launch.includes(`href:l('${path}')`),`expected language-preserving setup link for ${path}`)
  }
  assert.match(launch,/redirect\(l\('\/login\?mode=signin'\)\)/)
  assert.match(launch,/redirect\(l\('\/'\)\)/)
  assert.doesNotMatch(launch,/lang==='es'\?`\$\{path\}.*lang=es`:path/)
})
