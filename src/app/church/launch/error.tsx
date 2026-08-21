'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export default function ChurchLaunchError({reset}:{reset:()=>void}){
  const params=useSearchParams()
  const es=params.get('lang')==='es'
  return <main style={{maxWidth:1040,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'CONSTRUCTOR DE IGLESIA':'CHURCH BUILDER'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'No se pudo abrir el Constructor de Iglesia.':'Church Builder could not load.'}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280'}}>{es?'No se cambió nada en la configuración de tu iglesia. Inténtalo de nuevo.':'Nothing in your church setup was changed. Try again.'}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{es?'Intentar de nuevo':'Try again'}</button>
        <Link href={es?'/church?lang=es':'/church'} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>{es?'Volver a Administración':'Back to Church Admin'}</Link>
      </div>
    </div>
  </main>
}