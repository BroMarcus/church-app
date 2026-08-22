'use client'

import { useEffect, useMemo, useState } from 'react'

type Lang='en'|'es'
type Result='untested'|'pass'|'fail'
type CheckId='signup'|'existing'|'invite'|'reset'|'spanish'|'guide'|'setup'
type Entry={result:Result;device:string;account:string;date:string;notes:string}
type State=Record<CheckId,Entry>

const ids:CheckId[]=['signup','existing','invite','reset','spanish','guide','setup']
const emptyEntry=():Entry=>({result:'untested',device:'',account:'',date:'',notes:''})
const emptyState=():State=>Object.fromEntries(ids.map(id=>[id,emptyEntry()])) as State

const copy={
  en:{
    title:'Real-phone proof checklist',intro:'Use test accounts only. This checklist stays on this browser unless you copy the summary into the Control Room.',
    local:'LOCAL ONLY — does not write member or church data',device:'Phone / device',account:'Test account type',date:'Date',notes:'What happened / exact failing step',
    untested:'Not tested',pass:'PASS',fail:'FAIL',copy:'Copy evidence summary',copied:'Copied',reset:'Clear local checklist',confirm:'Clear every locally saved phone-test result on this browser?',
    complete:'required phone tests passed',remaining:'still need proof',failed:'failed',summaryTitle:'KINGDOM NETWORK PHONE PROOF',language:'Checklist language',noNotes:'No notes recorded',
    evidence:'Add the device, test-account type, and date before marking PASS or FAIL.',failEvidence:'Add exact failure notes before marking FAIL.',proofComplete:'PHONE PROOF COMPLETE — all required flows passed with evidence.',proofIncomplete:'PHONE PROOF INCOMPLETE — do not treat this checklist as pilot acceptance yet.',proofStatus:'Phone proof status',
    signup:'Public signup → confirmation → Start Here → sign out/in',existing:'Existing account → church join → same account, no duplicate',invite:'Newest invitation works; replaced/old invitation recovers clearly',reset:'Forgot password → newest reset email → new password → sign in',spanish:'Spanish signup / confirmation / Start Here / first Home',guide:'Kingdom Guide recovery help in English and Spanish',setup:'Fresh Church Setup → approve recommendation → unpublished Course Builder draft'
  },
  es:{
    title:'Lista de prueba con teléfono real',intro:'Usa solamente cuentas de prueba. Esta lista se queda en este navegador a menos que copies el resumen al Control Room.',
    local:'SOLO LOCAL — no escribe datos de miembros ni de la iglesia',device:'Teléfono / dispositivo',account:'Tipo de cuenta de prueba',date:'Fecha',notes:'Qué pasó / paso exacto que falló',
    untested:'Sin probar',pass:'PASÓ',fail:'FALLÓ',copy:'Copiar resumen de evidencia',copied:'Copiado',reset:'Borrar lista local',confirm:'¿Borrar todos los resultados guardados localmente en este navegador?',
    complete:'pruebas requeridas pasaron',remaining:'todavía necesitan prueba',failed:'fallaron',summaryTitle:'PRUEBA DE TELÉFONO — KINGDOM NETWORK',language:'Idioma de la lista',noNotes:'Sin notas',
    evidence:'Agrega el dispositivo, tipo de cuenta de prueba y fecha antes de marcar PASÓ o FALLÓ.',failEvidence:'Agrega notas exactas de la falla antes de marcar FALLÓ.',proofComplete:'PRUEBA DE TELÉFONO COMPLETA — todos los flujos requeridos pasaron con evidencia.',proofIncomplete:'PRUEBA DE TELÉFONO INCOMPLETA — todavía no la trates como aceptación del piloto.',proofStatus:'Estado de prueba con teléfono',
    signup:'Registro público → confirmación → Empieza Aquí → salir/entrar',existing:'Cuenta existente → unirse a iglesia → misma cuenta, sin duplicado',invite:'Funciona la invitación más reciente; enlace viejo/reemplazado se recupera claramente',reset:'Olvidé contraseña → correo más reciente → nueva contraseña → entrar',spanish:'Registro / confirmación / Empieza Aquí / primer Inicio en español',guide:'Ayuda de recuperación de Kingdom Guide en inglés y español',setup:'Fresh Church Setup → aprobar recomendación → borrador sin publicar en Course Builder'
  }
} as const

function storageKey(churchId:string){return `kn-phone-proof:${churchId || 'unknown'}`}
function hasBaseEvidence(entry:Entry){return Boolean(entry.device.trim()&&entry.account.trim()&&entry.date.trim())}
function hasFailureEvidence(entry:Entry){return hasBaseEvidence(entry)&&Boolean(entry.notes.trim())}

export default function PhoneProofClient({lang,churchId}:{lang:Lang;churchId:string}){
  const t=copy[lang]
  const [state,setState]=useState<State>(()=>emptyState())
  const [hydrated,setHydrated]=useState(false)
  const [copied,setCopied]=useState(false)

  useEffect(()=>{
    try{
      const raw=window.localStorage.getItem(storageKey(churchId))
      if(raw){
        const parsed=JSON.parse(raw) as Partial<State>
        const next=emptyState()
        for(const id of ids){
          const value=parsed[id]
          if(value&&['untested','pass','fail'].includes(String(value.result))){
            const entry={result:value.result as Result,device:String(value.device??'').slice(0,120),account:String(value.account??'').slice(0,120),date:String(value.date??'').slice(0,20),notes:String(value.notes??'').slice(0,500)}
            if(entry.result==='pass'&&!hasBaseEvidence(entry))entry.result='untested'
            if(entry.result==='fail'&&!hasFailureEvidence(entry))entry.result='untested'
            next[id]=entry
          }
        }
        setState(next)
      }
    }catch{}
    setHydrated(true)
  },[churchId])

  useEffect(()=>{
    if(!hydrated)return
    try{window.localStorage.setItem(storageKey(churchId),JSON.stringify(state))}catch{}
  },[state,churchId,hydrated])

  const stats=useMemo(()=>{
    const values=Object.values(state)
    return {pass:values.filter(v=>v.result==='pass').length,fail:values.filter(v=>v.result==='fail').length,remaining:values.filter(v=>v.result==='untested').length}
  },[state])
  const allPassed=stats.pass===ids.length&&stats.fail===0&&stats.remaining===0

  function update(id:CheckId,patch:Partial<Entry>){
    setState(current=>({...current,[id]:{...current[id],...patch}}))
  }

  function summary(){
    const proofStatus=allPassed?t.proofComplete:t.proofIncomplete
    const lines=[t.summaryTitle,`${t.language}: ${lang==='es'?'Español':'English'}`,`${t.proofStatus}: ${proofStatus}`,`PASS: ${stats.pass}/${ids.length} | FAIL: ${stats.fail} | ${t.remaining}: ${stats.remaining}`,'']
    for(const id of ids){
      const item=state[id]
      const label=t[id]
      const result=item.result==='pass'?t.pass:item.result==='fail'?t.fail:t.untested
      lines.push(`[${result}] ${label}`)
      lines.push(`- ${t.device}: ${item.device||'—'}`)
      lines.push(`- ${t.account}: ${item.account||'—'}`)
      lines.push(`- ${t.date}: ${item.date||'—'}`)
      lines.push(`- ${t.notes}: ${item.notes||t.noNotes}`,'')
    }
    return lines.join('\n')
  }

  async function copySummary(){
    try{
      await navigator.clipboard.writeText(summary())
      setCopied(true)
      window.setTimeout(()=>setCopied(false),1800)
    }catch{
      const textarea=document.createElement('textarea')
      textarea.value=summary();textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.select();document.execCommand('copy');textarea.remove();setCopied(true);window.setTimeout(()=>setCopied(false),1800)
    }
  }

  function clearAll(){
    if(!window.confirm(t.confirm))return
    setState(emptyState())
    try{window.localStorage.removeItem(storageKey(churchId))}catch{}
  }

  return <>
    <section className="proof-summary" aria-live="polite">
      <div><strong>{stats.pass}/{ids.length}</strong><span>{t.complete}</span></div>
      <div><strong>{stats.remaining}</strong><span>{t.remaining}</span></div>
      <div><strong>{stats.fail}</strong><span>{t.failed}</span></div>
    </section>

    <div className={`local-note ${allPassed?'complete':''}`} role="status" aria-live="polite">{allPassed?t.proofComplete:t.proofIncomplete}</div>
    <div className="local-note">{t.local}</div>

    <section className="proof-list">
      {ids.map((id,index)=>{
        const item=state[id]
        const baseEvidence=hasBaseEvidence(item)
        const failureEvidence=hasFailureEvidence(item)
        return <article className={`proof-item ${item.result}`} key={id}>
          <div className="proof-item-head"><div><span className="step">{index+1}</span><h2>{t[id]}</h2></div><div className="result-buttons" role="group" aria-label={`${index+1}. ${t[id]}`}>
            <button type="button" className={item.result==='untested'?'active':''} onClick={()=>update(id,{result:'untested'})}>{t.untested}</button>
            <button type="button" className={item.result==='pass'?'active':''} disabled={!baseEvidence} aria-disabled={!baseEvidence} onClick={()=>update(id,{result:'pass'})}>{t.pass}</button>
            <button type="button" className={item.result==='fail'?'active':''} disabled={!failureEvidence} aria-disabled={!failureEvidence} onClick={()=>update(id,{result:'fail'})}>{t.fail}</button>
          </div></div>
          {!baseEvidence&&<p className="evidence-hint">{t.evidence}</p>}
          {baseEvidence&&!item.notes.trim()&&<p className="evidence-hint">{t.failEvidence}</p>}
          <div className="fields">
            <label>{t.device}<input maxLength={120} value={item.device} onChange={e=>update(id,{device:e.target.value})} placeholder={lang==='es'?'Ej. iPhone 14, Safari':'e.g. iPhone 14, Safari'}/></label>
            <label>{t.account}<input maxLength={120} value={item.account} onChange={e=>update(id,{account:e.target.value})} placeholder={lang==='es'?'Ej. miembro nuevo de prueba':'e.g. new-member test account'}/></label>
            <label>{t.date}<input type="date" value={item.date} onChange={e=>update(id,{date:e.target.value})}/></label>
            <label className="wide">{t.notes}<textarea maxLength={500} rows={3} value={item.notes} onChange={e=>update(id,{notes:e.target.value})}/></label>
          </div>
        </article>
      })}
    </section>

    <section className="proof-actions">
      <button type="button" className="primary" onClick={copySummary}>{copied?t.copied:t.copy}</button>
      <button type="button" className="danger" onClick={clearAll}>{t.reset}</button>
    </section>
  </>
}
