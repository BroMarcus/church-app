import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('email-link routes resolve language before handing users to auth recovery and onboarding',async()=>{
  const [helper,callback,confirm]=await Promise.all([
    read('src/lib/request-language.ts'),
    read('src/app/auth/callback/route.ts'),
    read('src/app/auth/confirm/route.ts')
  ])

  assert.match(helper,/explicit==='en'\|\|explicit==='es'/)
  assert.match(helper,/request\.headers\.get\('accept-language'\)/)
  assert.match(helper,/tag==='es'\|\|tag\.startsWith\('es-'\)/)
  assert.match(helper,/tag==='en'\|\|tag\.startsWith\('en-'\)/)
  assert.match(helper,/Number\.parseFloat\(qualityParam\.slice\(2\)\)/)
  assert.match(helper,/quality>0/)
  assert.match(helper,/preferences\.sort\(\(a,b\)=>b\.quality-a\.quality\|\|a\.order-b\.order\)/)
  assert.match(helper,/return preferences\[0\]\?\.language\|\|'en'/)

  for(const source of [callback,confirm]){
    assert.match(source,/resolveRequestLanguage/)
    assert.doesNotMatch(source,/searchParams\.get\('lang'\)==='es'\?'es':'en'/)
  }
  assert.match(callback,/const lang=resolveRequestLanguage\(request,url\)/)
  assert.match(confirm,/const lang=resolveRequestLanguage\(request,requestUrl\)/)
})

test('email-link language remains explicit in downstream redirects after fallback is resolved',async()=>{
  const [callback,confirm]=await Promise.all([
    read('src/app/auth/callback/route.ts'),
    read('src/app/auth/confirm/route.ts')
  ])

  assert.match(callback,/\/auth\/update-password\?lang=\$\{lang\}/)
  assert.match(callback,/\/login\?lang=\$\{lang\}/)
  assert.match(callback,/\/auth\/link-unavailable\?lang=\$\{lang\}/)
  assert.match(callback,/\/start\?lang=\$\{lang\}&message_code=joined_invite/)
  assert.match(confirm,/verifyUrl\.searchParams\.set\('lang',lang\)/)
})
