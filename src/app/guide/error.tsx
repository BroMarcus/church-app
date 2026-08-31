'use client'

import {useSearchParams} from 'next/navigation'
import {useEffect,useState} from 'react'

const copy={
  en:{title:'Kingdom Guide could not load.',body:'No information was changed. Try again when you are ready.',retry:'Try Kingdom Guide again',home:'Go to Home',help:'Help & Feedback'},
  es:{title:'Kingdom Guide no pudo cargar.',body:'No se cambió ninguna información. Inténtalo otra vez cuando estés listo.',retry:'Intentar Kingdom Guide otra vez',home:'Ir a Inicio',help:'Ayuda y comentarios'}
} as const
const prefersSpanish=(value:string|null|undefined)=>/^\s*es(?:-|_|,|;|$)/i.test(value||'')

export default function GuideError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const explicit=params.get('lang')
  const [browserSpanish,setBrowserSpanish]=useState(false)
  useEffect(()=>{setBrowserSpanish(prefersSpanish(navigator.language||navigator.languages?.[0]))},[])
  const lang:'en'|'es'=explicit==='es'?'es':explicit==='en'?'en':browserSpanish?'es':'en'
  const t=copy[lang]
  return <main style={{maxWidth:960,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Guide</div>
      <h1 style={{margin:'10px 0 8px'}}>{t.title}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280',lineHeight:1.6}}>{t.body}</p>
      <div style={{display:'grid',gap:10}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t.retry}</button>
        <a href={`/?lang=${lang}`} style={{minHeight:44,display:'grid',placeItems:'center',padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',fontWeight:700,textDecoration:'none'}}>{t.home}</a>
        <a href={`/feedback?lang=${lang}`} style={{minHeight:44,display:'grid',placeItems:'center',padding:'10px 16px',borderRadius:10,border:'1px solid #e5e7eb',fontWeight:700,textDecoration:'none'}}>{t.help}</a>
      </div>
    </div>
  </main>
}
