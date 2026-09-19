'use client'

import {useSearchParams} from 'next/navigation'

const copy={
  en:{label:'START HERE',title:'Getting your first steps ready…',body:'We’ll keep this simple. Keep this page open while your account and church connection are checked.'},
  es:{label:'EMPIEZA AQUÍ',title:'Preparando tus primeros pasos…',body:'Lo mantendremos sencillo. Mantén esta página abierta mientras verificamos tu cuenta y conexión con la iglesia.'}
} as const

export default function StartLoading(){
  const params=useSearchParams()
  const lang=params.get('lang')==='es'?'es':'en'
  const t=copy[lang]
  return <main style={{maxWidth:920,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{t.label}</div>
      <h1 style={{margin:'10px 0 8px'}}>{t.title}</h1>
      <p style={{margin:0,color:'#6b7280',lineHeight:1.6}}>{t.body}</p>
    </div>
  </main>
}
