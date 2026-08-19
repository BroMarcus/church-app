import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Languages,Link2,MailPlus,QrCode,ShieldCheck,UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CopyInviteLink } from './copy-invite-link'
import { CopyJoinLink } from './copy-join-link'
import { createChurchInvite,revokeChurchInvite } from './actions'
import './invites.css'

const roleLabel=(v:string,lang:'en'|'es')=>{
  const es:Record<string,string>={member:'Miembro',group_leader:'Líder de grupo',ministry_leader:'Líder de ministerio',minister:'Ministro'}
  return lang==='es'?(es[v]??v):v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
}
const dateTime=(v:string)=>new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

const copy={
  en:{church:'Your Church',title:'Member Invitations',admin:'← Church Admin',home:'Home',pill:'MEMBER ONBOARDING',hero:'Invite people intentionally.',heroBody:'Use the permanent church link for regular member signup. Use a personal invitation when you need to assign a starting leadership role.',open:'open invite',created:'Invitation created. Copy the link and send it to the invited person.',revoked:'Invitation revoked.',newInvite:'NEW INVITE',createTitle:'Create personal invitation',security:'For pilot security, pastor and church-admin roles are assigned only after the person joins.',email:'Email address',role:'Starting role',expires:'Expires in',create:'Create invitation',member:'Member',group:'Group leader',ministry:'Ministry leader',minister:'Minister',day:'day',days:'days',createdLabel:'Created',by:'By',expiresLabel:'Expires',redeemed:'Redeemed',revokedLabel:'Revoked',revoke:'Revoke',none:'No personal invitations yet.',noneBody:'Regular members can use the permanent church join link above.',secure:'SECURE FLOW',secureTitle:'Forwarding a personal invite does not transfer it.',secureBody:'The person must create the account using the exact invited email address. The membership role comes from the protected invite record, not from the URL or signup form.',english:'English',spanish:'Español',states:{open:'open',redeemed:'redeemed',revoked:'revoked',expired:'expired'},permanent:'PERMANENT CHURCH JOIN LINK',permanentTitle:'Share this with regular members.',permanentBody:'This link does not expire. Put it in a text, email, flyer, welcome card or on a church screen. New accounts from this link join this church as members.',qr:'SCAN TO JOIN',openJoin:'Open join page',limit:(remaining:number|null)=>remaining==null?'Public member signup is open.':`${remaining} public pilot signup spot${remaining===1?'':'s'} remaining.`},
  es:{church:'Tu Iglesia',title:'Invitaciones de Miembros',admin:'← Administración',home:'Inicio',pill:'INCORPORACIÓN DE MIEMBROS',hero:'Invita a las personas de forma intencional.',heroBody:'Usa el enlace permanente de la iglesia para miembros normales. Usa una invitación personal cuando necesites asignar un rol de liderazgo inicial.',open:'invitación abierta',created:'Invitación creada. Copia el enlace y envíaselo a la persona invitada.',revoked:'Invitación revocada.',newInvite:'NUEVA INVITACIÓN',createTitle:'Crear invitación personal',security:'Por seguridad del piloto, los roles de pastor y administrador se asignan después de que la persona entra.',email:'Correo electrónico',role:'Rol inicial',expires:'Vence en',create:'Crear invitación',member:'Miembro',group:'Líder de grupo',ministry:'Líder de ministerio',minister:'Ministro',day:'día',days:'días',createdLabel:'Creada',by:'Por',expiresLabel:'Vence',redeemed:'Usada',revokedLabel:'Revocada',revoke:'Revocar',none:'Todavía no hay invitaciones personales.',noneBody:'Los miembros normales pueden usar el enlace permanente de la iglesia arriba.',secure:'FLUJO SEGURO',secureTitle:'Reenviar una invitación personal no la transfiere.',secureBody:'La persona debe crear la cuenta usando exactamente el correo invitado. El rol de membresía viene del registro protegido de la invitación, no de la URL ni del formulario.',english:'English',spanish:'Español',states:{open:'abierta',redeemed:'usada',revoked:'revocada',expired:'vencida'},permanent:'ENLACE PERMANENTE PARA UNIRSE',permanentTitle:'Comparte esto con miembros normales.',permanentBody:'Este enlace no vence. Úsalo en un texto, correo, volante, tarjeta de bienvenida o en una pantalla de la iglesia. Las cuentas nuevas de este enlace se unen a esta iglesia como miembros.',qr:'ESCANEA PARA UNIRTE',openJoin:'Abrir página para unirse',limit:(remaining:number|null)=>remaining==null?'El registro público de miembros está abierto.':`Quedan ${remaining} lugar${remaining===1?'':'es'} para el registro público del piloto.`}
} as const

export default async function InvitesPage({searchParams}:{searchParams:Promise<{created?:string;revoked?:string;error?:string;lang?:string}>}){
  const query=await searchParams
  const lang: 'en'|'es'=query.lang==='es'?'es':'en'
  const t=copy[lang]
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(`/login${lang==='es'?'?lang=es':''}`)
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,slug)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:invites}=await supabase.from('church_invites').select('id,email,role,first_name,last_name,expires_at,redeemed_at,revoked_at,created_at,created_by,redeemed_by').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(100)
  const ids=Array.from(new Set((invites??[]).flatMap((i:any)=>[i.created_by,i.redeemed_by]).filter(Boolean)))
  let profiles:any[]=[]
  if(ids.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const person=(id?:string|null)=>{const p=id?pm.get(id):null;return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'—'}
  const invitee=(invite:any)=>[invite.first_name,invite.last_name].filter(Boolean).join(' ')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  let signup:any=null
  if(church?.slug){const {data}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:church.slug});signup=Array.isArray(data)?data[0]:data}
  const joinUrl=church?.slug?`${siteUrl}/join/${encodeURIComponent(church.slug)}`:''
  const qrSrc=joinUrl?`https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(joinUrl)}`:''
  const now=Date.now()
  const rows=(invites??[]).map((invite:any)=>{const state: 'open'|'redeemed'|'revoked'|'expired'=invite.redeemed_at?'redeemed':invite.revoked_at?'revoked':new Date(invite.expires_at).getTime()<=now?'expired':'open';return {...invite,state}})
  const open=rows.filter((i:any)=>i.state==='open').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t.church} • {t.title}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/church/invites?lang=en">{t.english}</Link><Link className="ghost" href="/church/invites?lang=es">{t.spanish}</Link><Link className="ghost" href="/church">{t.admin}</Link><Link className="ghost" href="/">{t.home}</Link></div></header>
    <section className="invite-hero card"><div><div className="pill">{t.pill}</div><h1>{t.hero}</h1><p className="muted">{t.heroBody}</p></div><div className="admin-badge"><MailPlus size={22}/><div><strong>{open}</strong><span>{t.open}{open===1?'':'s'}</span></div></div></section>
    {query.created&&<div className="notice success">{t.created}</div>}{query.revoked&&<div className="notice success">{t.revoked}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    {joinUrl&&<section className="card" style={{padding:20,marginBottom:18}}><div className="pill"><Link2 size={12}/> {t.permanent}</div><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:22,alignItems:'center',marginTop:12}}><div><h2 style={{margin:'0 0 8px'}}>{t.permanentTitle}</h2><p className="muted">{t.permanentBody}</p><div className="card" style={{padding:12,wordBreak:'break-all',background:'rgba(255,255,255,.025)',marginBottom:12}}><strong>{joinUrl}</strong></div><p className="small muted">{t.limit(signup?.remaining??null)}</p><div className="row" style={{gap:8,flexWrap:'wrap'}}><CopyJoinLink url={joinUrl} lang={lang}/><Link className="ghost" href={`/join/${encodeURIComponent(church.slug)}?lang=${lang}`} target="_blank">{t.openJoin}</Link></div></div><div style={{textAlign:'center'}}><div className="pill" style={{marginBottom:8}}><QrCode size={12}/> {t.qr}</div><img src={qrSrc} width="190" height="190" alt={`${church.name} Kingdom Network join QR code`} style={{display:'block',background:'#fff',padding:8,borderRadius:12}}/></div></div></section>}

    <div className="invite-layout"><aside className="card invite-create"><div className="pill">{t.newInvite}</div><h2>{t.createTitle}</h2><p className="small muted">{t.security}</p><form action={createChurchInvite} className="invite-form"><input type="hidden" name="lang" value={lang}/><label><span>{t.email}</span><input name="email" type="email" required placeholder="member@example.com" autoComplete="email"/></label><label><span>{t.role}</span><select name="role" defaultValue="member"><option value="member">{t.member}</option><option value="group_leader">{t.group}</option><option value="ministry_leader">{t.ministry}</option><option value="minister">{t.minister}</option></select></label><label><span>{t.expires}</span><select name="expires_days" defaultValue="7"><option value="1">1 {t.day}</option><option value="3">3 {t.days}</option><option value="7">7 {t.days}</option><option value="14">14 {t.days}</option><option value="30">30 {t.days}</option></select></label><button className="btn"><UserPlus size={14}/> {t.create}</button></form></aside>

      <section className="invite-list">{rows.map((invite:any)=><article className="card invite-card" key={invite.id}><div className="invite-head"><div><strong className="invite-email">{invitee(invite)||invite.email}</strong>{invitee(invite)&&<div className="small muted">{invite.email}</div>}<div className="invite-meta"><span>{roleLabel(invite.role,lang)}</span><span>{t.createdLabel} {dateTime(invite.created_at)}</span><span>{t.by} {person(invite.created_by)}</span></div></div><span className={`invite-state ${invite.state}`}>{t.states[invite.state as keyof typeof t.states]}</span></div><div className="invite-meta"><span>{t.expiresLabel} {dateTime(invite.expires_at)}</span>{invite.redeemed_at&&<span>{t.redeemed} {dateTime(invite.redeemed_at)} · {person(invite.redeemed_by)}</span>}{invite.revoked_at&&<span>{t.revokedLabel} {dateTime(invite.revoked_at)}</span>}</div><div className="invite-actions">{invite.state==='open'&&<><CopyInviteLink inviteId={invite.id} lang={lang}/><form action={revokeChurchInvite}><input type="hidden" name="invite_id" value={invite.id}/><input type="hidden" name="lang" value={lang}/><button className="ghost">{t.revoke}</button></form></>}</div></article>)}{!rows.length&&<div className="card empty"><h3>{t.none}</h3><p className="muted">{t.noneBody}</p></div>}</section></div>

    <section className="card invite-note"><div className="pill">{t.secure}</div><h3><ShieldCheck size={15}/> {t.secureTitle}</h3><p className="muted">{t.secureBody}</p></section>
  </main>
}
