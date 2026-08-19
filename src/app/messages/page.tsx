import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Languages,LockKeyhole,MessageCircle,MessageSquareWarning,Plus,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startConversation } from './actions'
import './messages.css'

const personName=(p:any,fallback:string)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||fallback

export default async function MessagesPage({searchParams}:{searchParams:Promise<{error?:string;lang?:string;new?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en
  const l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const churchId=membership.church_id,church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const [{data:conversations},{data:members}]=await Promise.all([
    supabase.from('direct_conversations').select('id,user_a,user_b,updated_at').eq('church_id',churchId).order('updated_at',{ascending:false}),
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active')
  ])
  const rows=conversations??[],otherIds=rows.map((c:any)=>c.user_a===userId?c.user_b:c.user_a),allMemberIds=(members??[]).map((m:any)=>m.user_id).filter((id:string)=>id!==userId),profileIds=Array.from(new Set([...otherIds,...allMemberIds]))
  let profiles:any[]=[];if(profileIds.length){const r=await supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',profileIds);profiles=r.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p])),conversationIds=rows.map((c:any)=>c.id)
  let messages:any[]=[];if(conversationIds.length){const r=await supabase.from('direct_messages').select('conversation_id,sender_id,body,created_at').in('conversation_id',conversationIds).order('created_at',{ascending:false}).limit(500);messages=r.data??[]}
  const latest=new Map<string,any>();for(const m of messages)if(!latest.has(m.conversation_id))latest.set(m.conversation_id,m)
  const options=allMemberIds.map((id:string)=>({id,name:personName(pm.get(id),t('Church member','Miembro de la iglesia'))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Messages','Mensajes')}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/messages?lang=en">English</Link><Link className="ghost" href="/messages?lang=es">Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href="/">← {t('Home','Inicio')}</Link></div></header>

    <section className="messages-hero card"><div><div className="pill">{t('PRIVATE MESSAGES','MENSAJES PRIVADOS')}</div><h1>{t('Stay connected.','Mantente conectado.')}</h1><p className="muted">{t('Simple one-to-one messages with active members of your local church.','Mensajes sencillos uno a uno con miembros activos de tu iglesia local.')}</p></div><div className="hero-stat"><MessageCircle size={23}/><span>{rows.length} {rows.length===1?t('conversation','conversación'):t('conversations','conversaciones')}</span></div></section>
    {query.error&&<div className="notice error">{query.error}</div>}

    <section className="card" style={{padding:18,marginBottom:18}}><div className="row" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><div className="pill">{t('INBOX','BANDEJA')}</div><h2 style={{margin:'8px 0 4px'}}>{t('Your conversations','Tus conversaciones')}</h2></div><Link className="btn" href={l('/messages?new=1')}><Plus size={14}/> {t('New message','Nuevo mensaje')}</Link></div></section>

    {query.new&&<details className="card" style={{padding:18,marginBottom:18}} open><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Start a new conversation','Iniciar una conversación')}</summary><form action={startConversation} style={{display:'grid',gap:12,marginTop:14}}><input type="hidden" name="lang" value={es?'es':'en'}/><select name="target_user_id" required defaultValue=""><option value="" disabled>{t('Choose a church member','Elige un miembro de la iglesia')}</option>{options.map((o:any)=><option value={o.id} key={o.id}>{o.name}</option>)}</select><button className="btn"><Plus size={14}/> {t('Start conversation','Iniciar conversación')}</button></form></details>}

    <section className="conversation-list">{rows.map((c:any)=>{const otherId=c.user_a===userId?c.user_b:c.user_a;const name=personName(pm.get(otherId),t('Church member','Miembro de la iglesia'));const last=latest.get(c.id);return <Link className="card conversation-card" href={l(`/messages/${c.id}`)} key={c.id}><div className="avatar">{name.slice(0,1).toUpperCase()}</div><div className="conversation-copy"><strong>{name}</strong><p>{last?`${last.sender_id===userId?t('You: ','Tú: '):''}${last.body}`:t('Conversation started. Send the first message.','Conversación iniciada. Envía el primer mensaje.')}</p></div><time className="conversation-time">{new Date(last?.created_at??c.updated_at).toLocaleDateString(es?'es-US':'en-US')}</time></Link>})}{!rows.length&&<div className="card message-empty"><MessageCircle size={24}/><h3>{t('No private messages yet.','Todavía no hay mensajes privados.')}</h3><p className="muted">{t('Tap New Message to start a conversation with another church member.','Toca Nuevo Mensaje para comenzar una conversación con otro miembro de la iglesia.')}</p></div>}</section>

    <details className="card" style={{padding:18,marginTop:20}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('About private messages','Acerca de los mensajes privados')}</summary><div style={{display:'grid',gap:10,marginTop:14}}><div className="privacy-box"><LockKeyhole size={13}/> {t('Messages are readable only by the two participants. Pastors and admins do not have a general inbox into member conversations.','Los mensajes solo pueden ser leídos por los dos participantes. Pastores y administradores no tienen una bandeja general para leer conversaciones.')}</div><div className="privacy-box"><ShieldCheck size={13}/> {t('You can block another person. If you report a specific message, authorized leadership receives only that reported message and your reason.','Puedes bloquear a otra persona. Si reportas un mensaje específico, liderazgo autorizado recibe solo ese mensaje y tu razón.')}</div></div></details>
  </main>
}