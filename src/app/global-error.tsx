'use client'

import {useEffect,useState} from 'react'

export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const [lang,setLang]=useState<'en'|'es'>('en')

  useEffect(()=>{
    console.error('Kingdom Network root failed',{digest:error.digest??'unknown'})
    setLang(new URLSearchParams(window.location.search).get('lang')==='es'?'es':'en')
  },[error])

  const es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const signIn=es?'/login?mode=signin&lang=es':'/login?mode=signin'

  return <html lang={lang}><body style={{margin:0,fontFamily:'system-ui, sans-serif',background:'#f8fafc',color:'#111827'}}><main style={{maxWidth:760,margin:'0 auto',padding:'40px 18px 80px'}}><div role="alert" aria-live="assertive" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}><div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div><h1 style={{margin:'10px 0 8px'}}>{t('Kingdom Network needs to reload','Kingdom Network necesita recargarse')}</h1><p style={{margin:'0 0 18px',color:'#4b5563',lineHeight:1.6}}>{t('Your account and saved church information were not changed. Try reloading this screen. If it still does not open, return to Sign in.','Tu cuenta y la información guardada de tu iglesia no fueron modificadas. Intenta recargar esta pantalla. Si todavía no abre, vuelve a Iniciar sesión.')}</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Reload','Recargar')}</button><button type="button" onClick={()=>window.location.assign(signIn)} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Sign in','Iniciar sesión')}</button></div><div style={{display:'flex',gap:8,marginTop:18,flexWrap:'wrap'}} aria-label={t('Language','Idioma')}><button type="button" onClick={()=>setLang('en')} aria-pressed={!es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>English</button><button type="button" onClick={()=>setLang('es')} aria-pressed={es} style={{border:0,background:'transparent',textDecoration:'underline',cursor:'pointer'}}>Español</button></div></div></main></body></html>
}
