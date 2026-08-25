import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const pageError=read('src/app/error.tsx')
const globalError=read('src/app/global-error.tsx')
const loading=read('src/app/loading.tsx')

test('app-wide error recovery persists the selected language before retry or navigation',()=>{
  for(const source of [pageError,globalError]){
    assert.match(source,/const selectLanguage=\(next:'en'\|'es'\)=>/)
    assert.match(source,/document\.documentElement\.lang=next/)
    assert.match(source,/url\.searchParams\.set\('lang',next\)/)
    assert.match(source,/window\.history\.replaceState\(window\.history\.state,'',`\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`\)/)
    assert.match(source,/onClick=\{\(\)=>selectLanguage\('es'\)\}/)
  }
})

test('global recovery diagnostics keep error digests bounded',()=>{
  for(const source of [pageError,globalError]){
    assert.match(source,/const boundedDigest=/)
    assert.match(source,/replace\(\/\[\^a-zA-Z0-9_-\]\/g,''\)\.slice\(0,80\)/)
    assert.match(source,/digest:boundedDigest\(error\.digest\)/)
  }
})

test('global loading uses one selected language instead of stacking English and Spanish',()=>{
  assert.match(loading,/'use client'/)
  assert.match(loading,/new URLSearchParams\(window\.location\.search\)\.get\('lang'\)==='es'/)
  assert.match(loading,/document\.documentElement\.lang=selected/)
  assert.match(loading,/es\?'Preparando tu Inicio…':'Getting your Home ready…'/)
  assert.match(loading,/es\?'Mantén esta página abierta\./)
  assert.doesNotMatch(loading,/Getting your home ready… \/ Preparando tu inicio…/)
  assert.doesNotMatch(loading,/Please keep this page open\.[^\n]*\/ Mantén esta página abierta\./)
})
