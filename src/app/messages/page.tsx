import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LockKeyhole,MessageCircle,Plus,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startConversation } from './actions'
import './messages.css'

const personName=(p:any)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Church member'

export default async function MessagesPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const [{data:conversations},{data:members}]=await Promise.all([
    supabase.from('direct_conversations').select('id,user_a,user_b,updated_at').eq('church_id',churchId).order('updated_at',{ascending:false}),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active')
  ])
  const rows=conversations??[]
  const otherIds=rows.map((c:any)=>c.user_a===userId?c.user_b:c.user_a)
  const allMemberIds=(members??[]).map((m:any)=>m.user_id).filter((id:string)=>id!==userId)
  const profileIds=Array.from(new Set([...otherIds,...allMemberIds]))
  let profiles:any[]=[]
  if(profileIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const conversationIds=rows.map((c:any)=>c.id)
  let messages:any[]=[]
  if(conversationIds.length){const r=await supabase.from('direct_messages').select('conversation_id,sender_id,body,created_at').in('conversation_id',conversationIds).order('created_at',{ascending:false}).limit(500);messages=r.data??[]}
  const latest=new Map<string,any>();for(const m of messages)if(!latest.has(m.conversation_id))latest.set(m.conversation_id,m)
  const options=allMemberIds.map((id:string)=>({id,name:personName(pm.get(id))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Private Messages</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="messages-hero card"><div><div className="pill">PRIVATE MESSAGES</div><h1>Stay connected one-to-one.</h1><p className="muted">Direct messages between active members of your local church.</p></div><div className="hero-stat"><MessageCircle size={23}/><span>{rows.length} conversation{rows.length===1?'':'s'}</span></div></section>
    {query.error&&<div className="notice error">{query.error}</div>}

    <div className="messages-layout"><section><div className="section-heading"><div><div className="pill">INBOX</div><h2>Your conversations</h2></div></div><div className="conversation-list">{rows.map((c:any)=>{const otherId=c.user_a===userId?c.user_b:c.user_a;const name=personName(pm.get(otherId));const last=latest.get(c.id);return <Link className="card conversation-card" href={`/messages/${c.id}`} key={c.id}><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div className="conversation-copy"><strong>{name}</strong><p>{last?`${last.sender_id===userId?'You: ':''}${last.body}`:'Conversation started. Send the first message.'}</p></div><time className="conversation-time">{new Date(last?.created_at??c.updated_at).toLocaleDateString()}</time></Link>})}{!rows.length&&<div className="card message-empty"><MessageCircle size={24}/><h3>No private messages yet.</h3><p className="muted">Start a conversation with another active member of your church.</p></div>}</div></section>

    <aside className="card new-message"><div className="pill">NEW MESSAGE</div><h2>Start a conversation</h2><form action={startConversation}><select name="target_user_id" required defaultValue=""><option value="" disabled>Choose a church member</option>{options.map((o:any)=><option value={o.id} key={o.id}>{o.name}</option>)}</select><button className="btn"><Plus size={14}/> Start conversation</button></form><div className="privacy-box"><LockKeyhole size={13}/> Private messages are readable only by the two participants. Pastors and church admins do not have a general inbox into member conversations.</div><div className="privacy-box"><ShieldCheck size={13}/> Members can block another person. If a specific message is reported, leadership receives only that reported message and the reporter’s reason for moderation.</div></aside></div>
  </main>
}
