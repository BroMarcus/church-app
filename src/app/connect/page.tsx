import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {createConnectionLink,setConnectionLinkActive} from './actions'
import {ConnectionLinkCard} from './connection-link-card'
import './connect.css'

const sourceLabel=(type:string,es:boolean)=>{
  const labels:Record<string,[string,string]>={member_invite:['Personal invitation','Invitación personal'],friendship_group:['Friendship Group','Grupo de Amistad'],church_service:['Church service','Servicio de la iglesia'],front_door:['Front door / welcome','Entrada / bienvenida'],outreach:['Outreach','Evangelismo'],event:['Event','Evento'],campaign:['Campaign','Campaña']}
  const row=labels[type]
  return row?(es?row[1]:row[0]):type.replaceAll('_',' ')
}

export default async function ConnectSharePage({searchParams}:{searchParams:Promise<{lang?:string;created?:string;saved?:string;error?:string}>}){
  const query=await searchParams
  const es=query.lang==='es'
  const lang:'en'|'es'=es?'es':'en'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  const [{data:groupMemberships},{data:links}]=await Promise.all([
    supabase.from('group_memberships').select('group_id,role').eq('user_id',userId),
    supabase.from('outreach_source_links').select('id,token,source_type,source_label,source_group_id,source_event_id,active,created_at').eq('church_id',churchId).order('created_at',{ascending:false})
  ])

  const groupIds=(groupMemberships??[]).map((row:any)=>row.group_id)
  let groups:any[]=[]
  if(groupIds.length){const r=await supabase.from('groups').select('id,name,meeting_day,meeting_time,location_label,language_code,active').in('id',groupIds).eq('active',true);groups=r.data??[]}
  const groupMap=new Map(groups.map((g:any)=>[g.id,g]))
  const advanced=['pastor','church_admin'].includes(String(membership.role??''))
  let events:any[]=[]
  if(advanced){const r=await supabase.from('events').select('id,title,starts_at').eq('church_id',churchId).gte('starts_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('starts_at').limit(20);events=r.data??[]}

  return <main className="connect-shell">
    <div className="connect-top"><div><Link href="/" className="connect-brand">Kingdom <span>Network</span></Link><div className="connect-muted">{church?.name??(es?'Su iglesia':'Your church')} • {es?'Compartir y conectar':'Share & Connect'}</div></div><div className="connect-actions"><Link className="connect-btn secondary" href={es?'/connect?lang=en':'/connect?lang=es'}>{es?'English':'Español'}</Link><Link className="connect-btn secondary" href="/">← {es?'Inicio':'Home'}</Link></div></div>

    <section className="connect-card connect-hero"><div className="connect-pill">{es?'COMPARTIR SIN COMPLICACIONES':'SIMPLE SHARING'}</div><h1>{es?'Invite a alguien a conectarse.':'Invite someone to connect.'}</h1><p className="connect-muted">{es?'Comparta un enlace sencillo. La persona puede dejar su información sin crear una cuenta. El enlace registra de dónde llegó, pero no le da membresía, acceso a un grupo ni permisos especiales.':'Share one simple link. The person can leave their information without creating an account. The link records where they connected, but it does not grant church membership, group access, or special permissions.'}</p></section>

    {query.created&&<div className="connect-notice success">{es?'Enlace listo. Puede copiarlo o compartirlo abajo.':'Link ready. You can copy or share it below.'}</div>}
    {query.saved&&<div className="connect-notice success">{es?'Enlace actualizado.':'Link updated.'}</div>}
    {query.error&&<div className="connect-notice error">{query.error}</div>}

    <section className="connect-card"><h2>{es?'Mi enlace de invitación':'My invitation link'}</h2><p className="connect-muted">{es?'Úselo para una invitación personal a la iglesia. Compartirlo no le da acceso a la información privada de la persona que responde.':'Use this for a personal invitation to church. Sharing it does not give you access to the private information of the person who responds.'}</p><form action={createConnectionLink} className="connect-actions"><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="source_type" value="member_invite"/><input type="hidden" name="source_label" value={es?'Invitación personal':'Personal invitation'}/><input type="hidden" name="lang" value={lang}/><button className="connect-btn">{es?'Preparar mi enlace':'Prepare my link'}</button></form></section>

    {groups.length>0&&<section className="connect-card"><h2>{es?'Mis Grupos de Amistad':'My Friendship Groups'}</h2><p className="connect-muted">{es?'Puede compartir un enlace para un grupo al que ya pertenece. El enlace identifica el grupo, pero la persona todavía necesita el proceso normal para unirse al roster.':'You can share a link for a group you already belong to. The link identifies the group, but the person still goes through the normal roster-approval process.'}</p><div className="connect-grid">{groups.map((g:any)=><form key={g.id} action={createConnectionLink} className="connect-card" style={{margin:0}}><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="source_type" value="friendship_group"/><input type="hidden" name="source_group_id" value={g.id}/><input type="hidden" name="source_label" value={g.name}/><input type="hidden" name="lang" value={lang}/><strong>{g.name}</strong><div className="connect-muted">{[g.meeting_day,g.location_label].filter(Boolean).join(' • ')}</div><button className="connect-btn" style={{marginTop:12}}>{es?'Preparar enlace del grupo':'Prepare group link'}</button></form>)}</div></section>}

    {advanced&&<section className="connect-card"><details className="connect-details"><summary>{es?'Herramientas de conexión para líderes':'Leader connection tools'}</summary><form action={createConnectionLink} className="connect-form"><input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="lang" value={lang}/><label><span>{es?'Tipo de conexión':'Connection type'}</span><select name="source_type" defaultValue="church_service"><option value="church_service">{es?'Servicio de la iglesia':'Church service'}</option><option value="front_door">{es?'Entrada / bienvenida':'Front door / welcome'}</option><option value="outreach">{es?'Evangelismo':'Outreach'}</option><option value="event">{es?'Evento':'Event'}</option><option value="campaign">{es?'Campaña':'Campaign'}</option></select></label><label><span>{es?'Etiqueta':'Label'}</span><input name="source_label" placeholder={es?'Ej. Domingo 10 AM':'e.g. Sunday 10 AM'}/></label>{events.length>0&&<label><span>{es?'Evento relacionado (opcional)':'Related event (optional)'}</span><select name="source_event_id" defaultValue=""><option value="">{es?'Ninguno':'None'}</option>{events.map((e:any)=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>}<button>{es?'Crear enlace de conexión':'Create connection link'}</button></form></details></section>}

    <section className="connect-card"><h2>{es?'Enlaces listos para compartir':'Links ready to share'}</h2>{(links??[]).length===0?<p className="connect-muted">{es?'Todavía no ha preparado ningún enlace.':'You have not prepared a link yet.'}</p>:(links??[]).map((link:any)=>{const g=link.source_group_id?groupMap.get(link.source_group_id):null;const label=link.source_label||sourceLabel(link.source_type,es);const meta=[sourceLabel(link.source_type,es),g?.name].filter(Boolean).join(' • ');return <div key={link.id}><ConnectionLinkCard token={link.token} label={label} meta={meta} active={link.active} lang={lang}/><form action={setConnectionLinkActive} className="connect-actions" style={{marginBottom:10}}><input type="hidden" name="id" value={link.id}/><input type="hidden" name="active" value={link.active?'false':'true'}/><input type="hidden" name="lang" value={lang}/><button className="connect-btn secondary">{link.active?(es?'Pausar enlace':'Pause link'):(es?'Reactivar enlace':'Reactivate link')}</button></form></div>})}</section>

    <div className="connect-safe">{es?'Privacidad: estos enlaces sirven para conexión y seguimiento. No muestran direcciones privadas de hogares, notas pastorales ni datos de otros miembros. Una invitación o referencia tampoco concede membresía, liderazgo ni acceso a un Grupo de Amistad.':'Privacy: these links are for connection and follow-up. They do not reveal private home addresses, pastoral notes, or other members’ data. A referral also does not grant church membership, leadership, or Friendship Group access.'}</div>
  </main>
}
