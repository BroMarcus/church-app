import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell,BookOpen,FileCheck,HandHeart,MessageCircle,MessageSquareText,ShieldAlert,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveNotificationPreferences } from './actions'
import './preferences.css'

const items=[
  ['direct_messages','Private Messages','New private member messages.',MessageCircle],
  ['church_updates','Church Updates','Local official church announcements that leadership chooses to alert members about.',MessageSquareText],
  ['network_updates','District / Organization','District and organization updates that leadership chooses to alert members about.',MessageSquareText],
  ['groups','Groups','Join requests and group-related workflow alerts.',Users],
  ['serving','Serving & Teams','Team assignments and ministry-application status changes.',HandHeart],
  ['documents','Documents','Document verification / review status.',FileCheck],
  ['learning','Learning','Credentials and learning-related achievements that create notifications.',BookOpen],
  ['pastoral_care','Pastoral Care','Updates related to your private pastoral-care request.',HandHeart],
  ['community','Community','Comments and interaction alerts tied to your community posts.',MessageCircle]
] as const

export default async function NotificationPreferencesPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:prefs}=await supabase.from('notification_preferences').select('*').eq('user_id',userId).maybeSingle()
  const on=(key:string)=>prefs?Boolean((prefs as any)[key]):true

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">My Account • Notifications</div></div><div className="row"><Link className="ghost" href="/notifications">Notification Inbox</Link><Link className="ghost" href="/account/privacy">Privacy</Link><Link className="ghost" href="/">← Home</Link></div></header>
    <section className="prefs-hero card"><div><div className="pill">NOTIFICATION PREFERENCES</div><h1>Choose what should interrupt you.</h1><p className="muted">Mute categories you do not need while keeping Kingdom Network’s underlying records/workflows intact.</p></div><div className="hero-stat"><Bell size={24}/><span>In-app alerts</span></div></section>
    {query.saved&&<div className="notice success">Notification preferences saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <section className="card prefs-card"><div className="pill">CATEGORIES</div><form action={saveNotificationPreferences}><div className="prefs-grid">{items.map(([key,title,body,Icon])=><div className="pref-item" key={key}><label><input type="checkbox" name={key} defaultChecked={on(key)}/><div><strong><Icon size={12}/> {title}</strong><span>{body}</span></div></label></div>)}</div><button className="btn" style={{marginTop:14}}>Save notification preferences</button></form></section>

    <section className="card prefs-note"><div className="pill">SAFETY ALERTS</div><p><ShieldAlert size={12}/> Certain safety/moderation alerts for authorized leadership—such as a member reporting a specific private message—are not controlled by these personal mute switches. They stay visible to the people responsible for reviewing them.</p></section>
  </main>
}
