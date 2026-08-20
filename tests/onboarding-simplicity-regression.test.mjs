import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Start Here keeps the first visit focused and hides the full app map until requested',async()=>{
  const source=await read('src/app/start/page.tsx')
  assert.match(source,/<details className="card start-tour"/)
  assert.match(source,/<summary[^>]*>\{t\.tour\}<\/summary>/)
  assert.match(source,/See the full app map/)
  assert.match(source,/Ver el mapa completo de la aplicación/)
})
