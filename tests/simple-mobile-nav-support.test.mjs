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

test('simplified mobile navigation offers a persistent language switch without losing page context',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/Language:'Idioma'/)
  assert.match(source,/const languageHref=/)
  assert.match(source,/new URLSearchParams\(searchParams\.toString\(\)\)/)
  assert.match(source,/params\.set\('lang','es'\)/)
  assert.match(source,/params\.delete\('lang'\)/)
  assert.match(source,/href=\{languageHref\('en'\)\}/)
  assert.match(source,/href=\{languageHref\('es'\)\}/)
})

test('simplified mobile navigation exposes existing leadership destinations only through existing access flags',async()=>{
  const source=await read('src/components/mobile-nav.tsx')
  assert.match(source,/if\(access\.canViewLeadership\)leadership\.push\(\['\/church\/leadership','Leadership Home',ClipboardList\]\)/)
  assert.match(source,/if\(access\.canManageChurch\)\{leadership\.push\(\['\/church','Church Admin',Church\]\)/)
  assert.match(source,/'Leadership Home':'Inicio de Liderazgo'/)
  assert.match(source,/'Church Admin':'Administrar Iglesia'/)
})
