import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

const routes=[
  ['Home','src/app/loading.tsx','src/app/error.tsx','account, church information, and progress','cuenta, la información de tu iglesia y tu progreso'],
  ['Messages','src/app/messages/loading.tsx','src/app/messages/error.tsx','No conversation or message was changed','No se modificó ninguna conversación ni mensaje'],
  ['Serve','src/app/serve/loading.tsx','src/app/serve/error.tsx','No ministry application, qualification, or assignment was changed','No se modificó ninguna solicitud, requisito ni asignación de ministerio'],
  ['Teams','src/app/teams/loading.tsx','src/app/teams/error.tsx','No assignment, response, or team membership was changed','No se modificó ninguna asignación, respuesta ni membresía de equipo']
]

for(const [name,loadingPath,errorPath,enSafe,esSafe] of routes){
  test(`${name} has bilingual loading and safe retry states`,async()=>{
    const loading=await read(loadingPath)
    const error=await read(errorPath)
    assert.match(loading,/aria-busy="true"/)
    assert.match(loading,/aria-live="polite"/)
    assert.match(error,/role="alert"/)
    assert.match(error,new RegExp(enSafe.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
    assert.match(error,new RegExp(esSafe.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
    assert.match(error,/onClick=\{\(\)=>reset\(\)\}/)
    assert.match(error,/minHeight:44/)
  })
}
