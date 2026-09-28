'use client'

import {useEffect,useState} from 'react'

const boundedDigest=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'

const resolveRecoveryLanguage=(): 'en'|'es' => {
  const requested=new URLSearchParams(window.location.search).get('lang')
  if(requested==='es')return 'es'
  if(requested==='en')return 'en'
  if(document.documentElement.lang.toLowerCase().startsWith('es'))return 'es'
  const browserLanguages=Array.isArray(navigator.languages)&&navigator.languages.length?navigator.languages:[navigator.language]
  return browserLanguages.some(value=>String(value||'').toLowerCase().startsWith('es'))?'es':'en'
}

export default function HomeError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const [lang,setLang]=useState<'en'|'es'>('en')

  useEffect(()=>{
    console.error('Kingdom Network page failed',{digest:boundedDigest(error.digest)})
    const selected=resolveRecoveryLanguage()
    setLang(selected)
    document.documentElement.lang=selected
  },[error])

  const es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const withLang=(path:string)=>`${path}${path.includes('?')?'&':'?'}lang=${lang}`
  const go=(path:string)=>{window.location.assign(withLang(path))}
  const selectLanguage=(next:'en'|'es')=>{
    setLang(next)
    document.documentElement.lang=next
    const url=new URL(window.location.href)
    url.searchParams.set('lang',next)
    window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`)
  }

  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" aria-live="assertive" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div>
      <h1 style={{margin:'10px 0 8px'}}>{t('Something did not load','Algo no cargó')}</h1>
      <p style={{margin:'0 0 18px',color:'#4b5563',lineHeight:1.6}}>{t('Your account, church information, and progress were not changed. Try again first. If the problem continues, return Home and open the page again.','Tu cuenta, la información de tu iglesia y tu progreso no fueron modificados. Primero inténtalo otra vez. Si el problema continúa, vuelve a Inicio y abre la página de nuevo.')}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Try again','Intentar de nuevo')}</button>
        <button type="button" onClick={()=>go('/')} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Home','Inicio')}</button>
        <button type="button" onClick={()=>go('/login?mode=signin')} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Sign in','Iniciar sesión')}</button>
      </div>
      <div style={{display:'flex',gap:8,marginTop:18,flexWrap:'wrap'}} aria-label={t('Language','Idioma')}>
        <button type="button" onClick={()=>selectLanguage('en')} aria-pressed={!es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>English</button>
        <button type="button" onClick={()=>selectLanguage('es')} aria-pressed={es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>Español</button>
      </div>
    </div>
  </main>
}