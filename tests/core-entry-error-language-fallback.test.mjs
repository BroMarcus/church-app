import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(path,'utf8')

test('login, public join, and Start Here error boundaries preserve explicit language and otherwise use phone language',async()=>{
  const [loginError,joinError,startError]=await Promise.all([
    read('src/app/login/error.tsx'),
    read('src/app/join/[slug]/error.tsx'),
    read('src/app/start/error.tsx')
  ])

  for(const source of [loginError,joinError,startError]){
    assert.match(source,/const languages=navigator\.languages\?\.length\?navigator\.languages:\[navigator\.language\]/)
    assert.match(source,/tag==='es'\|\|tag\.startsWith\('es-'\)/)
    assert.match(source,/tag==='en'\|\|tag\.startsWith\('en-'\)/)
    assert.match(source,/explicitLang==='es'\|\|explicitLang==='en'\?explicitLang:browserLanguage\(\)/)
    assert.doesNotMatch(source,/params\.get\('lang'\)==='es'\?'es':'en'/)
  }
})

test('core entry error recovery carries the resolved language forward',async()=>{
  const [loginError,joinError,startError]=await Promise.all([
    read('src/app/login/error.tsx'),
    read('src/app/join/[slug]/error.tsx'),
    read('src/app/start/error.tsx')
  ])

  assert.match(loginError,/href={`\/\?lang=\$\{lang\}`}/)
  assert.match(joinError,/`\$\{pathname\}\?lang=\$\{lang\}`/)
  assert.match(joinError,/\/login\?lang=\$\{lang\}&mode=signin/)
  assert.match(startError,/\/login\?lang=\$\{lang\}&mode=signin/)
  assert.match(joinError,/do not create another one/)
  assert.match(joinError,/no crees otra/)
})
