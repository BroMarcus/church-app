import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2,ExternalLink,MailPlus,QrCode,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CopyJoinLink } from './copy-join-link'
import { JoinQr } from './join-qr'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

export default async function JoinCenterPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams,es=params.lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,slug,public_signup_enabled)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const slug=church?.slug
  if(!slug)redirect(l('/church/settings'))
  const {data:statusData}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})
  const status:any=Array.isArray(statusData)?statusData[0]:statusData
  const joinUrl=`${siteUrl}/join/${slug}`
  const joinUrlEs=`${joinUrl}?lang=es`
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Centro de Ingreso':'Join Center'}</div></div><div className="row"><Link className="ghost" href="/church/join-center?lang=en">English</Link><Link className="ghost" href="/church/join-center?lang=es">Español</Link><Link className="ghost" href={l('/church')}>{es?'← Administración':'← Church Admin'}</Link></div></header>

    <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">{es?'PUERTA DE ENTRADA':'FRONT DOOR'}</div><h1>{es?'Un enlace. Un QR. Una forma sencilla de entrar.':'One link. One QR. One simple way in.'}</h1><p className="muted">{es?'Usa este mismo enlace en el vestíbulo, Grupos de Amistad, mensajes y materiales impresos. Las personas empiezan como Invitados con acceso a la aplicación; no aumentan el conteo formal de Miembros hasta que liderazgo cambie su relación.':'Use this same link in the lobby, Friendship Groups, texts and printed materials. People begin as Guests with app access; they do not increase the formal Member count until leadership changes their relationship.'}</p></section>

    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16,marginBottom:18}}>
      <section className="card" style={{padding:22}}><div className="pill"><QrCode size={11}/> {es?'QR DE NUEVA VIDA':'NEW LIFE QR'}</div><div style={{marginTop:18}}><JoinQr url={joinUrl} label={es?'Escanea para unirte a Kingdom Network en esta iglesia.':'Scan to join Kingdom Network at this church.'} es={es}/></div><div className="row" style={{justifyContent:'center',gap:8,flexWrap:'wrap',marginTop:16}}><CopyJoinLink url={joinUrl} label={es?'Copiar enlace':'Copy join link'}/><Link className="ghost" href={`/join/${slug}`} target="_blank"><ExternalLink size={13}/> {es?'Vista previa':'Preview'}</Link></div></section>
      <section className="card" style={{padding:22}}><div className="pill">{es?'ESTADO':'STATUS'}</div><h2>{church?.name}</h2><div style={{display:'grid',gap:10,margin:'14px 0'}}><div className="row"><CheckCircle2 size={16}/><span>{es?'Registro público':'Public signup'}: <strong>{status?.open?(es?'Abierto':'Open'):(es?'Pausado':'Paused')}</strong></span></div><div className="row"><Users size={16}/><span>{es?'Registros del piloto':'Pilot registrations'}: <strong>{status?.registration_count??0}</strong>{status?.signup_limit?` / ${status.signup_limit}`:''}</span></div>{status?.remaining!=null&&<div className="row"><ShieldCheck size={16}/><span><strong>{status.remaining}</strong> {es?'lugares disponibles':'spots remaining'}</span></div>}</div><div className="small muted" style={{wordBreak:'break-all'}}>{joinUrl}</div><div className="row" style={{gap:8,flexWrap:'wrap',marginTop:14}}><CopyJoinLink url={joinUrlEs} label={es?'Copiar enlace en español':'Copy Spanish link'}/></div></section>
    </div>

    <section className="card" style={{padding:20,marginBottom:16}}><div className="pill">{es?'DOS FORMAS DE ENTRAR':'TWO WAYS IN'}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14,marginTop:12}}><div><h3>{es?'1. QR / enlace público':'1. Public QR / link'}</h3><p className="muted">{es?'Para invitados y miembros locales que solo necesitan entrar rápido. Empiezan como Invitado y completan lo demás poco a poco.':'For guests and local people who just need to get in quickly. They start as Guest and fill in the rest gradually.'}</p></div><div><h3>{es?'2. Invitación privada':'2. Private invitation'}</h3><p className="muted">{es?'Para personas que liderazgo ya conoce o cuando quieres asignar un acceso específico. La invitación sigue siendo la ruta segura para roles especiales.':'For people leadership already knows or when you want to preassign specific access. Invitations remain the secure route for special roles.'}</p><Link className="btn" href={l('/church/invites')}><MailPlus size={14}/> {es?'Abrir Invitaciones':'Open Invitations'}</Link></div></div></section>

    <section className="card" style={{padding:18}}><div className="pill">{es?'FLUJO DEL INVITADO':'GUEST FLOW'}</div><p style={{lineHeight:1.7,marginBottom:0}}><strong>{es?'Escanear QR':'Scan QR'}</strong> → {es?'crear cuenta rápida':'quick account'} → <strong>{es?'relación Invitado':'Guest relationship'}</strong> → {es?'registro de Evangelismo enlazado':'linked Evangelism record'} → {es?'seguimiento asignado':'assigned follow-up'} → {es?'Empieza Aquí':'Start Here'} → {es?'perfil y Mi Jornada poco a poco':'profile and My Journey gradually'}.</p></section>
  </main>
}
