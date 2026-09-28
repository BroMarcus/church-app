'use client'

import {useSearchParams} from 'next/navigation'

export default function PrayerLoading(){
  const es=useSearchParams().get('lang')==='es'
  return <main style={{maxWidth:980,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'Oración':'Prayer'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'Cargando peticiones de oración…':'Loading prayer requests…'}</h1>
      <p style={{margin:0,color:'#6b7280'}}>{es?'Nada se está compartiendo, marcando como contestado ni cambiando mientras carga.':'Nothing is being shared, marked answered, or changed while this loads.'}</p>
    </div>
  </main>
}
