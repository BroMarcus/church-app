import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,Compass,Link2,Mail,Phone,ShieldCheck,UserCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { OutreachHistory } from '../outreach-history'
import { createOutreachMemberInvite } from './actions'
import { OutreachInviteLink } from './invite-link'
import '../outreach.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'
const stageNames:Record<string,[string,string]>={
  new_contact:['New contact','Nuevo contacto'],invited:['Invited','Invitado'],guest:['Guest','Visita'],bible_study:['Bible study','Estudio bíblico'],regular_attendee:['Regular attendee','Asistente regular'],baptized:['Baptized','Bautizado'],holy_ghost:['Holy Ghost','Espíritu Santo'],first_steps:['First Steps','Primeros Pasos'],connected:['Connected','Conectado'],serving:['Serving','Sirviendo'],inactive:['Inactive','Inactivo']
}

export default async function OutreachContactPage({params,searchParams}:{params:Promise<{contactId:string}>;searchParams:Promise<{invite?:string;error?:string;lang?:string}>}){
  const [{contactId},query]=await Promise.all([params,searchParams])
  const es=query.lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const withLang=(href:string)=>`${href}${href.includes('?')?'&':'?'}lang=${es?'es':'en'}`
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:contact}=await supabase.from('outreach_contacts').select('*').eq('id',contactId).eq('church_id',membership.church_id).maybeSingle()
  if(!contact)redirect('/outreach?error='+encodeURIComponent(t('Outreach contact not found or unavailable to you.','No se encontró el contacto de alcance o no está disponible para usted.')))
  const canInvite=['pastor','church_admin'].includes(membership.role)
  let linkedProfile:any=null
  if(contact.member_user_id){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').eq('id',contact.member_user_id).maybeSingle();linkedProfile=r.data??null}
  const {data:interactions}=await supabase.from('outreach_interactions').select('id,contact_id,interaction_type,occurred_at,summary,bible_study_lesson,recorded_by,profiles:recorded_by(display_name,first_name,last_name)').eq('contact_id',contactId).order('occurred_at',{ascending:false})
  let openInvite:any=null
  if(canInvite&&!contact.member_user_id){const r=await supabase.from('church_invites').select('id,email,expires_at,created_at').eq('church_id',membership.church_id).eq('outreach_contact_id',contactId).is('redeemed_at',null).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(1).maybeSingle();openInvite=r.data??null}
  const inviteId=query.invite||openInvite?.id||null
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const name=[contact.first_name,contact.last_name].filter(Boolean).join(' ')||t('Outreach contact','Contacto de alcance')
  const stage=String(contact.stage||'new_contact')
  const stageLabel=stageNames[stage]?.[es?1:0]??stage.replaceAll('_',' ')
  const nextByStage:Record<string,{title:[string,string];detail:[string,string];href:string;icon:any}>={
    new_contact:{title:['Make the first personal follow-up','Haga el primer seguimiento personal'],detail:['Reach out, learn their story, and invite them to the next natural church connection.','Comuníquese, conozca su historia e invítelo a la próxima conexión natural con la iglesia.'],href:'/outreach',icon:Phone},
    invited:{title:['Follow up on the invitation','Dé seguimiento a la invitación'],detail:['Confirm they received the invitation and make the next visit easy.','Confirme que recibió la invitación y facilite su próxima visita.'],href:'/outreach',icon:Mail},
    guest:{title:['Connect after their visit','Conéctese después de su visita'],detail:['Thank them for coming, learn any prayer need, and offer a next step such as a group or Bible study.','Agradézcale su visita, conozca cualquier necesidad de oración y ofrezca un siguiente paso como un grupo o estudio bíblico.'],href:'/groups',icon:Users},
    bible_study:{title:['Keep the Bible study moving','Mantenga avanzando el estudio bíblico'],detail:['Schedule or record the next lesson and keep consistent personal contact.','Programe o registre la próxima lección y mantenga contacto personal constante.'],href:'/outreach',icon:BookOpen},
    regular_attendee:{title:['Help them build a foundation','Ayúdele a construir un fundamento'],detail:['Move toward First Steps, a Friendship Group, and a clear discipleship connection.','Avance hacia Primeros Pasos, un Grupo de Amistad y una conexión clara de discipulado.'],href:'/learning',icon:BookOpen},
    baptized:{title:['Continue New Birth follow-up','Continúe el seguimiento del Nuevo Nacimiento'],detail:['Make sure the baptism record is verified and continue toward Holy Ghost, First Steps, and connection.','Asegure que el bautismo esté verificado y continúe hacia el Espíritu Santo, Primeros Pasos y conexión.'],href:'/learning',icon:Compass},
    holy_ghost:{title:['Build the discipleship foundation','Construya el fundamento de discipulado'],detail:['Guide them into First Steps and consistent church relationships.','Guíelo hacia Primeros Pasos y relaciones constantes en la iglesia.'],href:'/learning',icon:Compass},
    first_steps:{title:['Move from class into community','Pase de la clase a la comunidad'],detail:['Help them connect to a Friendship Group and discover where they can serve.','Ayúdele a conectarse con un Grupo de Amistad y descubrir dónde puede servir.'],href:'/groups',icon:Users},
    connected:{title:['Help them discover serving','Ayúdele a descubrir dónde servir'],detail:['Their next step may be ministry interest, qualification, training, or a team conversation.','Su próximo paso puede ser interés ministerial, calificación, capacitación o una conversación con un equipo.'],href:'/serve',icon:Compass},
    serving:{title:['Keep discipling, not just scheduling','Siga discipulando, no solo programando'],detail:['Maintain relationship, encouragement, learning, and accountability while they serve.','Mantenga relación, ánimo, aprendizaje y responsabilidad mientras sirve.'],href:'/journey',icon:UserCheck},
    inactive:{title:['Decide whether to re-engage','Decida si debe volver a conectarse'],detail:['Reach out personally before treating inactivity as a closed relationship.','Comuníquese personalmente antes de tratar la inactividad como una relación cerrada.'],href:'/outreach',icon:Phone}
  }
  const next=nextByStage[stage]??nextByStage.new_contact
  const NextIcon=next.icon

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Su Iglesia')} • {t('Outreach','Alcance')}</div></div><div className="row"><Link className="ghost" href={withLang(`/outreach/${contactId}`)}>{es?'English':'Español'}</Link><Link className="ghost" href={withLang('/outreach')}>← {t('Outreach Pipeline','Seguimiento')}</Link><Link className="ghost" href="/">{t('Home','Inicio')}</Link></div></header>
    <section className="outreach-hero card"><div><div className="pill">{t('OUTREACH PERSON','PERSONA DE ALCANCE')}</div><h1>{name}</h1><p className="muted">{t('Follow-up history, the next relationship step, and the bridge into a real Kingdom Network member account.','Historial de seguimiento, el próximo paso de relación y el puente hacia una cuenta real de Kingdom Network.')}</p></div><div className="hero-stat"><strong>{stageLabel}</strong><span>{t('current stage','etapa actual')}</span></div></section>
    {query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{marginBottom:18,display:'grid',gap:10}}><div className="pill">{t('RECOMMENDED NEXT STEP','SIGUIENTE PASO RECOMENDADO')}</div><div className="row" style={{alignItems:'flex-start'}}><div className="milestone-icon"><NextIcon size={15}/></div><div style={{flex:1}}><h2 style={{marginTop:0}}>{next.title[es?1:0]}</h2><p className="muted">{next.detail[es?1:0]}</p><Link className="btn" href={withLang(next.href)}>{t('Open next step','Abrir siguiente paso')} →</Link></div></div></section>

    <div className="outreach-layout"><section className="contact-list"><article className="card contact-card"><div className="contact-head"><div className="contact-name"><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><div className="small muted">{contact.email||t('No email added','Sin correo agregado')}{contact.phone?` • ${contact.phone}`:''}</div></div></div><span className="stage-chip">{stageLabel}</span></div>
      {(contact.phone||contact.email)&&<div className="row" style={{margin:'12px 0'}}>{contact.phone&&<a className="ghost" href={`tel:${contact.phone}`}><Phone size={12}/> {t('Call','Llamar')}</a>}{contact.email&&<a className="ghost" href={`mailto:${contact.email}`}><Mail size={12}/> {t('Email','Correo')}</a>}</div>}
      {contact.prayer_request&&<p className="muted"><strong>{t('Prayer request','Petición de oración')}:</strong> {contact.prayer_request}</p>}{contact.notes&&<p className="muted"><strong>{t('Notes','Notas')}:</strong> {contact.notes}</p>}<OutreachHistory contactId={contactId} interactions={interactions??[]} timeZone={timeZone}/></article></section>

    <aside><section className="card create-outreach"><div className="pill">{t('MEMBER CONNECTION','CONEXIÓN DE MIEMBRO')}</div>{contact.member_user_id?<><UserCheck size={24}/><h2>{t('Linked to Kingdom Network','Conectado a Kingdom Network')}</h2><p className="small muted">{t(`This Outreach history is connected to the member account for ${personName(linkedProfile)}. The Outreach record stays preserved instead of becoming a duplicate guest.`,`Este historial de alcance está conectado a la cuenta de miembro de ${personName(linkedProfile)}. El registro de alcance se conserva en lugar de crear una visita duplicada.`)}</p><Link className="btn" href={withLang(`/directory/${contact.member_user_id}`)}>{t('Open member profile','Abrir perfil del miembro')}</Link></>:canInvite?<><Link2 size={24}/><h2>{t('Invite into Kingdom Network','Invitar a Kingdom Network')}</h2><p className="small muted">{t('The invitation is tied to this email and expires after seven days. When the person creates the account, this Outreach record links to that member automatically.','La invitación está vinculada a este correo y vence después de siete días. Cuando la persona crea la cuenta, este registro de alcance se conecta automáticamente con ese miembro.')}</p>{contact.email?inviteId?<div style={{display:'grid',gap:8}}><div className="notice success"><Mail size={12}/> {t('Invitation ready for','Invitación lista para')} {contact.email}.</div><OutreachInviteLink inviteId={inviteId}/>{openInvite?.expires_at&&<span className="small muted">{t('Expires','Vence')} {new Date(openInvite.expires_at).toLocaleString()}</span>}</div>:<form action={createOutreachMemberInvite}><input type="hidden" name="contact_id" value={contactId}/><button className="btn"><Mail size={13}/> {t('Create secure member invitation','Crear invitación segura de miembro')}</button></form>:<div className="notice error">{t('Add an email address to this Outreach person before creating a member invitation.','Agregue un correo electrónico a esta persona antes de crear una invitación de miembro.')}</div>}</>:<><ShieldCheck size={24}/><h2>{t('Admin invitation required','Se requiere invitación de administrador')}</h2><p className="small muted">{t('A pastor or church admin can create the secure account invitation. Outreach leaders can continue follow-up without being able to issue account access.','Un pastor o administrador de iglesia puede crear la invitación segura. Los líderes de alcance pueden continuar el seguimiento sin poder otorgar acceso a cuentas.')}</p></>}</section></aside></div>
  </main>
}
