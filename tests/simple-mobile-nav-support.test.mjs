import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('simplified mobile navigation keeps onboarding and help easy to find',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/\['\/start','Start Here',Sparkles\]/)
  assert.match(source,/\['\/feedback','Help & Feedback',MessageSquareText\]/)
  assert.match(source,/'Start Here':'Empieza Aquí'/)
  assert.match(source,/'Help & Feedback':'Ayuda y Comentarios'/)
  assert.match(source,/Help:'Ayuda'/)
})

test('simplified mobile navigation preserves Spanish on onboarding and help links',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/const href=\(path:string\)=>lang==='es'\?`\$\{path\}\$\{path\.includes\('\?'\)\?'&':'\?'\}lang=es`:path/)
  assert.match(source,/href=\{href\(path\)\}/)
})

test('simplified mobile navigation offers a persistent language switch without losing useful page context',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/Language:'Idioma'/)
  assert.match(source,/const languageHref=/)
  assert.match(source,/new URLSearchParams\(searchParams\.toString\(\)\)/)
  assert.match(source,/for\(const key of \['error','message','error_code','status','sent'\]\)params\.delete\(key\)/)
  assert.match(source,/params\.set\('lang','es'\)/)
  assert.match(source,/params\.delete\('lang'\)/)
  assert.match(source,/href=\{languageHref\('en'\)\}/)
  assert.match(source,/href=\{languageHref\('es'\)\}/)
})

test('simplified mobile navigation honors the saved preferred language unless the URL explicitly selects one',async()=>{
  const nav=await read('src/components/mobile-nav.tsx')
  const shell=await read('src/components/mobile-nav-shell.tsx')
  assert.match(nav,/preferredLanguage='en'/)
  assert.match(nav,/explicitLang==='es'\?'es':explicitLang==='en'\?'en':preferredLanguage/)
  assert.match(shell,/user_metadata\?\.preferred_language==='es'\?'es':'en'/)
  assert.match(shell,/preferredLanguage=\{preferredLanguage\}/)
})

test('simplified mobile navigation exposes existing leadership destinations only through existing access flags',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/if\(access\.canViewLeadership\)leadership\.push\(\['\/church\/leadership','Leadership Home',ClipboardList\]\)/)
  assert.match(source,/if\(access\.canManageChurch\)\{leadership\.push\(\['\/church','Church Admin',Church\]\)/)
  assert.match(source,/'Leadership Home':'Inicio de Liderazgo'/)
  assert.match(source,/'Church Admin':'Administrar Iglesia'/)
})

test('mobile navigation fails closed if church feature settings cannot be read',async()=>{
  const shell=await read('src/components/mobile-nav-shell.tsx')
  assert.match(shell,/const allFeatureGatedNav=/)
  assert.match(shell,/feature settings unavailable; hiding gated navigation/)
  assert.match(shell,/\{code:featureResult\.error\.code\}/)
  assert.match(shell,/hasForms:!formsResult\.error/)
  assert.match(shell,/disabledFeatures:featureResult\.error\?allFeatureGatedNav:/)
  assert.doesNotMatch(shell,/featureResult\.error\.message/)
  assert.doesNotMatch(shell,/formsResult\.error\.message/)
})
