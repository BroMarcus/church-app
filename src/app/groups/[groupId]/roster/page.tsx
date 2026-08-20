import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarCheck2,Mail,UserPlus,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addRosterMember,updateRosterMember } from './actions'
import '../../groups.css'

type ChurchRow={name:string|null}
type ChurchMembershipContext={church_id:string;role:string;status:string;churches:ChurchRow|ChurchRow[]|null}
type GroupRow={id:string;church_id:string;name:string;leader_id:string|null;active:boolean}
type GroupMembershipRow={group_id:string;user_id:string;role:string;joined_at:string}
type ProfileRow={id:string;display_name:string|null;first_name:string|null;last_name:string|null;contact_email:string|null;show_contact_email:boolean}
type MemberMetaRow={user_id:string;status:string;member_title:string|null}
type MilestoneRow={user_id:string;baptized:boolean|null;holy_ghost_received:boolean|null}
type ReportRow={id:string;meeting_date:string}
type AttendanceRow={group_report_id:string;user_id:string;attendance_status:string;present:boolean}
type Query={lang?:string;member_added?:string;member_saved?:string;error?:string}

const roleLabel=(role:string,es:boolean)=>role==='leader'?(es?'Líder':'Leader'):role==='assistant'?(es?'Asistente':'Assistant'):(es?'Miembro':'Member')

export default async function GroupRosterPage({params,searchParams}:{params:Promise<{groupId:string}>;searchParams:Promise<Query>}){
  const [{groupId},query]=await Promise.all([params,searchParams])
  const lang=query.lang==='es'?'es':'en',es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))

  const {data:churchMembershipData}=await supabase.from('church_memberships').select('church_id,role,status,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  const churchMembership=churchMembershipData as ChurchMembershipContext|null
  if(!churchMembership?.church_id)redirect('/')
  const {data:groupData}=await supabase.from('groups').select('id,church_id,name,leader_id,active').eq('id',groupId).eq('church_id',churchMembership.church_id).maybeSingle()
  const group=groupData as GroupRow|null
  if(!group?.active)redirect(l('/groups'))
  const {data:myGroupMembershipData}=await supabase.from('group_memberships').select('group_id,user_id,role,joined_at').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  const myGroupMembership=myGroupMembershipData as GroupMembershipRow|null
  const canManage=['pastor','church_admin'].includes(churchMembership.role)||group.leader_id===userId||myGroupMembership?.role==='leader'
  if(!canManage)redirect(l(`/groups/${groupId}`))

  const [{data:rosterData},{data:reportsData},{data:churchMembersData}]=await Promise.all([
    supabase.from('group_memberships').select('group_id,user_id,role,joined_at').eq('group_id',groupId).order('joined_at'),
    supabase.from('group_reports').select('id,meeting_date').eq('group_id',groupId).order('meeting_date',{ascending:false}).limit(4),
    supabase.from('church_memberships').select('user_id,status,member_title').eq('church_id',churchMembership.church_id).eq('status','active')
  ])
  const roster=(rosterData??[]) as GroupMembershipRow[]
  const reports=(reportsData??[]) as ReportRow[]
  const activeChurchMembers=(churchMembersData??[]) as MemberMetaRow[]
  const rosterIds=roster.map(member=>member.user_id)
  const reportIds=reports.map(report=>report.id)

  let profiles:ProfileRow[]=[],milestones:MilestoneRow[]=[],attendance:AttendanceRow[]=[]
  const profileIds=Array.from(new Set([...rosterIds,...activeChurchMembers.map(member=>member.user_id)]))
  if(profileIds.length){
    const [profileResult,milestoneResult]=await Promise.all([
      supabase.from('profiles').select('id,display_name,first_name,last_name,contact_email,show_contact_email').in('id',profileIds),
      rosterIds.length?supabase.from('member_milestones').select('user_id,baptized,holy_ghost_received').eq('church_id',churchMembership.church_id).in('user_id',rosterIds):Promise.resolve({data:[]})
    ])
    profiles=(profileResult.data??[]) as ProfileRow[]
    milestones=(milestoneResult.data??[]) as MilestoneRow[]
  }
  if(reportIds.length&&rosterIds.length){
    const {data}=await supabase.from('group_report_attendance').select('group_report_id,user_id,attendance_status,present').in('group_report_id',reportIds).in('user_id',rosterIds)
    attendance=(data??[]) as AttendanceRow[]
  }

  const profileById=new Map(profiles.map(profile=>[profile.id,profile]))
  const memberMetaById=new Map(activeChurchMembers.map(member=>[member.user_id,member]))
  const milestoneById=new Map(milestones.map(milestone=>[milestone.user_id,milestone]))
  const nameOf=(id:string)=>{const profile=profileById.get(id);return profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia')}
  const rosterSet=new Set(rosterIds)
  const available=activeChurchMembers.filter(member=>!rosterSet.has(member.user_id)).map(member=>({id:member.user_id,name:nameOf(member.user_id)})).sort((a,b)=>a.name.localeCompare(b.name))
  const church=Array.isArray(churchMembership.churches)?churchMembership.churches[0]:churchMembership.churches
  const attendanceByMember=new Map<string,Map<string,AttendanceRow>>()
  for(const row of attendance){const byReport=attendanceByMember.get(row.user_id)??new Map<string,AttendanceRow>();byReport.set(row.group_report_id,row);attendanceByMember.set(row.user_id,byReport)}
  const presentTotal=attendance.filter(row=>row.present).length
  const possibleTotal=roster.length*reports.length

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {group.name} • {t('Roster','Lista')}</div></div><div className="row"><Link className="ghost" href={`/groups/${groupId}/roster?lang=en`}>English</Link><Link className="ghost" href={`/groups/${groupId}/roster?lang=es`}>Español</Link><Link className="ghost" href={l(`/calendar/manage`)}>{t('Schedules','Horarios')}</Link><Link className="ghost" href={l(`/groups/${groupId}`)}>← {t('Group','Grupo')}</Link></div></header>

    <section className="group-detail-hero card"><div><div className="pill">{t('LEADER ROLL SHEET','LISTA DE LIDERAZGO')}</div><h1>{group.name}</h1><p className="muted">{t('One clean roster for roles, shared contact information, member status and recent attendance.','Una lista clara para funciones, contacto compartido, estado del miembro y asistencia reciente.')}</p></div><div className="hero-stat"><strong>{roster.length}</strong><span>{t('people on roster','personas en la lista')}</span></div></section>

    {query.member_added&&<div className="notice success">{t('Member added to the roster.','Miembro agregado a la lista.')}</div>}{query.member_saved&&<div className="notice success">{t('Roster change saved.','Cambio de lista guardado.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="card group-section" style={{marginBottom:16}}><div className="section-heading"><div><div className="pill">{t('ROLL SHEET','LISTA')}</div><h2>{t('Who is connected right now','Quién está conectado ahora')}</h2></div><div className="small muted">{reports.length&&possibleTotal?`${Math.round(presentTotal/possibleTotal*100)}% ${t('recent attendance','asistencia reciente')}`:t('Attendance builds after reports','La asistencia aparece después de reportes')}</div></div>
      <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:760}}><thead><tr style={{textAlign:'left'}}><th style={{padding:'10px 8px'}}>{t('Person','Persona')}</th><th style={{padding:'10px 8px'}}>{t('Role','Función')}</th><th style={{padding:'10px 8px'}}>{t('Contact','Contacto')}</th><th style={{padding:'10px 8px'}}>{t('Status','Estado')}</th>{reports.map(report=><th key={report.id} style={{padding:'10px 8px',whiteSpace:'nowrap'}}>{new Date(`${report.meeting_date}T12:00:00`).toLocaleDateString(es?'es-US':'en-US',{month:'short',day:'numeric'})}</th>)}<th style={{padding:'10px 8px'}}>{t('Edit','Editar')}</th></tr></thead><tbody>{roster.map(member=>{const profile=profileById.get(member.user_id),meta=memberMetaById.get(member.user_id),milestone=milestoneById.get(member.user_id),memberAttendance=attendanceByMember.get(member.user_id);const sharedEmail=profile?.show_contact_email&&profile.contact_email?profile.contact_email:null;return <tr key={member.user_id} style={{borderTop:'1px solid var(--line)',verticalAlign:'top'}}><td style={{padding:'12px 8px'}}><Link href={l(`/directory/${member.user_id}`)} style={{textDecoration:'none'}}><strong>{nameOf(member.user_id)}</strong></Link><div className="small muted">{meta?.member_title||t('Church member','Miembro')}</div><div className="small muted">{t('Joined','Entró')} {new Date(member.joined_at).toLocaleDateString(es?'es-US':'en-US')}</div></td><td style={{padding:'12px 8px'}}><span className="role-chip">{roleLabel(member.role,es)}</span></td><td style={{padding:'12px 8px'}}>{sharedEmail?<a href={`mailto:${sharedEmail}`} className="small"><Mail size={12}/> {sharedEmail}</a>:<span className="small muted">{t('Not shared','No compartido')}</span>}</td><td style={{padding:'12px 8px'}}><div className="small"><strong>{meta?.status==='active'?t('Active','Activo'):t('Not active','No activo')}</strong></div><div className="small muted">{milestone?.baptized?t('Baptized','Bautizado'):t('Baptism not recorded','Bautismo no registrado')} • {milestone?.holy_ghost_received?t('Holy Ghost received','Recibió Espíritu Santo'):t('Holy Ghost not recorded','Espíritu Santo no registrado')}</div></td>{reports.map(report=>{const row=memberAttendance?.get(report.id);const label=!row?t('—','—'):row.attendance_status==='late'?t('Late','Tarde'):row.present?t('Here','Presente'):t('Missed','Faltó');return <td key={report.id} style={{padding:'12px 8px'}}><span className={`response-chip ${row?.present?'confirmed':row?'declined':''}`}>{label}</span></td>})}<td style={{padding:'12px 8px'}}><details><summary className="ghost" style={{cursor:'pointer',display:'inline-flex'}}>{t('Manage','Administrar')}</summary><form action={updateRosterMember} className="card" style={{padding:12,marginTop:8,minWidth:280}}><input type="hidden" name="group_id" value={groupId}/><input type="hidden" name="user_id" value={member.user_id}/><input type="hidden" name="lang" value={lang}/><label className="field"><span>{t('Group role','Función en grupo')}</span><select name="group_role" defaultValue={member.role}><option value="member">{t('Member','Miembro')}</option><option value="assistant">{t('Assistant','Asistente')}</option><option value="leader">{t('Leader / co-leader','Líder / co-líder')}</option></select></label><label className="field"><span>{t('Member title','Título del miembro')}</span><input name="member_title" maxLength={80} defaultValue={meta?.member_title??''} placeholder={t('Optional title','Título opcional')}/></label>{!milestone?.baptized&&<label className="row small"><input type="checkbox" name="mark_baptized"/> {t('Mark baptism recorded','Marcar bautismo registrado')}</label>}{!milestone?.holy_ghost_received&&<label className="row small"><input type="checkbox" name="mark_holy_ghost"/> {t('Mark Holy Ghost received','Marcar que recibió Espíritu Santo')}</label>}<button className="btn">{t('Save','Guardar')}</button></form></details></td></tr>})}</tbody></table></div>{!roster.length&&<p className="muted">{t('No members are on this roster yet.','Todavía no hay miembros en esta lista.')}</p>}</section>

    <section className="card group-section"><div className="section-heading"><div><div className="pill"><UserPlus size={11}/> {t('ADD TO ROSTER','AGREGAR A LA LISTA')}</div><h2>{t('Add an active church member','Agregar miembro activo')}</h2></div><Users size={22}/></div><p className="small muted">{t('Friendship Group rules still prevent one person from being placed in two active Friendship Groups.','Las reglas todavía impiden que una persona esté en dos Grupos de Amistad activos.')}</p><form action={addRosterMember} className="row" style={{alignItems:'flex-end',flexWrap:'wrap'}}><input type="hidden" name="group_id" value={groupId}/><input type="hidden" name="lang" value={lang}/><label className="field" style={{flex:'2 1 240px',margin:0}}><span>{t('Person','Persona')}</span><select name="user_id" required defaultValue=""><option value="" disabled>{t('Choose church member','Escoger miembro')}</option>{available.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="field" style={{flex:'1 1 180px',margin:0}}><span>{t('Group role','Función en grupo')}</span><select name="role" defaultValue="member"><option value="member">{t('Member','Miembro')}</option><option value="assistant">{t('Assistant','Asistente')}</option><option value="leader">{t('Leader / co-leader','Líder / co-líder')}</option></select></label><button className="btn" disabled={!available.length}><UserPlus size={14}/>{available.length?t('Add person','Agregar persona'):t('Everyone is already listed','Todos ya están en la lista')}</button></form></section>
  </main>
}
