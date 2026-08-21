'use client'

import Link from 'next/link'
import {useEffect} from 'react'
import {useSearchParams} from 'next/navigation'

export default function PrayerError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  const searchParams=useSearchParams(),es=searchParams.get('lang')==='es'
  useEffect(()=>{console.error('Prayer route failed',{digest:error.digest})},[error])
  const home=es?'/?lang=es':'/'
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'Oración':'Prayer'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'No pudimos cargar las peticiones de oración.':'Prayer requests could not load.'}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280'}}>{es?'No se cambió ninguna petición, opción de privacidad ni estado. Inténtalo otra vez.':'No prayer request, privacy choice, or answered status was changed. Try again.'}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{es?'Intentar de nuevo':'Try again'}</button>
        <Link href={home} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>{es?'Ir a Inicio':'Go Home'}</Link>
      </div>
    </div>
  </main>
}
