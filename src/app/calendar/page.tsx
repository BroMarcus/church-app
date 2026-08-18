import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays,Clock,MapPin,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { churchDayNumber,churchMonthShort,formatChurchDay,formatChurchTime } from '@/lib/church-time'
import { createEvent,setRsvp } from './actions'
import './calendar.css'

const gcal=(e:any)=>{const clean=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');const end=e.ends_at?clean(e.ends_at):clean(new Date(new Date(e.starts_at).getTime()+60*60*1000).toISOString());return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${clean(e.starts_at)}/${end}&details=${encodeURIComponent(e.description||'')}&location=${encodeURIComponent(e.location||'')}`}

export default async function CalendarPage({searchParams}:{searchParams:Promise<{created?:string;rsvp?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,district_id,timezone)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const timeZone=church?.timezone||'UTC'
  const canManage=['ministry_leader','minister','pastor','church_admin','district_admin'].includes(membership.role)
  const [{data:events},{data:rsvps}]=await Promise.all([
    supabase.from('events').select('*').gte('starts_at',new Date(Date.now()-24*60*60*1000).toISOString()).order('starts_at').limit(80),
    supabase.from('event_rsvps').select('event_id,user_id,response')
  ])
  const my=new Map((rsvps??[]).filter((r:any)=>r.user_id===userId).map((r:any)=>[r.event_id,r.response]))
  const counts=new Map<string,{going:number;interested:number}>();for(const r of rsvps??[]){const c=counts.get((r as any).event_id)??{going:0,interested:0};if((r as any).response==='going')c.going++;if((r as any).response==='interested')c.interested++;counts.set((r as any).event_id,c)}

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Calendar • {timeZone.replaceAll('_',' ')}</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="calendar-hero card"><div><div className="pill">UNIFIED CALENDAR</div><h1>What’s happening next.</h1><p className="muted">Church, ministry, group and district events in one place.</p></div><div className="hero-stat"><strong>{events?.length??0}</strong><span>upcoming events</span></div></section>
    {query.created&&<div className="notice success">Event created.</div>}{query.rsvp&&<div className="notice success">Your response was saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="calendar-layout"><section className="event-list">{(events??[]).map((e:any)=>{const c=counts.get(e.id)??{going:0,interested:0};const mine=my.get(e.id);return <article className="card event-card" key={e.id}><div className="event-head"><div className="event-main"><div className="event-date"><div><strong>{churchDayNumber(e.starts_at,timeZone)}</strong><span>{churchMonthShort(e.starts_at,timeZone)}</span></div></div><div className="event-copy"><div className="event-type">{e.event_type.replaceAll('_',' ')}</div><h2>{e.title}</h2><p>{e.description||'Church event'}</p><div className="event-meta"><span><CalendarDays size={13}/>{formatChurchDay(e.starts_at,timeZone)}</span><span><Clock size={13}/>{formatChurchTime(e.starts_at,timeZone)}{e.ends_at?` – ${formatChurchTime(e.ends_at,timeZone)}`:''}</span>{e.location&&<span><MapPin size={13}/>{e.location}</span>}</div></div></div></div><div className="event-actions"><form action={setRsvp}><input type="hidden" name="event_id" value={e.id}/><input type="hidden" name="response" value="interested"/><button className={mine==='interested'?'btn':'ghost'}>Interested</button></form><form action={setRsvp}><input type="hidden" name="event_id" value={e.id}/><input type="hidden" name="response" value="going"/><button className={mine==='going'?'btn':'ghost'}>Going</button></form><a className="ghost" href={gcal(e)} target="_blank" rel="noreferrer">Add to Google Calendar</a><span className="rsvp-counts"><Users size={12}/> {c.going} going • {c.interested} interested</span></div></article>})}{!events?.length&&<div className="card calendar-empty"><h3>No upcoming events yet.</h3><p className="muted">Leadership can publish the first church event.</p></div>}</section>

    <aside>{canManage?<section className="card create-event"><div className="pill">LEADERSHIP</div><h2>Create event</h2><p className="small muted">Times are entered in {timeZone.replaceAll('_',' ')}.</p><form action={createEvent}><input type="hidden" name="church_id" value={membership.church_id}/><label className="field"><span>Title</span><input name="title" required/></label><label className="field"><span>Event type</span><select name="event_type" defaultValue="church"><option value="church">Church</option><option value="group">Group</option><option value="ministry">Ministry</option><option value="district">District</option><option value="special_event">Special Event</option><option value="fundraiser">Fundraiser</option></select></label><label className="field"><span>Starts</span><input type="datetime-local" name="starts_at" required/></label><label className="field"><span>Ends</span><input type="datetime-local" name="ends_at"/></label><label className="field"><span>Location</span><input name="location"/></label><label className="field"><span>Description</span><textarea name="description" rows={4}/></label><button className="btn">Publish event</button></form></section>:<section className="card side"><div className="pill">YOUR CALENDAR</div><h3>Respond once, stay connected.</h3><p className="muted">Your Interested/Going choices stay attached to your Kingdom Network account.</p></section>}</aside></div>
  </main>
}
