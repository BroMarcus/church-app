import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,Bell,BriefcaseBusiness,FileCheck2,HandHeart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { markAllRead,markRead } from './actions'
import './notifications.css'

const icon=(type:string)=>{switch(type){case'team_assignment':return <BriefcaseBusiness size={17}/>;case'ministry_application':return <HandHeart size={17}/>;case'document_review':return <FileCheck2 size={17}/>;case'credential_earned':return <Award size={17}/>;default:return <Bell size={17}/>}}

export default async function NotificationsPage(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:notifications}=await supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(100)
  const unread=(notifications??[]).filter((n:any)=>!n.read_at).length
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Notifications</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="card notifications-hero"><div><div className="pill">INBOX</div><h1>What needs your attention.</h1><p className="muted">Schedules, ministry updates, credentials and important account activity.</p></div>{unread>0&&<form action={markAllRead}><button className="ghost">Mark all read</button></form>}</section>
    <section className="notification-list">{(notifications??[]).map((n:any)=><article className={`card notification-card ${n.read_at?'':'unread'}`} key={n.id}><div className="notification-copy"><div className="notification-icon">{icon(n.notification_type)}</div><div><h3>{!n.read_at&&<span className="unread-dot" style={{marginRight:7}}/>}{n.title}</h3>{n.body&&<p>{n.body}</p>}<div className="notification-meta">{String(n.notification_type).replaceAll('_',' ')} • {new Date(n.created_at).toLocaleString()}</div></div></div><div className="notification-actions">{n.href&&<Link className="ghost" href={n.href}>Open</Link>}{!n.read_at&&<form action={markRead}><input type="hidden" name="notification_id" value={n.id}/><button className="ghost">Mark read</button></form>}</div></article>)}{!notifications?.length&&<div className="card empty"><h3>You’re all caught up.</h3><p className="muted">Important Kingdom Network activity will appear here.</p></div>}</section>
  </main>
}
