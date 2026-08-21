import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Church Builder error and loading states use one selected language',async()=>{
  for(const path of ['src/app/church/launch/error.tsx','src/app/church/launch/loading.tsx','src/app/church/setup-inbox/error.tsx','src/app/church/setup-inbox/loading.tsx']){
    const source=await read(path)
    assert.match(source,/useSearchParams/)
    assert.match(source,/params\.get\('lang'\)==='es'/)
  }
  const launchError=await read('src/app/church/launch/error.tsx')
  const setupError=await read('src/app/church/setup-inbox/error.tsx')
  assert.match(launchError,/Back to Church Admin/)
  assert.match(launchError,/Volver a Administración/)
  assert.match(setupError,/Back to Church Builder/)
  assert.match(setupError,/Volver al Constructor de Iglesia/)
})
