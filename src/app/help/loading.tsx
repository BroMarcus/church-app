'use client'

import {useSearchParams} from 'next/navigation'

export default function HelpLoading(){
  const searchParams=useSearchParams(),es=searchParams.get('lang')==='es'
  const t=(en:string,sp:string)=>es?sp:en
  return <main aria-busy="true" aria-live="polite" style={{maxWidth:960,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{t('Private Care','Cuidado Privado')}</div>
      <h1 style={{margin:'10px 0 8px'}}>{t('Loading your private care…','Cargando tu cuidado privado…')}</h1>
      <p style={{margin:0,color:'#6b7280'}}>{t('Keep this page open while we safely check your church information.','Mantén esta página abierta mientras verificamos de forma segura la información de tu iglesia.')}</p>
    </div>
  </main>
}
