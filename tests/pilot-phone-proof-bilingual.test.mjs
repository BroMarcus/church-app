import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const client=await readFile(new URL('../src/app/church/readiness/phone-proof/phone-proof-client.tsx',import.meta.url),'utf8')

test('phone proof records English and Spanish evidence per flow',()=>{
  assert.match(client,/englishTested:boolean/)
  assert.match(client,/spanishTested:boolean/)
  assert.match(client,/English tested/)
  assert.match(client,/Spanish tested/)
  assert.match(client,/Inglés probado/)
  assert.match(client,/Español probado/)
  assert.match(client,/Languages actually tested/)
  assert.match(client,/Idiomas realmente probados/)
})

test('PASS requires both languages while FAIL can be recorded after either tested language fails',()=>{
  assert.match(client,/function hasAnyLanguageEvidence\(entry:Entry\)\{return entry\.englishTested\|\|entry\.spanishTested\}/)
  assert.match(client,/function hasBothLanguages\(entry:Entry\)\{return entry\.englishTested&&entry\.spanishTested\}/)
  assert.match(client,/const languageReady=result==='pass'\?hasBothLanguages\(item\):result==='fail'\?hasAnyLanguageEvidence\(item\):true/)
  assert.match(client,/const passReady=evidenceReady&&hasBothLanguages\(item\)/)
  assert.match(client,/const failReady=evidenceReady&&hasAnyLanguageEvidence\(item\)/)
  assert.match(client,/disabled=\{!passReady\}/)
  assert.match(client,/disabled=\{!failReady\}/)
})

test('changing tested-language evidence invalidates a completed result',()=>{
  assert.match(client,/Pick<Entry,'device'\|'account'\|'date'\|'site'\|'notes'\|'englishTested'\|'spanishTested'>/)
  assert.match(client,/englishTested:e\.target\.checked/)
  assert.match(client,/spanishTested:e\.target\.checked/)
  assert.match(client,/tested-language evidence after PASS\/FAIL/)
  assert.match(client,/evidencia de idioma después de PASÓ\/FALLÓ/)
})

test('old completed evidence without language coverage cannot remain accepted',()=>{
  assert.match(client,/const resultHasRequiredLanguage=entry\.result==='pass'\?hasBothLanguages\(entry\):entry\.result==='fail'\?hasAnyLanguageEvidence\(entry\):true/)
  assert.match(client,/!resultHasRequiredLanguage/)
  assert.match(client,/englishTested:Boolean\(value\.englishTested\)/)
  assert.match(client,/spanishTested:Boolean\(value\.spanishTested\)/)
  assert.match(client,/normalized\.result==='untested'/)
})

test('phone proof completion and exported summary include bilingual evidence',()=>{
  assert.match(client,/const allBilingual=/)
  assert.match(client,/&&allCurrentBuild&&allBilingual/)
  assert.match(client,/Language evidence/)
  assert.match(client,/Evidencia de idioma/)
  assert.match(client,/EN ✓/)
  assert.match(client,/ES ✓/)
  assert.match(client,/all required flows passed in both English and Spanish/)
  assert.match(client,/todos los flujos requeridos pasaron en inglés y español/)
})
