'use client'

import Link from 'next/link'
import {useSearchParams} from 'next/navigation'

export default function HelpError({reset}:{reset:()=>void}){
  const searchParams=useSearchParams(),es=searchParams.get('lang')==='es'
  const t=(en:string,sp:string)=>es?sp:en
  return <main style={{maxWidth:960,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div role="alert" style={{border:'1px solid #fecaca',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{t('Private Care','Cuidado Privado')}</div>
      <h1 style={{margin:'10px 0 8px'}}>{t('Private care could not load.','No se pudo cargar el cuidado privado.')}</h1>
      <p style={{margin:'0 0 16px',color:'#6b7280'}}>{t('We could not safely verify your church care information. Nothing was changed.','No pudimos verificar de forma segura la información de cuidado de tu iglesia. No se cambió nada.')}</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <button type="button" onClick={()=>reset()} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>{t('Try again','Intentar de nuevo')}</button>
        <Link href={es?'/?lang=es':'/'} style={{minHeight:44,padding:'10px 16px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center'}}>{t('Home','Inicio')}</Link>
      </div>
    </div>
  </main>
}
