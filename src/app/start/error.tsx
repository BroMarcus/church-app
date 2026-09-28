'use client'

import {useSearchParams} from 'next/navigation'

const copy={
  en:{label:'START HERE',title:'Your first steps could not load.',body:'Your account and progress were not changed. Try again when you are ready.',retry:'Try Start Here again',signin:'Go to Sign In'},
  es:{label:'EMPIEZA AQUÍ',title:'No pudimos cargar tus primeros pasos.',body:'Tu cuenta y tu progreso no fueron modificados. Inténtalo otra vez cuando estés listo.',retry:'Intentar Empieza Aquí otra vez',signin:'Ir a Iniciar sesión'}
} as const

function browserLanguage(){
  const languages=navigator.languages?.length?navigator.languages:[navigator.language]
  for(const value of languages){
    const tag=String(value||'').toLowerCase()
    if(tag==='es'||tag.startsWith('es-')) return 'es'
    if(tag==='en'||tag.startsWith('en-')) return 'en'
  }
  return 'en'
}

export default function StartError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const explicitLang=params.get('lang')
  const lang=explicitLang==='es'||explicitLang==='en'?explicitLang:browserLanguage()
  const t=copy[lang]
  return <main style={{maxWidth:920,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{t.label}</div>
      <h1 style={{margin:'10px 0 8px'}}>{t.title}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280',lineHeight:1.6}}>{t.body}</p>
      <div style={{display:'grid',gap:10}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t.retry}</button>
        <a href={`/login?lang=${lang}&mode=signin`} style={{minHeight:44,display:'grid',placeItems:'center',padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',fontWeight:700,textDecoration:'none'}}>{t.signin}</a>
      </div>
    </div>
  </main>
}
