import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Ban,Languages,LockKeyhole,MessageCircle,MessageSquareWarning,ShieldAlert,Unlock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { blockMember,reportDirectMessage,sendDirectMessage,unblockMember } from '../actions'
import '../messages.css'

const personName=(p:any,fallback:string)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||fallback

export default async function MessageThreadPage({params,searchParams}:{params:Promise<{conversationId:string}>;searchParams:Promise<{sent?:string;blocked?:string;unblocked?:string;reported?:string;error?:string;lang?:string}>}){
  const [{conversationId},query]=await Promise.all([params,searchParams]),es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:conversation}=await supabase.from('direct_conversations').select('id,church_id,user_a,user_b,created_at').eq('id',conversationId).eq('church_id',membership.church_id).maybeSingle()
  if(!conversation)redirect(l('/messages?error='+encodeURIComponent(t('Conversation not found or unavailable.','Conversación no encontrada o no disponible.'))))
  const targetId=conversation.user_a===userId?conversation.user_b:conversation.user_a
  const [{data:target},{data:messages},{data:blockRow},{data:available}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,first_name,last_name').eq('id',targetId).single(),
    supabase.from('direct_messages').select('id,sender_id,body,created_at').eq('conversation_id',conversationId).order('created_at').limit(1000),
    supabase.from('member_blocks').select('blocked_id').eq('church_id',membership.church_id).eq('blocker_id',userId).eq('blocked_id',targetId).maybeSingle(),
    supabase.rpc('messaging_available',{p_target_user_id:targetId})
  ])
  const targetName=personName(target,t('Church member','Miembro de la iglesia')),blockedByMe=Boolean(blockRow),messagingAvailable=Boolean(available),church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell"><div className="thread-shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Messages','Mensajes')}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href={`/messages/${conversationId}?lang=en`}>English</Link><Link className="ghost" href={`/messages/${conversationId}?lang=es`}>Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/messages')}>← {t('Inbox','Bandeja')}</Link></div></header>

    <section className="card thread-head"><div className="thread-person"><div className="avatar">{targetName.slice(0,1).toUpperCase()}</div><div><h1>{targetName}</h1><span><LockKeyhole size={11}/> {t('Private one-to-one conversation','Conversación privada uno a uno')}</span></div></div></section>
    {query.sent&&<div className="notice success">{t('Message sent.','Mensaje enviado.')}</div>}{query.blocked&&<div className="notice success">{t('Member blocked. New messages are disabled until you unblock them.','Miembro bloqueado. Los mensajes nuevos están desactivados hasta que lo desbloquees.')}</div>}{query.unblocked&&<div className="notice success">{t('Member unblocked.','Miembro desbloqueado.')}</div>}{query.reported&&<div className="notice success">{t('Message reported for authorized leadership review.','Mensaje reportado para revisión por liderazgo autorizado.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="message-stack">{(messages??[]).map((m:any)=>{const mine=m.sender_id===userId;return <div className={`message-row ${mine?'mine':''}`} key={m.id}><article className="bubble"><p>{m.body}</p><div className="bubble-meta"><span>{mine?t('You','Tú'):targetName}</span><span>{new Date(m.created_at).toLocaleString(es?'es-US':'en-US')}</span></div>{!mine&&<details className="report-details"><summary>{t('Report','Reportar')}</summary><form action={reportDirectMessage} className="report-form"><input type="hidden" name="message_id" value={m.id}/><input type="hidden" name="conversation_id" value={conversationId}/><input type="hidden" name="lang" value={es?'es':'en'}/><input name="reason" required minLength={3} maxLength={1000} placeholder={t('Why should leadership review this message?','¿Por qué debe liderazgo revisar este mensaje?')}/><button className="ghost"><ShieldAlert size={12}/> {t('Report','Reportar')}</button></form></details>}</article></div>})}{!messages?.length&&<div className="card message-empty"><MessageCircle size={22}/><h3>{t('Start the conversation.','Comienza la conversación.')}</h3><p className="muted">{t('Write a message below.','Escribe un mensaje abajo.')}</p></div>}</section>

    {blockedByMe?<div className="blocked-box"><Ban size={13}/> {t('You blocked this member. Previous messages remain visible.','Bloqueaste a este miembro. Los mensajes anteriores siguen visibles.')}</div>:!messagingAvailable?<div className="blocked-box"><Ban size={13}/> {t('Messaging is currently unavailable between these members.','Los mensajes no están disponibles actualmente entre estos miembros.')}</div>:<form action={sendDirectMessage} className="card composer"><input type="hidden" name="conversation_id" value={conversationId}/><input type="hidden" name="lang" value={es?'es':'en'}/><textarea name="body" required maxLength={5000} placeholder={t(`Message ${targetName}…`,`Mensaje para ${targetName}…`)}/><button className="btn">{t('Send','Enviar')}</button></form>}

    <details className="card" style={{padding:16,marginTop:14}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Safety & privacy','Seguridad y privacidad')}</summary><div style={{display:'grid',gap:10,marginTop:14}}><div className="privacy-box"><LockKeyhole size={13}/> {t('Leadership does not have blanket access to this conversation. A specific message becomes available to authorized moderation only when it is reported.','Liderazgo no tiene acceso general a esta conversación. Un mensaje específico queda disponible para moderación autorizada solo cuando se reporta.')}</div><div>{blockedByMe?<form action={unblockMember}><input type="hidden" name="target_user_id" value={targetId}/><input type="hidden" name="conversation_id" value={conversationId}/><input type="hidden" name="lang" value={es?'es':'en'}/><button className="ghost"><Unlock size={13}/> {t('Unblock member','Desbloquear miembro')}</button></form>:<form action={blockMember}><input type="hidden" name="target_user_id" value={targetId}/><input type="hidden" name="conversation_id" value={conversationId}/><input type="hidden" name="lang" value={es?'es':'en'}/><button className="ghost"><Ban size={13}/> {t('Block member','Bloquear miembro')}</button></form>}</div></div></details>
  </div></main>
}