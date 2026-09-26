import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read=(file)=>fs.readFileSync(path.join(process.cwd(),file),'utf8')
const startError=read('src/app/start/error.tsx')
const startLoading=read('src/app/start/loading.tsx')
const guideError=read('src/app/guide/error.tsx')
const guideLoading=read('src/app/guide/loading.tsx')

for(const [name,source] of [
  ['Start Here error',startError],
  ['Start Here loading',startLoading],
  ['Kingdom Guide error',guideError],
  ['Kingdom Guide loading',guideLoading],
]){
  test(`${name} uses one selected language instead of stacked bilingual copy`,()=>{
    assert.match(source,/useSearchParams/)
    assert.match(source,/params\.get\('lang'\)===['"]es['"]\?['"]es['"]:['"]en['"]/)
    assert.doesNotMatch(source,/Try again \/ Intentar de nuevo/)
    assert.doesNotMatch(source,/Preparando tus primeros pasos… We/)
    assert.doesNotMatch(source,/No information was changed\. \/ No se cambió/)
    assert.doesNotMatch(source,/Preparando tu ayuda… This/)
  })
}

test('Start Here crash recovery keeps returning users on Sign In and preserves language',()=>{
  assert.match(startError,/\/login\?lang=\$\{lang\}&mode=signin/)
  assert.match(startError,/Go to Sign In/)
  assert.match(startError,/Ir a Iniciar sesión/)
})

test('Kingdom Guide crash recovery offers simple Home and Help exits with language preserved',()=>{
  assert.match(guideError,/\/?\?lang=\$\{lang\}/)
  assert.match(guideError,/\/feedback\?lang=\$\{lang\}/)
  assert.match(guideError,/Help & Feedback/)
  assert.match(guideError,/Ayuda y comentarios/)
})

test('loading states announce that the page is working and should remain open',()=>{
  assert.match(startLoading,/aria-busy="true"/)
  assert.match(startLoading,/aria-live="polite"/)
  assert.match(startLoading,/Keep this page open/)
  assert.match(startLoading,/Mantén esta página abierta/)
  assert.match(guideLoading,/aria-busy="true"/)
  assert.match(guideLoading,/aria-live="polite"/)
  assert.match(guideLoading,/Keep this page open/)
  assert.match(guideLoading,/Mantén esta página abierta/)
})
