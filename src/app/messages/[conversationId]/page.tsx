import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Ban,LockKeyhole,MessageCircle,ShieldAlert,Unlock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { blockMember,reportDirectMessage,sendDirectMessage,unblockMember } from '../actions'
import '../messages.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function MessageThreadPage({params,searchParams}:{params:Promise<{conversationId:string}>;searchParams:Promise<{sent?:string;blocked?:string;unblocked?:string;reported?:string;error?:string}>}){
  const [{conversationId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:conversation}=await supabase.from('direct_conversations').select('id,church_id,user_a,user_b,created_at').eq('id',conversationId).eq('church_id',membership.church_id).maybeSingle()
  if(!conversation)redirect('/messages?error='+encodeURIComponent('Conversation not found or unavailable.'))
  const targetId=conversation.user_a===userId?conversation.user_b:conversation.user_a
  const [{data:target},{data:messages},{data:blockRow}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,first_name,last_name').eq('id',targetId).single(),
    supabase.from('direct_messages').select('id,sender_id,body,created_at').eq('conversation_id',conversationId).order('created_at').limit(1000),
    supabase.from('member_blocks').select('blocked_id').eq('church_id',membership.church_id).eq('blocker_id',userId).eq('blocked_id',targetId).maybeSingle()
  ])
  const targetName=personName(target)
  const blockedByMe=Boolean(blockRow)
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  return <main className="shell"><div className="thread-shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Private Messages</div></div><Link className="ghost" href="/messages">← Inbox</Link></header>
    <section className="card thread-head"><div className="thread-person"><div className="avatar">{targetName.slice(0,1).toUpperCase()}</div><div><h1>{targetName}</h1><span><LockKeyhole size={11}/> Private one-to-one conversation</span></div></div><div className="thread-actions">{blockedByMe?<form action={unblockMember}><input type="hidden" name="target_user_id" value={targetId}/><input type="hidden" name="conversation_id" value={conversationId}/><button className="ghost"><Unlock size={13}/> Unblock</button></form>:<form action={blockMember}><input type="hidden" name="target_user_id" value={targetId}/><input type="hidden" name="conversation_id" value={conversationId}/><button className="ghost"><Ban size={13}/> Block</button></form>}</div></section>
    {query.sent&&<div className="notice success">Message sent.</div>}{query.blocked&&<div className="notice success">Member blocked. New messages are disabled until you unblock them.</div>}{query.unblocked&&<div className="notice success">Member unblocked.</div>}{query.reported&&<div className="notice success">Message reported to pastoral/church administration for review.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="message-stack">{(messages??[]).map((m:any)=>{const mine=m.sender_id===userId;return <div className={`message-row ${mine?'mine':''}`} key={m.id}><article className="bubble"><p>{m.body}</p><div className="bubble-meta"><span>{mine?'You':targetName}</span><span>{new Date(m.created_at).toLocaleString()}</span></div>{!mine&&<details className="report-details"><summary>Report this message</summary><form action={reportDirectMessage} className="report-form"><input type="hidden" name="message_id" value={m.id}/><input type="hidden" name="conversation_id" value={conversationId}/><input name="reason" required minLength={3} maxLength={1000} placeholder="Why should leadership review this message?"/><button className="ghost"><ShieldAlert size={12}/> Report</button></form></details>}</article></div>})}{!messages?.length&&<div className="card message-empty"><MessageCircle size={22}/><h3>Start the conversation.</h3><p className="muted">Messages sent here stay between the two participants unless a specific message is reported.</p></div>}</section>

    {blockedByMe?<div className="blocked-box"><Ban size={13}/> You blocked this member. Previous messages remain visible, but new messages are disabled until you unblock them.</div>:<form action={sendDirectMessage} className="card composer"><input type="hidden" name="conversation_id" value={conversationId}/><textarea name="body" required maxLength={5000} placeholder={`Message ${targetName}…`}/><button className="btn">Send</button></form>}
    <div className="privacy-box"><LockKeyhole size={13}/> Leadership does not have blanket access to this conversation. If you report a specific message, Kingdom Network preserves that message and your report reason for authorized moderation.</div>
  </div></main>
}
