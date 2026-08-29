'use client'

import {useEffect,useState} from 'react'

const resolveRecoveryLanguage=(): 'en'|'es' => {
  const requested=new URLSearchParams(window.location.search).get('lang')
  if(requested==='es')return 'es'
  if(requested==='en')return 'en'
  if(document.documentElement.lang.toLowerCase().startsWith('es'))return 'es'
  const browserLanguages=Array.isArray(navigator.languages)&&navigator.languages.length?navigator.languages:[navigator.language]
  return browserLanguages.some(value=>String(value||'').toLowerCase().startsWith('es'))?'es':'en'
}

export default function HomeLoading(){
  const [lang,setLang]=useState<'en'|'es'>('en')

  useEffect(()=>{
    const selected=resolveRecoveryLanguage()
    setLang(selected)
    document.documentElement.lang=selected
  },[])

  const es=lang==='es'
  return <main style={{maxWidth:1180,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="status" aria-live="polite" aria-busy="true" style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Network</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'Preparando tu Inicio…':'Getting your Home ready…'}</h1>
      <p style={{margin:0,color:'#6b7280',lineHeight:1.6}}>{es?'Mantén esta página abierta. Estamos preparando solo lo que necesitas ahora.':'Please keep this page open. We are gathering only what you need right now.'}</p>
    </div>
  </main>
}