import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const pageError=fs.readFileSync('src/app/error.tsx','utf8')
const globalError=fs.readFileSync('src/app/global-error.tsx','utf8')

for(const [name,source] of [['page recovery',pageError],['root recovery',globalError]]){
  test(`${name} keeps explicit English and Spanish authoritative`,()=>{
    assert.match(source,/requested===['"]es['"]\)return ['"]es['"]|requested===['"]es['"]\)return['"]es['"]/)
    assert.match(source,/requested===['"]en['"]\)return ['"]en['"]|requested===['"]en['"]\)return['"]en['"]/)
  })

  test(`${name} falls back to document or phone Spanish when lang is missing`,()=>{
    assert.match(source,/document\.documentElement\.lang\.toLowerCase\(\)\.startsWith\(['"]es['"]\)/)
    assert.match(source,/navigator\.languages/)
    assert.match(source,/navigator\.language/)
    assert.match(source,/\.some\(value=>String\(value\|\|['"]['"]\)\.toLowerCase\(\)\.startsWith\(['"]es['"]\)\)/)
  })

  test(`${name} does not expose raw exception text`,()=>{
    assert.doesNotMatch(source,/error\.message/)
    assert.match(source,/boundedDigest\(error\.digest\)/)
  })
}

test('page recovery preserves the selected language in Home and Sign in navigation',()=>{
  assert.match(pageError,/const withLang=\(path:string\)=>`\$\{path\}\$\{path\.includes\('\?'\)\?'&':'\?'\}lang=\$\{lang\}`/)
  assert.match(pageError,/go\('\/login\?mode=signin'\)/)
})

test('root recovery preserves explicit English or Spanish when returning to Sign in',()=>{
  assert.match(globalError,/const signIn=`\/login\?mode=signin&lang=\$\{lang\}`/)
})
