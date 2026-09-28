import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Languages,MailPlus,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CopyInviteLink } from './copy-invite-link'
import { createChurchInvite,revokeChurchInvite } from './actions'
import { InvitePendingSubmit } from './pending-submit'
import './invites.css'

const roleLabel=(v:string,lang:'en'|'es')=>{const es:Record<string,string>={member:'Miembro',group_leader:'Líder de grupo',ministry_leader:'Líder de ministerio',minister:'Ministro'};return lang==='es'?(es[v]??v):v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
const dateTime=(v:string)=>new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
const boundedCode=(value:unknown)=>String(value??'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
const diagnosticCode=(error:unknown,fallback:string)=>{
  if(error&&typeof error==='object'&&'code' in error)return boundedCode((error as {code?:unknown}).code)
  if(error instanceof Error)return boundedCode(error.name)
  return boundedCode(fallback)
}
const statusCopy={
  en:{created:'Invitation created. Copy the newest link and send it to the invited person.',revoked:'Invitation revoked.',invalid_email:'Enter a complete email address.',role_not_allowed:'That starting role is not allowed for invitations.',duplicate_open:'An open invitation already exists for this email. Use that newest open link, or revoke it before creating a replacement.',create_failed:'We could not create the invitation. Nothing was changed. Try again.',invite_missing:'Invitation not found.',revoke_failed:'We could not revoke the invitation. Nothing was changed. Try again.',invite_not_open:'That invitation is already used, revoked, or no longer available. Refresh before trying again.',access_unavailable:'We could not verify invitation access right now. Nothing was changed. Try again in a moment.',not_authorized:'This account does not have permission to manage invitations.'},
  es:{created:'Invitación creada. Copia el enlace más reciente y envíaselo a la persona invitada.',revoked:'Invitación revocada.',invalid_email:'Escribe un correo electrónico completo.',role_not_allowed:'Ese rol inicial no está permitido para invitaciones.',duplicate_open:'Ya existe una invitación abierta para este correo. Usa ese enlace abierto más reciente o revócalo antes de crear otro.',create_failed:'No pudimos crear la invitación. No se cambió nada. Inténtalo otra vez.',invite_missing:'No se encontró la invitación.',revoke_failed:'No pudimos revocar la invitación. No se cambió nada. Inténtalo otra vez.',invite_not_open:'Esa invitación ya fue usada, revocada o ya no está disponible. Actualiza la página antes de intentarlo otra vez.',access_unavailable:'No pudimos verificar el acceso a invitaciones en este momento. No se cambió nada. Inténtalo de nuevo en un momento.',not_authorized:'Esta cuenta no tiene permiso para administrar invitaciones.'}
} as const

type Lang='en'|'es'
const prefersSpanish=(acceptLanguage:string|null)=>/^\s*es(?:-|_|,|;|$)/i.test(acceptLanguage||'')
function AccessRecovery({lang,kind}:{lang:Lang;kind:'unavailable'|'unauthorized'}){
  const es=lang==='es'
  return <main className="shell"><header className="topbar"><Link href={`/?lang=${lang}`} className="brand">Kingdom <span>Network</span></Link></header><section className="card" style={{padding:24,maxWidth:720,margin:'30px auto'}}><div className="pill">{es?'INVITACIONES':'INVITATIONS'}</div><h1>{kind==='unavailable'?(es?'No pudimos verificar tu acceso.':'We could not verify your access.'):(es?'Acceso no disponible':'Access not available')}</h1><p className="muted">{kind==='unavailable'?(es?'Puede ser un problema temporal de conexión. No se creó, cambió ni revocó ninguna invitación.':'This may be a temporary connection problem. No invitation was created, changed, or revoked.'):(es?'Esta cuenta no tiene permiso para administrar invitaciones.':'This account does not have permission to manage invitations.')}</p><div className="row" style={{gap:10,flexWrap:'wrap'}}><Link className="btn" href={`/church/invites?lang=${lang}`}>{es?'Intentar de nuevo':'Try again'}</Link><Link className="ghost" href={`/?lang=${lang}`}>{es?'Inicio':'Home'}</Link><Link className="ghost" href={`/help?lang=${lang}`}>{es?'Ayuda':'Help'}</Link></div></section></main>
}

export default async function InvitesPage({searchParams}:{searchParams:Promise<{status?:string;lang?:string}>}){
  const query=await searchParams
  const requestHeaders=await headers()
  const browserLang:Lang=prefersSpanish(requestHeaders.get('accept-language'))?'es':'en'
  const lang:Lang=query.lang==='es'?'es':query.lang==='en'?'en':browserLang
  const es=lang==='es'
  const l=(p:string)=>`${p}${p.includes('?')?'&':'?'}lang=${lang}`
  let supabase
  try{supabase=await createClient()}
  catch(error){console.error('member invitations client unavailable',{errorCode:diagnosticCode(error,'client_unavailable')});return <AccessRecovery lang={lang} kind="unavailable"/>}

  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}
  catch(error){console.error('member invitations auth transport failed',{errorCode:diagnosticCode(error,'auth_unavailable')});return <AccessRecovery lang={lang} kind="unavailable"/>}
  const {data:claims,error:claimsError}=claimsResult
  const userId=claims?.claims?.sub
  if(claimsError){console.error('member invitations auth lookup failed',{errorCode:boundedCode(claimsError.code)});return <AccessRecovery lang={lang} kind="unavailable"/>}
  if(!userId)redirect(`/login?lang=${lang}&mode=signin&next=${encodeURIComponent(l('/church/invites'))}`)

  let membershipResult
  try{membershipResult=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()}
  catch(error){console.error('member invitations membership transport failed',{errorCode:diagnosticCode(error,'membership_unavailable')});return <AccessRecovery lang={lang} kind="unavailable"/>}
  const {data:membership,error:membershipError}=membershipResult
  if(membershipError){console.error('member invitations membership lookup failed',{errorCode:boundedCode(membershipError.code)});return <AccessRecovery lang={lang} kind="unavailable"/>}
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))return <AccessRecovery lang={lang} kind="unauthorized"/>

  let invites:any[]|null=null,invitesError:any=null
  try{
    const invitesResult=await supabase.from('church_invites').select('id,email,role,first_name,last_name,expires_at,redeemed_at,revoked_at,created_at,created_by,redeemed_by').eq('church_id',membership.church_id).order('created_at',{ascending:false}).limit(100)
    invites=invitesResult.data
    invitesError=invitesResult.error
  }catch(error){
    invitesError={code:diagnosticCode(error,'invites_unavailable')}
    console.error('member invitations list transport failed',{errorCode:diagnosticCode(error,'invites_unavailable')})
  }
  if(invitesError)console.error('member invitations list failed',{errorCode:boundedCode(invitesError.code)})
  const safeInvites=invitesError?[]:(invites??[])
  const ids=Array.from(new Set(safeInvites.flatMap((i:any)=>[i.created_by,i.redeemed_by]).filter(Boolean)))
  let profiles:any[]=[]
  if(ids.length){
    try{
      const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids)
      if(r.error)console.error('member invitations profile labels failed',{errorCode:boundedCode(r.error.code)})
      else profiles=r.data??[]
    }catch(error){
      console.error('member invitations profile labels transport failed',{errorCode:diagnosticCode(error,'profiles_unavailable')})
    }
  }
  const pm=new Map(profiles.map((p:any)=>[p.id,p]));const person=(id?:string|null)=>{const p=id?pm.get(id):null;return p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'—'};const invitee=(i:any)=>[i.first_name,i.last_name].filter(Boolean).join(' ')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches;const now=Date.now();const rows=safeInvites.map((i:any)=>({...i,state:i.redeemed_at?'redeemed':i.revoked_at?'revoked':new Date(i.expires_at).getTime()<=now?'expired':'open'}));const open=rows.filter((i:any)=>i.state==='open').length
  const notice=(query.status&&query.status in statusCopy[lang])?statusCopy[lang][query.status as keyof typeof statusCopy.en]:null;const success=query.status==='created'||query.status==='revoked'
  const states:any=es?{open:'abierta',redeemed:'usada',revoked:'revocada',expired:'vencida'}:{open:'open',redeemed:'redeemed',revoked:'revoked',expired:'expired'}
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??(es?'Tu Iglesia':'Your Church')} • {es?'Invitaciones de Miembros':'Member Invitations'}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/church/invites?lang=en">English</Link><Link className="ghost" href="/church/invites?lang=es">Español</Link><Link className="ghost" href={l('/church')}>{es?'← Administración':'← Church Admin'}</Link></div></header>
  <section className="invite-hero card"><div><div className="pill">{es?'INCORPORACIÓN DE MIEMBROS':'MEMBER ONBOARDING'}</div><h1>{es?'Invita a una persona a la vez.':'Invite one person at a time.'}</h1><p className="muted">{es?'Cada enlace corresponde a un correo y solo se usa una vez. Si la persona ya tiene una cuenta, debe iniciar sesión con esa misma cuenta; no debe crear otra.':'Each link belongs to one email and is used once. If the person already has an account, they should sign in with that same account—not create another one.'}</p></div><div className="admin-badge"><MailPlus size={22}/><div><strong>{open}</strong><span>{es?' abiertas':' open'}</span></div></div></section>
  {notice&&<div className={`notice ${success?'success':'error'}`} role={success?'status':'alert'} aria-live="polite">{notice}</div>}
  {invitesError&&<section className="card" style={{padding:20,marginBottom:16}} role="alert"><h2>{es?'No pudimos cargar las invitaciones.':'We could not load invitations.'}</h2><p className="muted">{es?'No se cambió nada. Actualiza esta página antes de crear o revocar una invitación.':'Nothing was changed. Refresh this page before creating or revoking an invitation.'}</p><Link className="btn" href={l('/church/invites')}>{es?'Intentar otra vez':'Try again'}</Link></section>}
  {!invitesError&&<div className="invite-layout"><aside className="card invite-create"><div className="pill">{es?'NUEVA INVITACIÓN':'NEW INVITE'}</div><h2>{es?'Crear invitación':'Create invitation'}</h2><p className="small muted">{es?'Usa el correo que la persona usa para Kingdom Network. Toca Crear una sola vez y mantén esta página abierta mientras guarda.':'Use the email the person uses for Kingdom Network. Tap Create once and keep this page open while it saves.'}</p><form action={createChurchInvite} className="invite-form"><input type="hidden" name="lang" value={lang}/><label><span>{es?'Correo electrónico':'Email address'}</span><input name="email" type="email" required autoComplete="email" maxLength={254}/></label><label><span>{es?'Rol inicial':'Starting role'}</span><select name="role" defaultValue="member"><option value="member">{es?'Miembro':'Member'}</option><option value="group_leader">{es?'Líder de grupo':'Group leader'}</option><option value="ministry_leader">{es?'Líder de ministerio':'Ministry leader'}</option><option value="minister">{es?'Ministro':'Minister'}</option></select></label><label><span>{es?'Vence en':'Expires in'}</span><select name="expires_days" defaultValue="7">{[1,3,7,14,30].map(d=><option key={d} value={d}>{d} {es?(d===1?'día':'días'):(d===1?'day':'days')}</option>)}</select></label><InvitePendingSubmit label={es?'Crear invitación':'Create invitation'} pendingLabel={es?'Creando…':'Creating…'}/></form></aside>
  <section className="invite-list">{rows.map((invite:any)=><article className="card invite-card" key={invite.id}><div className="invite-head"><div><strong className="invite-email">{invitee(invite)||invite.email}</strong>{invitee(invite)&&<div className="small muted">{invite.email}</div>}<div className="invite-meta"><span>{roleLabel(invite.role,lang)}</span><span>{es?'Creada':'Created'} {dateTime(invite.created_at)}</span><span>{es?'Por':'By'} {person(invite.created_by)}</span></div></div><span className={`invite-state ${invite.state}`}>{states[invite.state]}</span></div><div className="invite-meta"><span>{es?'Vence':'Expires'} {dateTime(invite.expires_at)}</span>{invite.redeemed_at&&<span>{es?'Usada':'Redeemed'} {dateTime(invite.redeemed_at)} · {person(invite.redeemed_by)}</span>}</div>{invite.state==='open'&&<div className="invite-actions"><CopyInviteLink inviteId={invite.id} lang={lang}/><form action={revokeChurchInvite}><input type="hidden" name="invite_id" value={invite.id}/><input type="hidden" name="lang" value={lang}/><InvitePendingSubmit className="ghost" label={es?'Revocar':'Revoke'} pendingLabel={es?'Revocando…':'Revoking…'}/></form></div>}</article>)}{!rows.length&&<div className="card empty"><h3>{es?'Todavía no hay invitaciones.':'No invitations yet.'}</h3></div>}</section></div>}
  <section className="card invite-note"><div className="pill">{es?'ENLACE MÁS RECIENTE':'NEWEST LINK'}</div><h3><ShieldCheck size={15}/> {es?'Envía solo la invitación abierta más reciente.':'Send only the newest open invitation.'}</h3><p className="muted">{es?'Si reemplazas una invitación, pide a la persona que ignore mensajes viejos. Nunca necesita una segunda cuenta.':'If you replace an invitation, ask the person to ignore older messages. They never need a second account.'}</p></section></main>
}
