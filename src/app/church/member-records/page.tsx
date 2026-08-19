import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CheckCircle2,Droplets,Languages,Search,UserRound,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMemberRelationship } from './actions'

const nameOf=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Unnamed person'
const fmt=(v?:string|null)=>v?new Date(v+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—'
const relationshipLabel=(v:string,es:boolean)=>({guest:es?'Invitado':'Guest',attendee:es?'Asistente regular':'Regular attendee',member:es?'Miembro':'Member',inactive:es?'Inactivo':'Inactive'} as Record<string,string>)[v]||v

export default async function MemberRecordsPage({searchParams}:{searchParams:Promise<{q?:string;relationship?:string;lang?:string;error?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang=es?'es':'en'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id)redirect('/')
  const {data:customAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:actor.church_id,p_permission_key:'manage_members'})
  if(!['pastor','church_admin'].includes(actor.role)&&!customAccess)redirect('/')
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches

  const [{data:memberships},{data:profiles},{data:details},{data:milestones}]=await Promise.all([
    supabase.from('church_memberships').select('user_id,role,status,relationship_status,joined_at').eq('church_id',actor.church_id).order('joined_at',{ascending:false}),
    supabase.from('profiles').select('id,display_name,first_name,last_name,avatar_path'),
    supabase.from('member_private_details').select('user_id,email,phone,birthday,marriage_anniversary'),
    supabase.from('member_milestones').select('user_id,holy_ghost_received,holy_ghost_date,baptized,baptism_date,first_steps_status,first_steps_completed_at,soul_winning_status,timothys_status').eq('church_id',actor.church_id)
  ])
  const pm=new Map((profiles??[]).map((x:any)=>[x.id,x])),dm=new Map((details??[]).map((x:any)=>[x.user_id,x])),mm=new Map((milestones??[]).map((x:any)=>[x.user_id,x]))
  const all=(memberships??[]).map((membership:any)=>({membership,profile:pm.get(membership.user_id),details:dm.get(membership.user_id),milestone:mm.get(membership.user_id)}))
  const query=(params.q??'').trim().toLowerCase(),relationship=params.relationship??'all'
  const rows=all.filter((r:any)=>{
    if(relationship!=='all'&&r.membership.relationship_status!==relationship)return false
    if(!query)return true
    const hay=[nameOf(r.profile),r.details?.email,r.details?.phone,r.membership.role,r.membership.status,r.membership.relationship_status].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(query)
  })
  const activeAccounts=all.filter((r:any)=>r.membership.status==='active')
  const members=activeAccounts.filter((r:any)=>r.membership.relationship_status==='member')
  const guests=activeAccounts.filter((r:any)=>r.membership.relationship_status==='guest')
  const attendees=activeAccounts.filter((r:any)=>r.membership.relationship_status==='attendee')
  const holyGhost=members.filter((r:any)=>r.milestone?.holy_ghost_received===true).length
  const baptized=members.filter((r:any)=>r.milestone?.baptized===true).length
  const firstSteps=members.filter((r:any)=>r.milestone?.first_steps_status==='completed').length
  const missingBirthday=members.filter((r:any)=>!r.details?.birthday).length
  const missingContact=members.filter((r:any)=>!r.details?.phone&&!r.details?.email).length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??(es?'Tu Iglesia':'Your Church')} • {es?'Registros de Personas':'People Records'}</div></div><div className="row"><Languages size={14}/><Link className="ghost" href="/church/member-records?lang=en">English</Link><Link className="ghost" href="/church/member-records?lang=es">Español</Link>{['pastor','church_admin'].includes(actor.role)&&<Link className="ghost" href={l('/church')}>{es?'Administración':'Church Admin'}</Link>}<Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>

    <section className="card" style={{padding:24,marginBottom:16}}><div className="pill">{es?'PERSONAS Y JORNADA':'PEOPLE & JOURNEY'}</div><h1>{es?'Una cuenta activa no significa automáticamente “miembro”.':'An active account does not automatically mean “church member.”'}</h1><p className="muted">{es?'Kingdom Network separa el acceso a la aplicación de la relación con la iglesia: Invitado → Asistente regular → Miembro. Eso mantiene limpios los números que ve el pastor.':'Kingdom Network separates app access from church relationship: Guest → Regular Attendee → Member. That keeps Pastor’s numbers clean.'}</p></section>
    {params.error&&<div className="notice error">{params.error}</div>}

    <section className="stat-grid" style={{marginBottom:18}}>
      <div className="card stat-card"><Users/><div><strong>{members.length}</strong><span>{es?'Miembros':'Members'}</span></div></div>
      <div className="card stat-card"><UserRound/><div><strong>{guests.length}</strong><span>{es?'Invitados con cuenta':'Guests with accounts'}</span></div></div>
      <div className="card stat-card"><Users/><div><strong>{attendees.length}</strong><span>{es?'Asistentes regulares':'Regular attendees'}</span></div></div>
      <div className="card stat-card"><BookOpen/><div><strong>{firstSteps}</strong><span>First Steps {es?'completado por miembros':'complete among members'}</span></div></div>
    </section>

    <section className="card" style={{padding:16,marginBottom:18}}><div className="row" style={{gap:18,flexWrap:'wrap'}}><div><strong>{holyGhost}/{members.length}</strong><div className="small muted">{es?'miembros con Espíritu Santo verificado':'members with verified Holy Ghost'}</div></div><div><strong>{baptized}/{members.length}</strong><div className="small muted">{es?'miembros bautizados verificados':'members with verified baptism'}</div></div><div><strong>{missingBirthday}</strong><div className="small muted">{es?'miembros sin cumpleaños':'members missing birthday'}</div></div><div><strong>{missingContact}</strong><div className="small muted">{es?'miembros sin teléfono/correo':'members missing phone/email'}</div></div></div></section>

    <form className="card" action="/church/member-records" method="get" style={{padding:16,marginBottom:18}}><div className="row" style={{gap:10,alignItems:'end',flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 260px'}}><span>{es?'Buscar persona':'Search people'}</span><input name="q" defaultValue={params.q??''} placeholder={es?'Nombre, teléfono o correo…':'Name, phone or email…'}/></label><label className="field" style={{minWidth:190}}><span>{es?'Relación con la iglesia':'Church relationship'}</span><select name="relationship" defaultValue={relationship}><option value="all">{es?'Todos':'All'}</option><option value="guest">{es?'Invitados':'Guests'}</option><option value="attendee">{es?'Asistentes regulares':'Regular attendees'}</option><option value="member">{es?'Miembros':'Members'}</option><option value="inactive">{es?'Inactivos':'Inactive'}</option></select></label>{es&&<input type="hidden" name="lang" value="es"/>}<button className="btn"><Search size={14}/> {es?'Buscar':'Search'}</button></div></form>

    <section style={{display:'grid',gap:12}}>{rows.map((r:any)=>{const m=r.milestone??{},name=nameOf(r.profile),rel=r.membership.relationship_status||'member';return <article className="card" style={{padding:18}} key={r.membership.user_id}><div className="row" style={{justifyContent:'space-between',gap:14,alignItems:'center',flexWrap:'wrap'}}><div className="row" style={{gap:12,alignItems:'center'}}><div className="avatar large">{name.slice(0,1).toUpperCase()}</div><div><div className="row" style={{gap:7,flexWrap:'wrap'}}><h3 style={{margin:'0 0 4px'}}>{name}</h3><span className="pill">{relationshipLabel(rel,es).toUpperCase()}</span></div><div className="small muted">{r.details?.phone||r.details?.email||(es?'Sin contacto agregado':'No contact added')} • {es?'acceso':'access'}: {r.membership.status.replaceAll('_',' ')}</div><div className="small muted">{es?'Cumpleaños':'Birthday'}: {fmt(r.details?.birthday)} • {es?'Se unió':'Joined'}: {fmt(r.membership.joined_at)}</div></div></div><Link className="btn" href={l(`/church/members/${r.membership.user_id}`)}>{es?'Abrir registro':'Open record'} →</Link></div><div className="row" style={{gap:7,flexWrap:'wrap',marginTop:12}}><span className="pill">{m.holy_ghost_received===true?'✓ ':''}{es?'Espíritu Santo':'Holy Ghost'}{m.holy_ghost_date?` • ${fmt(m.holy_ghost_date)}`:''}</span><span className="pill">{m.baptized===true?'✓ ':''}{es?'Bautismo':'Baptism'}{m.baptism_date?` • ${fmt(m.baptism_date)}`:''}</span><span className="pill">First Steps: {(m.first_steps_status??'not started').replaceAll('_',' ')}</span><span className="pill">Soul Winning: {(m.soul_winning_status??'not started').replaceAll('_',' ')}</span><span className="pill">Timothys: {(m.timothys_status??'not started').replaceAll('_',' ')}</span></div><form action={updateMemberRelationship} className="row" style={{gap:8,alignItems:'end',marginTop:12,flexWrap:'wrap'}}><input type="hidden" name="church_id" value={actor.church_id}/><input type="hidden" name="user_id" value={r.membership.user_id}/><input type="hidden" name="lang" value={lang}/><label className="field" style={{minWidth:190}}><span>{es?'Cambiar relación':'Change relationship'}</span><select name="relationship_status" defaultValue={rel}><option value="guest">{es?'Invitado':'Guest'}</option><option value="attendee">{es?'Asistente regular':'Regular attendee'}</option><option value="member">{es?'Miembro':'Member'}</option><option value="inactive">{es?'Inactivo':'Inactive'}</option></select></label><button className="ghost">{es?'Guardar relación':'Save relationship'}</button></form></article>})}{!rows.length&&<div className="card" style={{padding:22,textAlign:'center'}}><UserRound size={28}/><h3>{es?'No se encontraron personas.':'No people matched.'}</h3><p className="muted">{es?'Cambia la búsqueda o el filtro.':'Change the search or relationship filter.'}</p></div>}</section>
  </main>
}
