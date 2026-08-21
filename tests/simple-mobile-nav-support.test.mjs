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
