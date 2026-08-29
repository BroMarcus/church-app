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

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const [lang,setLang]=useState<'en'|'es'>('en')

  useEffect(()=>{
    console.error('Kingdom Network root failed',{digest:boundedDigest(error.digest)})
    const selected=resolveRecoveryLanguage()
    setLang(selected)
    document.documentElement.lang=selected
  },[error])

  const es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const signIn=`/login?mode=signin&lang=${lang}`
  const selectLanguage=(next:'en'|'es')=>{
    setLang(next)
    document.documentElement.lang=next
    const url=new URL(window.location.href)
    url.searchParams.set('lang',next)
    window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`)
  }

  return <html lang={lang}><body style={{margin:0,fontFamily:'system-ui, sans-serif',background:'#f8fafc',color:'#111827'}}><main style={{maxWidth:760,margin:'0 auto',padding:'40px 18px 80px'}}><div role="alert" aria-live="assertive" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div><h1 style={{margin:'10px 0 8px'}}>{t('Kingdom Network needs to reload','Kingdom Network necesita recargarse')}</h1><p style={{margin:'0 0 18px',color:'#4b5563',lineHeight:1.6}}>{t('Your account and saved church information were not changed. Try reloading this screen. If it still does not open, return to Sign in.','Tu cuenta y la información guardada de tu iglesia no fueron modificadas. Intenta recargar esta pantalla. Si todavía no abre, vuelve a Iniciar sesión.')}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Reload','Recargar')}</button><button type="button" onClick={()=>window.location.assign(signIn)} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Sign in','Iniciar sesión')}</button></div><div style={{display:'flex',gap:8,marginTop:18,flexWrap:'wrap'}} aria-label={t('Language','Idioma')}><button type="button" onClick={()=>selectLanguage('en')} aria-pressed={!es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>English</button><button type="button" onClick={()=>selectLanguage('es')} aria-pressed={es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>Español</button></div></div></main></body></html>
}