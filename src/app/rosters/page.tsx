import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BriefcaseBusiness,ChevronRight,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

type ChurchRow={name:string|null}
type MembershipRow={church_id:string;role:string;churches:ChurchRow|ChurchRow[]|null}
type GroupRow={id:string;name:string;leader_id:string|null;group_type:string;active:boolean}
type GroupMembershipRow={group_id:string;role:string}
type MinistryRow={id:string;name:string;active:boolean}
type TeamMembershipRow={ministry_id:string;is_leader:boolean;member_status:string}
type Query={lang?:string}

const broadRoles=new Set(['ministry_leader','minister','pastor','church_admin'])

export default async function RostersPage({searchParams}:{searchParams:Promise<Query>}){
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
  const [teamPermission,groupPermission]=await Promise.all([
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_teams'}),
    supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_groups'})
  ])
  const broadAccess=broadRoles.has(membership.role)||Boolean(teamPermission.data)||Boolean(groupPermission.data)

  const [{data:groupsData},{data:groupMembershipsData},{data:ministriesData},{data:teamMembershipsData}]=await Promise.all([
    supabase.from('groups').select('id,name,leader_id,group_type,active').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('group_memberships').select('group_id,role').eq('user_id',userId),
    supabase.from('ministries').select('id,name,active').eq('church_id',churchId).eq('active',true).order('name'),
    supabase.from('ministry_team_members').select('ministry_id,is_leader,member_status').eq('church_id',churchId).eq('user_id',userId)
  ])
  const groups=(groupsData??[]) as GroupRow[]
  const groupMemberships=(groupMembershipsData??[]) as GroupMembershipRow[]
  const ministries=(ministriesData??[]) as MinistryRow[]
  const teamMemberships=(teamMembershipsData??[]) as TeamMembershipRow[]
  const groupRoleById=new Map(groupMemberships.map(row=>[row.group_id,row.role]))
  const leaderMinistryIds=new Set(teamMemberships.filter(row=>row.is_leader&&row.member_status==='active').map(row=>row.ministry_id))
  const manageableGroups=groups.filter(group=>broadAccess||group.leader_id===userId||groupRoleById.get(group.id)==='leader')
  const manageableMinistries=ministries.filter(ministry=>broadAccess||leaderMinistryIds.has(ministry.id))
  if(!broadAccess&&!manageableGroups.length&&!manageableMinistries.length)redirect(l('/'))
  const church=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Rosters','Listas')}</div></div><div className="row"><Link className="ghost" href="/rosters?lang=en">English</Link><Link className="ghost" href="/rosters?lang=es">Español</Link><Link className="ghost" href={l('/calendar/manage')}>{t('Schedules','Horarios')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="hero card"><div><div className="pill">{t('LEADER CONTROL TOOLS','HERRAMIENTAS DE LIDERAZGO')}</div><h1>{t('Rosters without the paperwork.','Listas sin el papeleo.')}</h1><p className="muted">{t('Choose the team or group you are responsible for. The roster opens ready to use.','Escoge el equipo o grupo que diriges. La lista se abre lista para usar.')}</p></div><div className="hero-stat"><strong>{manageableGroups.length+manageableMinistries.length}</strong><span>{t('rosters you can manage','listas que puedes administrar')}</span></div></section>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:18}}>
      <section className="card" style={{padding:18}}><div className="pill"><BriefcaseBusiness size={11}/> {t('MINISTRY TEAMS','EQUIPOS DE MINISTERIO')}</div><h2 style={{margin:'8px 0 5px'}}>{t('Team rosters','Listas de equipos')}</h2><p className="small muted">{t('Roles, team leaders and active/on-leave/inactive status are managed together.','Funciones, líderes y estado activo/ausente/inactivo se administran juntos.')}</p><div style={{display:'grid',gap:8,marginTop:14}}>{manageableMinistries.map(ministry=><Link href={l(`/teams/manage#team-${ministry.id}`)} className="ghost" key={ministry.id} style={{justifyContent:'space-between'}}><span>{ministry.name}</span><ChevronRight size={14}/></Link>)}{!manageableMinistries.length&&<p className="muted">{t('No ministry rosters assigned to you.','No tienes listas de ministerio asignadas.')}</p>}</div>{manageableMinistries.length>0&&<Link className="btn" href={l('/teams/manage')} style={{marginTop:14}}>{t('Open all team rosters','Abrir todas las listas de equipos')}</Link>}</section>

      <section className="card" style={{padding:18}}><div className="pill"><Users size={11}/> {t('GROUPS','GRUPOS')}</div><h2 style={{margin:'8px 0 5px'}}>{t('Friendship & ministry group roll sheets','Listas de grupos')}</h2><p className="small muted">{t('See roles, shared contact info, member status and recent attendance in one sheet.','Mira funciones, contacto compartido, estado y asistencia reciente en una sola lista.')}</p><div style={{display:'grid',gap:8,marginTop:14}}>{manageableGroups.map(group=><Link href={l(`/groups/${group.id}/roster`)} className="ghost" key={group.id} style={{justifyContent:'space-between'}}><span>{group.name}<span className="small muted"> • {group.group_type.replaceAll('_',' ')}</span></span><ChevronRight size={14}/></Link>)}{!manageableGroups.length&&<p className="muted">{t('No group rosters assigned to you.','No tienes listas de grupos asignadas.')}</p>}</div></section>
    </div>
  </main>
}
