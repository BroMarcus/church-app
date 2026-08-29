'use client'

import {useSearchParams} from 'next/navigation'

const copy={
  en:{title:'Getting Kingdom Guide ready…',body:'Keep this page open while your church connection and approved help resources are checked.'},
  es:{title:'Preparando Kingdom Guide…',body:'Mantén esta página abierta mientras verificamos tu conexión con la iglesia y los recursos de ayuda aprobados.'}
} as const

export default function GuideLoading(){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  return <main style={{maxWidth:960,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Kingdom Guide</div>
      <h1 style={{margin:'10px 0 8px'}}>{t.title}</h1>
      <p style={{margin:0,color:'#6b7280',lineHeight:1.6}}>{t.body}</p>
    </div>
  </main>
}
