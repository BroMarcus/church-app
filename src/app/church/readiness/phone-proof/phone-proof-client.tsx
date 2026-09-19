'use client'

import { useEffect, useMemo, useState } from 'react'

type Lang='en'|'es'
type Result='untested'|'pass'|'fail'
type CheckId='signup'|'existing'|'invite'|'reset'|'spanish'|'guide'|'setup'
type Entry={result:Result;device:string;account:string;date:string;site:string;notes:string;build:string}&{englishTested:boolean;spanishTested:boolean}
type State=Record<CheckId,Entry>

const ids:CheckId[]=['signup','existing','invite','reset','spanish','guide','setup']
const emptyEntry=():Entry=>({result:'untested',device:'',account:'',date:'',site:'',notes:'',build:'',englishTested:false,spanishTested:false})
const emptyState=():State=>Object.fromEntries(ids.map(id=>[id,emptyEntry()])) as State

const copy={
  en:{
    title:'Real-phone proof checklist',intro:'Use test accounts only. Follow each short test exactly. This checklist stays on this browser unless you copy the summary into the Control Room.',
    local:'LOCAL ONLY — does not write member or church data',device:'Phone / device',account:'Test account type',date:'Date',site:'Tested site / preview',notes:'Observed result / exact failing step',build:'Tested build',
    untested:'Not tested',pass:'PASS',fail:'FAIL',copy:'Copy evidence summary',copied:'Copied',reset:'Clear local checklist',confirm:'Clear every locally saved phone-test result on this browser?',
    complete:'required phone tests passed',remaining:'still need proof',failed:'failed',summaryTitle:'KINGDOM NETWORK PHONE PROOF',language:'Checklist language',noNotes:'No notes recorded',
    evidence:'Add the device, test-account type, date, a valid http/https tested site, and a short note describing what you actually observed. Mark which language(s) you actually tested. PASS requires both English and Spanish; FAIL can be recorded as soon as either tested language fails.',proofComplete:'PHONE PROOF COMPLETE — all required flows passed in both English and Spanish with evidence on one tested site and this exact verified Git build.',proofIncomplete:'PHONE PROOF INCOMPLETE — do not treat this checklist as pilot acceptance yet.',proofStatus:'Phone proof status',
    how:'Test steps',expected:'Expected result',siteHelp:'Use the exact http/https site or preview where this test was run. Different pages on the same site count as one site.',
    mixedSites:'SITE MISMATCH — completed results point to more than one site/preview. Retest or correct the site so one build is proven consistently.',siteStatus:'Site consistency',oneSite:'One tested site',manySites:'Multiple tested sites',
    buildStatus:'Build identity',buildVerified:'Verified Git commit',buildMissing:'UNVERIFIED BUILD — this environment does not expose an exact 40-character Git commit. Phone proof cannot be marked complete here.',
    staleBuild:'OLD BUILD EVIDENCE RESET — one or more saved PASS/FAIL results belonged to a different or unknown Git build, or did not prove the required language coverage. Their notes were kept, but the result was returned to Not tested so this build must be proven again.',
    currentBuildOnly:'PASS/FAIL is stamped to this exact Git build. If the deployed build changes, completed results automatically return to Not tested.',
    editReset:'If you change the device, account, date, site, notes, or tested-language evidence after PASS/FAIL, that result returns to Not tested and must be proven again.',
    invalidSite:'Enter a full http:// or https:// site/preview address before marking PASS or FAIL.',
    languageProof:'Languages actually tested',englishTested:'English tested',spanishTested:'Spanish tested',languageHelp:'PASS stays disabled until both English and Spanish are checked. If either language fails, check the language you tested and record FAIL with the exact failing step.',
    languageSummary:'Language evidence',
    signup:'Public signup → confirmation → Start Here → sign out/in',existing:'Existing account → church join → same account, no duplicate',invite:'Newest invitation works; replaced/old invitation recovers clearly',reset:'Forgot password → newest reset email → new password → sign in',spanish:'Spanish signup / confirmation / Start Here / first Home',guide:'Kingdom Guide recovery help in English and Spanish',setup:'Fresh Church Setup → approve recommendation → unpublished Course Builder draft'
  },
  es:{
    title:'Lista de prueba con teléfono real',intro:'Usa solamente cuentas de prueba. Sigue cada prueba corta exactamente. Esta lista se queda en este navegador a menos que copies el resumen al Control Room.',
    local:'SOLO LOCAL — no escribe datos de miembros ni de la iglesia',device:'Teléfono / dispositivo',account:'Tipo de cuenta de prueba',date:'Fecha',site:'Sitio / vista previa probada',notes:'Resultado observado / paso exacto que falló',build:'Versión probada',
    untested:'Sin probar',pass:'PASÓ',fail:'FALLÓ',copy:'Copiar resumen de evidencia',copied:'Copiado',reset:'Borrar lista local',confirm:'¿Borrar todos los resultados guardados localmente en este navegador?',
    complete:'pruebas requeridas pasaron',remaining:'todavía necesitan prueba',failed:'fallaron',summaryTitle:'PRUEBA DE TELÉFONO — KINGDOM NETWORK',language:'Idioma de la lista',noNotes:'Sin notas',
    evidence:'Agrega el dispositivo, tipo de cuenta de prueba, fecha, un sitio http/https válido y una nota corta de lo que realmente observaste. Marca el idioma o idiomas que realmente probaste. PASÓ requiere inglés y español; FALLÓ puede registrarse en cuanto falle cualquiera de los idiomas probados.',proofComplete:'PRUEBA DE TELÉFONO COMPLETA — todos los flujos requeridos pasaron en inglés y español con evidencia en un solo sitio y esta versión Git exacta verificada.',proofIncomplete:'PRUEBA DE TELÉFONO INCOMPLETA — todavía no la trates como aceptación del piloto.',proofStatus:'Estado de prueba con teléfono',
    how:'Pasos de prueba',expected:'Resultado esperado',siteHelp:'Usa la dirección http/https exacta del sitio o vista previa donde hiciste esta prueba. Páginas distintas del mismo sitio cuentan como un solo sitio.',
    mixedSites:'LOS SITIOS NO COINCIDEN — los resultados completados apuntan a más de un sitio/vista previa. Vuelve a probar o corrige el sitio para comprobar una sola versión de forma consistente.',siteStatus:'Consistencia del sitio',oneSite:'Un solo sitio probado',manySites:'Varios sitios probados',
    buildStatus:'Identidad de versión',buildVerified:'Commit Git verificado',buildMissing:'VERSIÓN NO VERIFICADA — este entorno no muestra un commit Git exacto de 40 caracteres. La prueba de teléfono no puede marcarse completa aquí.',
    staleBuild:'EVIDENCIA ANTERIOR REINICIADA — uno o más resultados PASÓ/FALLÓ pertenecían a otra versión Git, a una versión desconocida o no comprobaban la cobertura de idioma requerida. Se conservaron las notas, pero el resultado volvió a Sin probar para comprobar esta versión otra vez.',
    currentBuildOnly:'PASÓ/FALLÓ queda ligado a esta versión Git exacta. Si cambia la versión desplegada, los resultados completados vuelven automáticamente a Sin probar.',
    editReset:'Si cambias el dispositivo, cuenta, fecha, sitio, notas o evidencia de idioma después de PASÓ/FALLÓ, el resultado vuelve a Sin probar y debes comprobarlo otra vez.',
    invalidSite:'Escribe una dirección completa que empiece con http:// o https:// antes de marcar PASÓ o FALLÓ.',
    languageProof:'Idiomas realmente probados',englishTested:'Inglés probado',spanishTested:'Español probado',languageHelp:'PASÓ permanece desactivado hasta marcar inglés y español. Si falla cualquier idioma, marca el idioma que probaste y registra FALLÓ con el paso exacto que falló.',
    languageSummary:'Evidencia de idioma',
    signup:'Registro público → confirmación → Empieza Aquí → salir/entrar',existing:'Cuenta existente → unirse a iglesia → misma cuenta, sin duplicado',invite:'Funciona la invitación más reciente; enlace viejo/reemplazado se recupera claramente',reset:'Olvidé contraseña → correo más reciente → nueva contraseña → entrar',spanish:'Registro / confirmación / Empieza Aquí / primer Inicio en español',guide:'Ayuda de recuperación de Kingdom Guide en inglés y español',setup:'Fresh Church Setup → aprobar recomendación → borrador sin publicar en Course Builder'
  }
} as const

const flowGuide:{en:Record<CheckId,{steps:string[];expected:string}>;es:Record<CheckId,{steps:string[];expected:string}>}={
  en:{
    signup:{steps:['Open the public signup flow on this phone and create a brand-new test account.','Open the newest confirmation email on the same phone and finish Start Here.','Sign out, then sign back in with that same account.'],expected:'The same new account reaches Home after Start Here and can sign out/in without getting stuck or creating another account.'},
    existing:{steps:['Use a test account that already exists and is not connected to the target church.','Open the target church’s newest join link, choose sign in, and use that existing account.','Finish the join and check Home/My Journey for the church connection.'],expected:'The existing account becomes connected to the church. No second account is created.'},
    invite:{steps:['Create or use a current test invitation and open the newest link on this phone.','If a replacement invitation exists, also open the older/replaced link.','Follow the recovery instruction from the old link, then open the newest invitation.'],expected:'The newest invitation works. An old/replaced link does not dead-end or expose technical errors and clearly directs the tester to the newest link.'},
    reset:{steps:['From Sign In, request a password reset for a test account.','Open only the newest reset email on this phone and set a new password.','Continue to Sign In and log in with the new password.'],expected:'Reset completes once, Sign In works with the new password, and any safe church-join return context is preserved.'},
    spanish:{steps:['Switch to Español before starting the signup flow.','Complete confirmation and Start Here while staying in Spanish.','Open the first Home screen and basic recovery/navigation controls.'],expected:'The critical first-login path stays understandable in Spanish without unexpected English-only dead ends.'},
    guide:{steps:['Open Kingdom Guide in English and ask for help with password reset or joining a church with an existing account.','Switch to Spanish and ask the same kind of recovery question.','Trigger/use the Guide retry path if a safe test condition is available.'],expected:'Guide gives simple account-recovery guidance in the selected language and never exposes provider/database text.'},
    setup:{steps:['As a pastor/church-admin test account, open Church Builder → Setup Inbox.','Upload safe test material, review the recommendation, and approve it once.','Open the resulting Course Builder item and inspect publication state.'],expected:'The flow is understandable on phone, repeat taps are guarded, and the generated course remains an unpublished draft.'}
  },
  es:{
    signup:{steps:['Abre el registro público en este teléfono y crea una cuenta de prueba totalmente nueva.','Abre el correo de confirmación más reciente en el mismo teléfono y termina Empieza Aquí.','Cierra sesión y vuelve a entrar con esa misma cuenta.'],expected:'La misma cuenta nueva llega a Inicio después de Empieza Aquí y puede salir/entrar sin quedarse atorada ni crear otra cuenta.'},
    existing:{steps:['Usa una cuenta de prueba que ya existe y que todavía no está conectada a la iglesia destino.','Abre el enlace más reciente para unirse a la iglesia, elige entrar y usa esa cuenta existente.','Termina la unión y revisa Inicio/Mi Jornada para confirmar la conexión.'],expected:'La cuenta existente queda conectada a la iglesia. No se crea una segunda cuenta.'},
    invite:{steps:['Crea o usa una invitación de prueba vigente y abre el enlace más reciente en este teléfono.','Si existe una invitación de reemplazo, abre también el enlace viejo/reemplazado.','Sigue la instrucción de recuperación del enlace viejo y después abre la invitación más reciente.'],expected:'La invitación más reciente funciona. Un enlace viejo/reemplazado no deja al usuario atorado ni muestra errores técnicos y lo dirige claramente al enlace nuevo.'},
    reset:{steps:['Desde Entrar, solicita restablecer la contraseña de una cuenta de prueba.','Abre solamente el correo de restablecimiento más reciente en este teléfono y crea una contraseña nueva.','Continúa a Entrar e inicia sesión con la contraseña nueva.'],expected:'El restablecimiento termina una sola vez, la nueva contraseña funciona y se conserva cualquier regreso seguro a un enlace de iglesia.'},
    spanish:{steps:['Cambia a Español antes de comenzar el registro.','Completa la confirmación y Empieza Aquí manteniéndote en español.','Abre la primera pantalla de Inicio y los controles básicos de recuperación/navegación.'],expected:'La ruta crítica del primer ingreso se mantiene entendible en español sin callejones sin salida inesperados en inglés.'},
    guide:{steps:['Abre Kingdom Guide en inglés y pide ayuda para restablecer la contraseña o unirte a una iglesia con una cuenta existente.','Cambia a español y haz una pregunta similar de recuperación.','Usa la ruta segura de reintento de Guide si existe una condición de prueba disponible.'],expected:'Guide da instrucciones sencillas de recuperación en el idioma seleccionado y nunca muestra texto técnico del proveedor o base de datos.'},
    setup:{steps:['Como cuenta de prueba pastor/admin de iglesia, abre Church Builder → Setup Inbox.','Sube material seguro de prueba, revisa la recomendación y apruébala una sola vez.','Abre el elemento resultante en Course Builder y revisa su estado de publicación.'],expected:'El flujo se entiende en teléfono, los toques repetidos están protegidos y el curso generado permanece como borrador sin publicar.'}
  }
}

function storageKey(scope:string){return `kn-phone-proof:${scope || 'unknown'}`}
function normalizedSite(value:string){
  try{
    const url=new URL(value.trim())
    if(url.protocol!=='http:'&&url.protocol!=='https:')return ''
    return url.origin.toLowerCase()
  }catch{return ''}
}
function isVerifiedBuild(buildId:string){return /^[0-9a-f]{40}$/i.test(buildId.trim())}
function hasBaseEvidence(entry:Entry){return Boolean(entry.device.trim()&&entry.account.trim()&&entry.date.trim()&&normalizedSite(entry.site)&&entry.notes.trim())}
function hasAnyLanguageEvidence(entry:Entry){return entry.englishTested||entry.spanishTested}
function hasBothLanguages(entry:Entry){return entry.englishTested&&entry.spanishTested}
function evidenceMatchesBuild(entry:Entry,buildId:string){return isVerifiedBuild(buildId)&&entry.build.trim().toLowerCase()===buildId.trim().toLowerCase()}
function normalizeEvidence(entry:Entry,buildId:string):Entry{
  const resultHasRequiredLanguage=entry.result==='pass'?hasBothLanguages(entry):entry.result==='fail'?hasAnyLanguageEvidence(entry):true
  if(entry.result!=='untested'&&(!hasBaseEvidence(entry)||!resultHasRequiredLanguage||!evidenceMatchesBuild(entry,buildId)))return {...entry,result:'untested',build:''}
  if(entry.result==='untested'&&entry.build)return {...entry,build:''}
  return entry
}

export default function PhoneProofClient({lang,churchId,buildId}:{lang:Lang;churchId:string;buildId:string}){
  const t=copy[lang]
  const guide=flowGuide[lang]
  const [state,setState]=useState<State>(()=>emptyState())
  const [hydrated,setHydrated]=useState(false)
  const [copied,setCopied]=useState(false)
  const [staleBuildEvidence,setStaleBuildEvidence]=useState(false)
  const verifiedBuild=isVerifiedBuild(buildId)
  const currentBuild=buildId.trim().toLowerCase()

  useEffect(()=>{
    try{
      const origin=window.location.origin.slice(0,160)
      const raw=window.localStorage.getItem(storageKey(churchId))
      const next=emptyState()
      let stale=false
      if(raw){
        const parsed=JSON.parse(raw) as Partial<State>
        for(const id of ids){
          const value=parsed[id]
          if(value&&['untested','pass','fail'].includes(String(value.result))){
            const candidate:Entry={
              result:value.result as Result,
              device:String(value.device??'').slice(0,120),
              account:String(value.account??'').slice(0,120),
              date:String(value.date??'').slice(0,20),
              site:String(value.site??'').slice(0,160),
              notes:String(value.notes??'').slice(0,500),
              build:String(value.build??'').slice(0,40),
              englishTested:Boolean(value.englishTested),
              spanishTested:Boolean(value.spanishTested)
            }
            if(candidate.result!=='untested'&&!evidenceMatchesBuild(candidate,buildId))stale=true
            const normalized=normalizeEvidence(candidate,buildId)
            if(candidate.result!=='untested'&&normalized.result==='untested')stale=true
            next[id]=normalized
          }
        }
      }
      for(const id of ids){if(!next[id].site)next[id]={...next[id],site:origin}}
      setStaleBuildEvidence(stale)
      setState(next)
    }catch{}
    setHydrated(true)
  },[churchId,buildId])

  useEffect(()=>{
    if(!hydrated)return
    try{window.localStorage.setItem(storageKey(churchId),JSON.stringify(state))}catch{}
  },[state,churchId,hydrated])

  const stats=useMemo(()=>{
    const values=Object.values(state)
    return {pass:values.filter(v=>v.result==='pass').length,fail:values.filter(v=>v.result==='fail').length,remaining:values.filter(v=>v.result==='untested').length}
  },[state])
  const testedSites=useMemo(()=>new Set(Object.values(state).filter(v=>v.result!=='untested').map(v=>normalizedSite(v.site)).filter(Boolean)),[state])
  const oneTestedSite=testedSites.size<=1
  const allCurrentBuild=Object.values(state).filter(v=>v.result!=='untested').every(v=>evidenceMatchesBuild(v,buildId))
  const allBilingual=Object.values(state).filter(v=>v.result==='pass').every(v=>hasBothLanguages(v))
  const allPassed=stats.pass===ids.length&&stats.fail===0&&stats.remaining===0&&oneTestedSite&&verifiedBuild&&allCurrentBuild&&allBilingual

  function updateEvidence(id:CheckId,patch:Partial<Pick<Entry,'device'|'account'|'date'|'site'|'notes'|'englishTested'|'spanishTested'>>){
    setState(current=>{
      const item=current[id]
      const evidenceChanged=Object.entries(patch).some(([key,value])=>item[key as keyof Entry]!==value)
      const next={...item,...patch,result:evidenceChanged&&item.result!=='untested'?'untested':item.result,build:evidenceChanged&&item.result!=='untested'?'':item.build}
      return {...current,[id]:normalizeEvidence(next,buildId)}
    })
  }

  function markResult(id:CheckId,result:Result){
    setState(current=>{
      const item=current[id]
      const languageReady=result==='pass'?hasBothLanguages(item):result==='fail'?hasAnyLanguageEvidence(item):true
      if(result!=='untested'&&(!verifiedBuild||!hasBaseEvidence(item)||!languageReady))return current
      const next={...item,result,build:result==='untested'?'':currentBuild}
      return {...current,[id]:normalizeEvidence(next,buildId)}
    })
  }

  function summary(){
    const proofStatus=allPassed?t.proofComplete:t.proofIncomplete
    const lines=[t.summaryTitle,`${t.language}: ${lang==='es'?'Español':'English'}`,`${t.build}: ${buildId}`,`${t.buildStatus}: ${verifiedBuild?t.buildVerified:t.buildMissing}`,`${t.proofStatus}: ${proofStatus}`,`${t.siteStatus}: ${oneTestedSite?t.oneSite:t.manySites}`,`PASS: ${stats.pass}/${ids.length} | FAIL: ${stats.fail} | ${t.remaining}: ${stats.remaining}`,'']
    for(const id of ids){
      const item=state[id]
      const result=item.result==='pass'?t.pass:item.result==='fail'?t.fail:t.untested
      lines.push(`[${result}] ${t[id]}`)
      lines.push(`- ${t.device}: ${item.device||'—'}`)
      lines.push(`- ${t.account}: ${item.account||'—'}`)
      lines.push(`- ${t.date}: ${item.date||'—'}`)
      lines.push(`- ${t.site}: ${item.site||'—'}`)
      lines.push(`- ${t.build}: ${item.build||'—'}`)
      lines.push(`- ${t.languageSummary}: ${item.englishTested?'EN ✓':'EN —'} | ${item.spanishTested?'ES ✓':'ES —'}`)
      lines.push(`- ${t.notes}: ${item.notes||t.noNotes}`,'')
    }
    return lines.join('\n')
  }

  async function copySummary(){
    try{await navigator.clipboard.writeText(summary())}
    catch{
      const textarea=document.createElement('textarea')
      textarea.value=summary();textarea.style.position='fixed';textarea.style.opacity='0';document.body.appendChild(textarea);textarea.select();document.execCommand('copy');textarea.remove()
    }
    setCopied(true)
    window.setTimeout(()=>setCopied(false),1800)
  }

  function clearAll(){
    if(!window.confirm(t.confirm))return
    const origin=window.location.origin.slice(0,160)
    const next=emptyState()
    for(const id of ids)next[id]={...next[id],site:origin}
    setState(next)
    setStaleBuildEvidence(false)
    try{window.localStorage.removeItem(storageKey(churchId))}catch{}
  }

  return <>
    <section className="proof-summary" aria-live="polite">
      <div><strong>{stats.pass}/{ids.length}</strong><span>{t.complete}</span></div>
      <div><strong>{stats.remaining}</strong><span>{t.remaining}</span></div>
      <div><strong>{stats.fail}</strong><span>{t.failed}</span></div>
    </section>

    <div className={`local-note ${allPassed?'complete':''}`} role="status" aria-live="polite">{allPassed?t.proofComplete:t.proofIncomplete}</div>
    {!verifiedBuild&&<div className="evidence-hint" role="alert">{t.buildMissing}</div>}
    {staleBuildEvidence&&<div className="evidence-hint" role="alert">{t.staleBuild}</div>}
    {!oneTestedSite&&<div className="evidence-hint" role="alert">{t.mixedSites}</div>}
    <div className="local-note">{t.local}</div>
    <div className="field-help">{t.currentBuildOnly} {t.editReset}</div>

    <section className="proof-list">
      {ids.map((id,index)=>{
        const item=state[id]
        const evidenceReady=hasBaseEvidence(item)&&verifiedBuild
        const passReady=evidenceReady&&hasBothLanguages(item)
        const failReady=evidenceReady&&hasAnyLanguageEvidence(item)
        const validSite=Boolean(normalizedSite(item.site))
        return <article className={`proof-item ${item.result}`} key={id}>
          <div className="proof-item-head"><div><span className="step">{index+1}</span><h2>{t[id]}</h2></div><div className="result-buttons" role="group" aria-label={`${index+1}. ${t[id]}`}>
            <button type="button" className={item.result==='untested'?'active':''} onClick={()=>markResult(id,'untested')}>{t.untested}</button>
            <button type="button" className={item.result==='pass'?'active':''} disabled={!passReady} aria-disabled={!passReady} onClick={()=>markResult(id,'pass')}>{t.pass}</button>
            <button type="button" className={item.result==='fail'?'active':''} disabled={!failReady} aria-disabled={!failReady} onClick={()=>markResult(id,'fail')}>{t.fail}</button>
          </div></div>
          <div className="test-guide">
            <strong>{t.how}</strong>
            <ol>{guide[id].steps.map(stepText=><li key={stepText}>{stepText}</li>)}</ol>
            <p><strong>{t.expected}:</strong> {guide[id].expected}</p>
          </div>
          {!evidenceReady&&<p className="evidence-hint">{verifiedBuild?t.evidence:t.buildMissing}</p>}
          {evidenceReady&&!passReady&&<p className="evidence-hint">{t.languageHelp}</p>}
          <fieldset className="wide" disabled={!evidenceReady}>
            <legend>{t.languageProof}</legend>
            <label><input type="checkbox" checked={item.englishTested} onChange={e=>updateEvidence(id,{englishTested:e.target.checked})}/>{t.englishTested}</label>
            <label><input type="checkbox" checked={item.spanishTested} onChange={e=>updateEvidence(id,{spanishTested:e.target.checked})}/>{t.spanishTested}</label>
            <span className="field-help">{t.languageHelp}</span>
          </fieldset>
          <div className="fields">
            <label>{t.device}<input maxLength={120} value={item.device} onChange={e=>updateEvidence(id,{device:e.target.value})} placeholder={lang==='es'?'Ej. iPhone 14, Safari':'e.g. iPhone 14, Safari'}/></label>
            <label>{t.account}<input maxLength={120} value={item.account} onChange={e=>updateEvidence(id,{account:e.target.value})} placeholder={lang==='es'?'Ej. miembro nuevo de prueba':'e.g. new-member test account'}/></label>
            <label>{t.date}<input type="date" value={item.date} onChange={e=>updateEvidence(id,{date:e.target.value})}/></label>
            <label className="wide">{t.site}<input type="url" inputMode="url" maxLength={160} value={item.site} aria-invalid={Boolean(item.site)&&!validSite} onChange={e=>updateEvidence(id,{site:e.target.value})}/><span className="field-help">{t.siteHelp}</span>{Boolean(item.site)&&!validSite&&<span className="evidence-hint">{t.invalidSite}</span>}</label>
            <label className="wide">{t.build}<input value={item.build||currentBuild} readOnly aria-readonly="true"/></label>
            <label className="wide">{t.notes}<textarea maxLength={500} rows={3} value={item.notes} onChange={e=>updateEvidence(id,{notes:e.target.value})}/></label>
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