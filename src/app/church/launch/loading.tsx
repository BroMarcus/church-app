'use client'

import { useSearchParams } from 'next/navigation'

export default function ChurchLaunchLoading(){
  const params=useSearchParams()
  const es=params.get('lang')==='es'
  return <main style={{maxWidth:1040,margin:'0 auto',padding:'28px 18px 80px'}} aria-busy="true" aria-live="polite">
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'CONSTRUCTOR DE IGLESIA':'CHURCH BUILDER'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'Revisando qué necesita tu iglesia después…':'Checking what your church needs next…'}</h1>
      <p style={{margin:0,color:'#6b7280'}}>{es?'Te mostraremos un solo próximo paso claro.':'We’ll show one clear next step.'}</p>
    </div>
  </main>
}