import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,ChevronRight,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addTeamMember,createTeam,reactivateTeamMember,updateTeam,updateTeamMember } from './actions'
import '../teams.css'

type ChurchRow={name:string|null}
type MembershipRow={church_id:string;role:string;churches:ChurchRow|ChurchRow[]|null}
type MinistryRow={id:string;name:string;description:string|null;openings:number|null;active:boolean}
type TeamMemberRow={id:string;church_id:string;ministry_id:string;user_id:string;role_label:string;is_leader:boolean;member_status:string;joined_at:string}
type ChurchMemberRow={user_id:string;role:string}
type ProfileRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null;contact_email:string|null;show_contact_email:boolean}

type Query={lang?:string;team_created?:string;team_saved?:string;member_added?:string;member_saved?:string;error?:string}

const managerRoles=new Set(['ministry_leader','minister','pastor','church_admin'])
const ministryAdminRoles=new Set(['ministry_leader','pastor','church_admin'])

export default async function TeamManagementPage({searchParams}:{searchParams:Promise<Query>}){
  const query=await searchParams
  const lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))

  const {data:membershipData}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  const membership=membershipData as MembershipRow|null
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id

  const [teamPermission,ministryPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_ministries'})
  ])
  const canManageTeams=managerRoles.has(membership.role)||Boolean(teamPermission.data)
  const canManageMinistries=ministryAdminRoles.has(membership.role)||Boolean(ministryPermission.data)
  if(!canManageTeams&&!canManageMinistries)redirect(l('/teams'))

  const [{data:ministriesData},{data:teamMembersData},{data:churchMembersData}]=await Promise.all([
    supabase.from('ministries').select('id,name,description,openings,active').eq('church_id',churchId).order('active',{ascending:false}).order('name'),
    supabase.from('ministry_team_members').select('id,church_id,ministry_id,user_id,role_label,is_leader,member_status,joined_at').eq('church_id',churchId).order('member_status').order('role_label'),
    supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active')
  ])

  const ministries=(ministriesData??[]) as MinistryRow[]
  const teamMembers=(teamMembersData??[]) as TeamMemberRow[]
  const churchMembers=(churchMembersData??[]) as ChurchMemberRow[]
  const profileIds=Array.from(new Set([...churchMembers.map(member=>member.user_id),...teamMembers.map(member=>member.user_id)]))
  let profiles:ProfileRow[]=[]
  if(profileIds.length){
    const {data}=await supabase.from('profiles').select('id,display_name,first_name,last_name,contact_email,show_contact_email').in('id',profileIds)
    profiles=(data??[]) as ProfileRow[]
  }
  const profilesById=new Map(profiles.map(profile=>[profile.id,profile]))
  const nameOf=(id:string)=>{const profile=profilesById.get(id);return profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia')}
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const totalActive=teamMembers.filter(member=>member.member_status==='active').length

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Team Control','Control de Equipos')}</div></div><div className="row"><Link className="ghost" href="/teams/manage?lang=en">English</Link><Link className="ghost" href="/teams/manage?lang=es">Español</Link><Link className="ghost" href={l('/calendar/manage')}><CalendarDays size={14}/>{t('Schedules','Horarios')}</Link><Link className="ghost" href={l('/teams')}>← {t('Teams','Equipos')}</Link></div></header>

    <section className="teams-hero card"><div><div className="pill">{t('LEADER CONTROL TOOLS','HERRAMIENTAS DE LIDERAZGO')}</div><h1>{t('Teams, roles and people.','Equipos, funciones y personas.')}</h1><p className="muted">{t('Keep each ministry roster clear: who belongs, what they do and who leads.','Mantén clara cada lista de ministerio: quién pertenece, qué hace y quién dirige.')}</p></div><div className="hero-stat"><strong>{totalActive}</strong><span>{t('active team members','miembros activos')}</span></div></section>

    {query.team_created&&<div className="notice success">{t('Team created.','Equipo creado.')}</div>}
    {query.team_saved&&<div className="notice success">{t('Team changes saved.','Cambios del equipo guardados.')}</div>}
    {query.member_added&&<div className="notice success">{t('Team member added.','Miembro agregado al equipo.')}</div>}
    {query.member_saved&&<div className="notice success">{t('Roster change saved.','Cambio de lista guardado.')}</div>}
    {query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',alignItems:'center'}}><div><div className="pill"><CalendarDays size={11}/> {t('NEXT: SHARED SCHEDULING','SIGUIENTE: HORARIOS COMPARTIDOS')}</div><h2 style={{margin:'8px 0 4px'}}>{t('Build the schedule from the roster.','Crea el horario desde la lista.')}</h2><p className="small muted" style={{margin:0}}>{t('Once people and roles are right, schedule preaching, worship, youth, groups or any ministry from one place.','Cuando las personas y funciones estén correctas, programa predicación, alabanza, jóvenes, grupos o cualquier ministerio desde un solo lugar.')}</p></div><Link className="btn" href={l('/calendar/manage')}>{t('Open schedules','Abrir horarios')} <ChevronRight size={14}/></Link></div></section>

    {canManageMinistries&&<details className="card" style={{padding:18,marginBottom:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('+ Create a team / ministry','+ Crear equipo / ministerio')}</summary><form action={createTeam} style={{marginTop:14}}><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t('Team name','Nombre del equipo')}</span><input name="name" required maxLength={120} placeholder={t('Praise & Worship','Alabanza y Adoración')}/></label><label className="field"><span>{t('Simple description','Descripción sencilla')}</span><textarea name="description" rows={3} maxLength={1000} placeholder={t('What this team does and who it serves.','Qué hace este equipo y a quién sirve.')}/></label><label className="field"><span>{t('Open spots (optional)','Lugares disponibles (opcional)')}</span><input type="number" name="openings" min="0" max="999"/></label><button className="btn">{t('Create team','Crear equipo')}</button></form></details>}

    <section style={{display:'grid',gap:18}}>{ministries.map(ministry=>{
      const roster=teamMembers.filter(member=>member.ministry_id===ministry.id)
      const activeRoster=roster.filter(member=>member.member_status==='active')
      const rosterIds=new Set(roster.map(member=>member.user_id))
      const available=churchMembers.filter(member=>!rosterIds.has(member.user_id)||roster.some(teamMember=>teamMember.user_id===member.user_id&&teamMember.member_status!=='active')).sort((a,b)=>nameOf(a.user_id).localeCompare(nameOf(b.user_id)))
      return <article className="card" id={`team-${ministry.id}`} key={ministry.id} style={{padding:18,border:!ministry.active?'1px solid rgba(148,163,184,.28)':undefined}}>
        <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start',gap:14}}><div><div className="pill"><Users size={11}/> {ministry.active?t('ACTIVE TEAM','EQUIPO ACTIVO'):t('INACTIVE TEAM','EQUIPO INACTIVO')}</div><h2 style={{margin:'8px 0 5px'}}>{ministry.name}</h2><p className="muted" style={{margin:0}}>{ministry.description||t('No description yet.','Todavía no hay descripción.')}</p></div><div className="hero-stat"><strong>{activeRoster.length}</strong><span>{t('active','activos')}</span></div></div>

        <div className="row" style={{marginTop:14,flexWrap:'wrap'}}><Link className="ghost" href={l(`/calendar/manage?ministry=${ministry.id}`)}><CalendarDays size={14}/>{t('Schedule this team','Programar este equipo')}</Link>{canManageMinistries&&<details><summary className="ghost" style={{cursor:'pointer'}}>{t('Edit team','Editar equipo')}</summary><form action={updateTeam} className="card" style={{padding:14,marginTop:8,minWidth:280}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="team_id" value={ministry.id}/><label className="field"><span>{t('Name','Nombre')}</span><input name="name" required maxLength={120} defaultValue={ministry.name}/></label><label className="field"><span>{t('Description','Descripción')}</span><textarea name="description" rows={3} maxLength={1000} defaultValue={ministry.description??''}/></label><label className="field"><span>{t('Open spots','Lugares disponibles')}</span><input type="number" name="openings" min="0" max="999" defaultValue={ministry.openings??''}/></label><label className="row small"><input type="checkbox" name="active" defaultChecked={ministry.active}/> {t('Team is active','El equipo está activo')}</label><button className="btn">{t('Save team','Guardar equipo')}</button></form></details>}</div>

        <div style={{marginTop:18}}><div className="pill">{t('ROSTER','LISTA')}</div>{roster.length?<div style={{display:'grid',gap:10,marginTop:10}}>{roster.map(member=>{const profile=profilesById.get(member.user_id);const contact=profile?.show_contact_email&&profile.contact_email?profile.contact_email:t('Contact hidden by member','Contacto oculto por el miembro');return <form action={member.member_status==='inactive'?reactivateTeamMember:updateTeamMember} key={member.id} className="assignment-card" style={{padding:12,border:'1px solid var(--line)',borderRadius:12}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="team_member_id" value={member.id}/><input type="hidden" name="ministry_id" value={ministry.id}/><div className="row" style={{justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{minWidth:180}}><strong>{nameOf(member.user_id)}</strong><div className="small muted">{contact}</div></div>{member.member_status==='inactive'?<><span className="response-chip">{t('inactive','inactivo')}</span><button className="ghost">{t('Reactivate','Reactivar')}</button></>:<><label className="field" style={{margin:0,minWidth:170}}><span>{t('Role','Función')}</span><input name="role_label" required maxLength={80} defaultValue={member.role_label}/></label><label className="field" style={{margin:0,minWidth:130}}><span>{t('Status','Estado')}</span><select name="member_status" defaultValue={member.member_status}><option value="active">{t('Active','Activo')}</option><option value="on_leave">{t('On leave','Ausente')}</option><option value="inactive">{t('Inactive','Inactivo')}</option></select></label><label className="row small" style={{whiteSpace:'nowrap'}}><input type="checkbox" name="is_leader" defaultChecked={member.is_leader}/><ShieldCheck size={13}/>{t('Team leader','Líder del equipo')}</label><button className="ghost">{t('Save','Guardar')}</button></>}</div></form>})}</div>:<p className="muted">{t('No one has been added to this team yet.','Todavía no se ha agregado a nadie a este equipo.')}</p>}</div>

        {canManageTeams&&ministry.active&&<details style={{marginTop:14}}><summary className="ghost" style={{cursor:'pointer',display:'inline-flex'}}>{t('+ Add person to roster','+ Agregar persona a la lista')}</summary><form action={addTeamMember} className="card" style={{padding:14,marginTop:8}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="ministry_id" value={ministry.id}/><div className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><label className="field" style={{flex:'2 1 220px',margin:0}}><span>{t('Church member','Miembro de la iglesia')}</span><select name="user_id" required defaultValue=""><option value="" disabled>{t('Choose person','Escoger persona')}</option>{available.map(member=><option key={member.user_id} value={member.user_id}>{nameOf(member.user_id)}</option>)}</select></label><label className="field" style={{flex:'1 1 180px',margin:0}}><span>{t('Role on this team','Función en este equipo')}</span><input name="role_label" required maxLength={80} placeholder={t('Singer, drummer, usher…','Cantante, baterista, ujier…')}/></label><label className="row small"><input type="checkbox" name="is_leader"/> {t('Team leader','Líder')}</label><button className="btn" disabled={!available.length}>{available.length?t('Add to team','Agregar al equipo'):t('Everyone is already listed','Todos ya están en la lista')}</button></div></form></details>}
      </article>
    })}{!ministries.length&&<div className="card" style={{padding:18}}><h3>{t('No teams yet.','Todavía no hay equipos.')}</h3><p className="muted">{t('Create the first ministry team above.','Crea el primer equipo de ministerio arriba.')}</p></div>}</section>
  </main>
}
