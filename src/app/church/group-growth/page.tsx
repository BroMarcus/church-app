import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,ArrowUpRight,CheckCircle2,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function GroupGrowthPage({searchParams}:{searchParams:Promise<{lang?:string;days?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const days=Math.min(365,Math.max(7,Number.parseInt(params.days||'90',10)||90))
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [groupsPerm,outreachPerm]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_groups'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_outreach'})
  ])
  const canView=['pastor','church_admin'].includes(membership.role)||Boolean(groupsPerm.data)||Boolean(outreachPerm.data)
  if(!canView)redirect('/')
  const {data:rowsData,error}=await supabase.rpc('friendship_group_growth_metrics',{p_church_id:membership.church_id,p_days:days})
  if(error)throw new Error(error.message)
  const rows=rowsData??[],church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const totals=rows.reduce((a:any,r:any)=>({joined:a.joined+Number(r.joined_accounts||0),outreach:a.outreach+Number(r.active_outreach||0),attendees:a.attendees+Number(r.regular_attendees||0),connected:a.connected+Number(r.connected_people||0),overdue:a.overdue+Number(r.overdue_followups||0)}),{joined:0,outreach:0,attendees:0,connected:0,overdue:0})
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Crecimiento de Grupos':'Friendship Group Growth'}</div></div><div className="row"><Link className="ghost" href="/church/group-growth?lang=en">English</Link><Link className="ghost" href="/church/group-growth?lang=es">Español</Link><Link className="ghost" href={l('/church/analytics')}>{es?'Salud de la iglesia':'Church Health'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
    <section className="card" style={{padding:24,marginBottom:16}}><div className="pill">{es?'GRUPOS QUE ALCANZAN PERSONAS':'GROUPS REACHING PEOPLE'}</div><h1>{es?'Mira qué grupos están trayendo, siguiendo y conectando personas.':'See which groups are bringing, following up with and connecting people.'}</h1><p className="muted">{es?'Estos números usan la fuente real del invitado — reportes de grupo y enlaces/QR específicos — para que liderazgo pueda ver dónde hay fruto y dónde hace falta ayuda.':'These numbers use the guest’s actual source — group reports and group-specific join links/QRs — so leadership can see where there is fruit and where help is needed.'}</p></section>

    <form className="card" style={{padding:14,marginBottom:16}}><div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}><label className="field"><span>{es?'Ventana de tiempo':'Time window'}</span><select name="days" defaultValue={String(days)}><option value="30">30 {es?'días':'days'}</option><option value="60">60 {es?'días':'days'}</option><option value="90">90 {es?'días':'days'}</option><option value="180">180 {es?'días':'days'}</option><option value="365">365 {es?'días':'days'}</option></select></label>{es&&<input type="hidden" name="lang" value="es"/>}<button className="ghost">{es?'Actualizar':'Update'}</button></div></form>

    <section className="stat-grid" style={{marginBottom:18}}><div className="card stat-card"><Users/><div><strong>{totals.joined}</strong><span>{es?'cuentas unidas por grupos':'accounts joined through groups'}</span></div></div><div className="card stat-card"><ArrowUpRight/><div><strong>{totals.attendees}</strong><span>{es?'asistentes regulares':'regular attendees'}</span></div></div><div className="card stat-card"><CheckCircle2/><div><strong>{totals.connected}</strong><span>{es?'conectados / sirviendo':'connected / serving'}</span></div></div><div className={`card stat-card ${totals.overdue?'urgent':''}`}><AlertTriangle/><div><strong>{totals.overdue}</strong><span>{es?'seguimientos vencidos':'overdue follow-ups'}</span></div></div></section>

    <section style={{display:'grid',gap:12}}>{rows.map((r:any)=><article className="card" style={{padding:18}} key={r.group_id}><div className="row" style={{justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 4px'}}>{r.group_name}</h2><div className="small muted">{es?`Últimos ${days} días`:`Last ${days} days`}</div></div><Link className="ghost" href={l(`/groups/${r.group_id}`)}>{es?'Abrir grupo':'Open group'} →</Link></div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10,marginTop:14}}><div><strong style={{fontSize:24}}>{r.joined_accounts}</strong><div className="small muted">{es?'unidos por QR/enlace':'joined by QR/link'}</div></div><div><strong style={{fontSize:24}}>{r.active_outreach}</strong><div className="small muted">{es?'en alcance activo':'active outreach'}</div></div><div><strong style={{fontSize:24}}>{r.regular_attendees}</strong><div className="small muted">{es?'asistentes regulares':'regular attendees'}</div></div><div><strong style={{fontSize:24}}>{r.connected_people}</strong><div className="small muted">{es?'conectados / sirviendo':'connected / serving'}</div></div><div><strong style={{fontSize:24}}>{r.overdue_followups}</strong><div className="small muted">{es?'seguimientos vencidos':'overdue follow-ups'}</div></div></div></article>)}{!rows.length&&<div className="card" style={{padding:24,textAlign:'center'}}><Users size={28}/><h3>{es?'No hay grupos activos todavía.':'No active groups yet.'}</h3></div>}</section>
  </main>
}
