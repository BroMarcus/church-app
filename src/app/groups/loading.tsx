'use client'

import {useSearchParams} from 'next/navigation'

export default function GroupsLoading(){
  const params=useSearchParams(),es=params.get('lang')==='es'
  return <main aria-busy="true" aria-live="polite" style={{maxWidth:1100,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>{es?'Grupos de Amistad':'Friendship Groups'}</div>
      <h1 style={{margin:'10px 0 8px'}}>{es?'Cargando tus grupos…':'Loading your groups…'}</h1>
      <p style={{margin:0,color:'#6b7280'}}>{es?'Estamos preparando tus grupos y los detalles de la próxima reunión.':'We are getting your groups and next-meeting details ready.'}</p>
    </div>
  </main>
}
