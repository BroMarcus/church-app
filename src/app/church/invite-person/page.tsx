import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MailPlus,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createKnownPersonInvite } from './actions'
import { CopyKnownInvite } from './copy-invite'
import { InvitePendingSubmit } from '../invites/pending-submit'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')
const messages={
  en:{created:'Invitation ready. Send only this newest link.',role_not_allowed:'That starting role is not allowed for invitations.',create_failed:'We could not create the invitation. Nothing was changed. Check the information and try again.'},
  es:{created:'Invitación lista. Envía solamente este enlace más reciente.',role_not_allowed:'Ese rol inicial no está permitido para invitaciones.',create_failed:'No pudimos crear la invitación. No se cambió nada. Revisa la información e inténtalo otra vez.'}
} as const

export default async function InvitePersonPage({searchParams}:{searchParams:Promise<{lang?:string;created?:string;status?:string}>}){
  const params=await searchParams,es=params.lang==='es',lang: 'en'|'es'=es?'es':'en'
  const l=(p:string)=>`${p}${p.includes('?')?'&':'?'}lang=${lang}`
  const supabase=await createClient();const {data:claims,error:claimsError}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(claimsError)console.error('invite-person auth lookup failed',{code:claimsError.code})
  if(!userId)redirect(`/login?lang=${lang}&next=${encodeURIComponent(l('/church/invite-person'))}`)
  const {data:membership,error:membershipError}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(membershipError)console.error('invite-person membership lookup failed',{code:membershipError.code})
  if(!membership?.church_id)redirect('/')
  const {data:custom,error:permissionError}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_members'})
  if(permissionError)console.error('invite-person permission lookup failed',{code:permissionError.code})
  const canInvite=['pastor','church_admin'].includes(membership.role)||(!permissionError&&Boolean(custom));if(!canInvite)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  let invite:any=null
  if(params.created){const r=await supabase.from('church_invites').select('id,email,first_name,last_name,phone,role,expires_at').eq('id',params.created).eq('church_id',membership.church_id).maybeSingle();if(r.error)console.error('created invitation lookup failed',{code:r.error.code});else invite=r.data}
  const inviteUrl=invite?`${siteUrl}/login?invite=${encodeURIComponent(invite.id)}&lang=${lang}`:''
  const leadershipInviteOptions=[['member',es?'Acceso estándar':'Standard access'],['group_leader',es?'Líder de grupo':'Group leader'],['ministry_leader',es?'Líder de ministerio':'Ministry leader'],['minister',es?'Ministro':'Minister']]
  const roleOptions=['pastor','church_admin'].includes(membership.role)?leadershipInviteOptions:[['member',es?'Acceso estándar':'Standard access']]
  const notice=(params.status&&params.status in messages[lang])?messages[lang][params.status as keyof typeof messages.en]:null
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Invitar Persona':'Invite Person'}</div></div><div className="row"><Link className="ghost" href="/church/invite-person?lang=en">English</Link><Link className="ghost" href="/church/invite-person?lang=es">Español</Link><Link className="ghost" href={l('/church/join-center')}>{es?'Centro de Ingreso':'Join Center'}</Link><Link className="ghost" href="/">{es?'← Inicio':'← Home'}</Link></div></header>
  <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">{es?'INVITACIÓN PRIVADA':'PRIVATE INVITATION'}</div><h1>{es?'Para una persona que liderazgo ya conoce.':'For someone leadership already knows.'}</h1><p className="muted">{es?'Usa el correo que esa persona usa para Kingdom Network. Si ya tiene una cuenta, debe iniciar sesión con la misma cuenta; no debe crear otra.':'Use the email that person uses for Kingdom Network. If they already have an account, they should sign in with that same account—not create another one.'}</p></section>
  {notice&&<div className={`notice ${params.status==='created'?'success':'error'}`} role={params.status==='created'?'status':'alert'} aria-live="polite">{notice}</div>}
  {params.created&&!invite&&<div className="notice error" role="alert">{es?'No pudimos volver a cargar esa invitación. No crees otra todavía; abre Invitaciones para revisar primero.':'We could not reload that invitation. Do not create another one yet; open Invitations and check first.'} <Link href={l('/church/invites')}>{es?'Revisar invitaciones':'Review invitations'}</Link></div>}
  {invite&&<section className="card" style={{padding:20,marginBottom:18,border:'1px solid rgba(34,197,94,.35)'}}><div className="pill">{es?'INVITACIÓN LISTA':'INVITATION READY'}</div><h2>{[invite.first_name,invite.last_name].filter(Boolean).join(' ')||invite.email}</h2><div className="small muted">{invite.email}{invite.phone?` • ${invite.phone}`:''} • {es?'vence':'expires'} ${new Date(invite.expires_at).toLocaleString()}</div><div className="small muted" style={{wordBreak:'break-all',margin:'12px 0'}}>{inviteUrl}</div><CopyKnownInvite url={inviteUrl} label={es?'Copiar invitación':'Copy invitation'}/><p className="small muted">{es?'Si haces otra invitación para esta persona, envía solamente el enlace abierto más reciente y pide que ignore los mensajes anteriores.':'If you replace this invitation, send only the newest open link and ask them to ignore older messages.'}</p></section>}
  <form action={createKnownPersonInvite} className="card" style={{padding:20,display:'grid',gap:10}}><input type="hidden" name="lang" value={lang}/><div className="row" style={{gap:10,flexWrap:'wrap'}}><label className="field" style={{flex:'1 1 180px'}}><span>{es?'Nombre':'First name'}</span><input name="first_name" autoComplete="given-name"/></label><label className="field" style={{flex:'1 1 180px'}}><span>{es?'Apellido':'Last name'}</span><input name="last_name" autoComplete="family-name"/></label></div><label className="field"><span>{es?'Teléfono':'Phone'}</span><input name="phone" type="tel" autoComplete="tel"/></label><label className="field"><span>{es?'Correo electrónico':'Email'}</span><input name="email" type="email" autoComplete="email" required/></label><label className="field"><span>{es?'Acceso inicial':'Starting access'}</span><select name="role" defaultValue="member">{roleOptions.map(([v,label])=><option value={v} key={v}>{label}</option>)}</select></label><div className="notice"><ShieldCheck size={14}/><span>{es?'Pastor y Administrador nunca se preasignan por invitación.':'Pastor and Church Admin are never preassigned by invitation.'}</span></div><p className="small muted">{es?'Toca Crear una sola vez y mantén esta página abierta mientras guarda.':'Tap Create once and keep this page open while it saves.'}</p><InvitePendingSubmit label={es?'Crear invitación':'Create invitation'} pendingLabel={es?'Creando…':'Creating…'}/></form>
  <section className="card" style={{padding:16,marginTop:16}}><div className="row" style={{gap:9,alignItems:'flex-start'}}><MailPlus size={17}/><div><strong>{es?'Entrega manual por ahora':'Manual delivery for now'}</strong><div className="small muted">{es?'Copia el enlace y envíalo por texto o correo.':'Copy the link and send it by text or email.'}</div></div></div></section></main>
}
