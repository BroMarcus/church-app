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

test('verification and temporary-link recovery use server language fallback on direct entry',async()=>{
  const [verifyPage,unavailablePage]=await Promise.all([
    read('src/app/auth/verify/page.tsx'),
    read('src/app/auth/link-unavailable/page.tsx')
  ])

  for(const source of [verifyPage,unavailablePage]){
    assert.match(source,/import \{ headers \} from 'next\/headers'/)
    assert.match(source,/resolveLanguagePreference/)
    assert.match(source,/requestHeaders\.get\('accept-language'\)/)
    assert.doesNotMatch(source,/params\.lang==='es'\?'es':'en'/)
  }
  assert.match(verifyPage,/type="hidden" name="lang" value=\{lang\}/)
  assert.match(unavailablePage,/\/login\?lang=\$\{lang\}&mode=signin/)
})

test('email-link error boundaries preserve explicit language and otherwise use the phone language',async()=>{
  const [verifyError,unavailableError]=await Promise.all([
    read('src/app/auth/verify/error.tsx'),
    read('src/app/auth/link-unavailable/error.tsx')
  ])

  for(const source of [verifyError,unavailableError]){
    assert.match(source,/const languages=navigator\.languages\?\.length\?navigator\.languages:\[navigator\.language\]/)
    assert.match(source,/tag==='es'\|\|tag\.startsWith\('es-'\)/)
    assert.match(source,/tag==='en'\|\|tag\.startsWith\('en-'\)/)
    assert.match(source,/explicitLang==='es'\|\|explicitLang==='en'\?explicitLang:browserLanguage\(\)/)
    assert.doesNotMatch(source,/params\.get\('lang'\)==='es'\?'es':'en'/)
    assert.match(source,/\/login\?lang=\$\{lang\}&mode=signin/)
  }
})

test('selected language remains explicit through confirmation, sign-in, signup, resend, and magic-link redirects',async()=>{
  const [callback,confirm,verifyAction,loginActions]=await Promise.all([
    read('src/app/auth/callback/route.ts'),
    read('src/app/auth/confirm/route.ts'),
    read('src/app/auth/verify/actions.ts'),
    read('src/app/login/actions.ts')
  ])

  assert.match(callback,/\/auth\/update-password\?lang=\$\{lang\}/)
  assert.match(callback,/\/login\?lang=\$\{lang\}/)
  assert.match(callback,/\/auth\/link-unavailable\?lang=\$\{lang\}/)
  assert.match(callback,/\/start\?lang=\$\{lang\}&message_code=joined_invite/)
  assert.match(confirm,/verifyUrl\.searchParams\.set\('lang',lang\)/)

  for(const source of [callback,confirm,verifyAction]){
    assert.match(source,/const signupFallback=`\/start\?welcome=1&lang=\$\{lang\}`/)
    assert.doesNotMatch(source,/welcome=1\$\{lang==='es'/)
  }
  assert.match(verifyAction,/rawType==='magiclink'\)redirect\(joinNext\|\|`\/\?lang=\$\{lang\}`\)/)
  assert.doesNotMatch(verifyAction,/rawType==='magiclink'\)redirect\(joinNext\|\|\(lang==='es'/)

  assert.match(loginActions,/onboardingState===false\)redirect\(`\/start\?welcome=1&lang=\$\{lang\}`\)/)
  assert.match(loginActions,/if\(!hasActivity\)redirect\(`\/start\?welcome=1&lang=\$\{lang\}`\)/)
  assert.match(loginActions,/const startPath=`\/start\?welcome=1&lang=\$\{lang\}`/)
  assert.match(loginActions,/const startPath=next\|\|`\/start\?welcome=1&lang=\$\{lang\}`/)
  assert.match(loginActions,/redirect\(`\/\?lang=\$\{lang\}`\)/)
  assert.doesNotMatch(loginActions,/welcome=1\$\{lang==='es'/)
  assert.doesNotMatch(loginActions,/redirect\(lang==='es'\?'\/\?lang=es':'\/'\)/)
})