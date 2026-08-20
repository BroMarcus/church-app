export default function InvitesLoading(){
  return <main aria-busy="true" style={{maxWidth:1000,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div style={{border:'1px solid #e5e7eb',borderRadius:18,padding:24,background:'#fff'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:'.08em',textTransform:'uppercase'}}>Church Invitations / Invitaciones de la Iglesia</div>
      <h1 style={{margin:'10px 0 8px'}}>Loading invitations… / Cargando invitaciones…</h1>
      <p style={{margin:0,color:'#6b7280'}}>We’re checking active invitation links and church access. / Estamos revisando los enlaces de invitación activos y el acceso a la iglesia.</p>
    </div>
  </main>
}
