import Link from 'next/link'
import { AlertTriangle,BarChart3,HeartPulse,TrendingDown,TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const dayMs=86400000
const isoDay=(d:Date)=>d.toISOString().slice(0,10)
const pct=(n:number,d:number)=>d?Math.round((n/d)*100):0
const countIn=(rows:any[],field:string,start:number,end:number)=>rows.filter(r=>{const t=new Date(r[field]).getTime();return t>=start&&t<end}).length

function Trend({label,current,previous}:{label:string;current:number;previous:number}){
  const delta=current-previous
  return <div className="card" style={{padding:14}}><div className="small muted">{label}</div><strong style={{display:'block',fontSize:'1.55rem',margin:'4px 0'}}>{current}</strong><span className="small" style={{display:'inline-flex',alignItems:'center',gap:4}}>{delta>0?<TrendingUp size={13}/>:delta<0?<TrendingDown size={13}/>:<BarChart3 size={13}/>} {delta>0?'+':''}{delta} vs prior period</span></div>
}

function Bars({values}:{values:number[]}){
  const max=Math.max(1,...values)
  return <div aria-label="12 week activity trend" style={{height:90,display:'flex',alignItems:'end',gap:5,marginTop:12}}>{values.map((value,i)=><div key={i} title={`Week ${i+1}: ${value}`} style={{flex:1,minWidth:5,height:`${Math.max(value?10:3,Math.round((value/max)*100))}%`,background:'var(--accent)',borderRadius:'5px 5px 2px 2px',opacity:value?1:.25}}/>)}</div>
}

export async function HealthTrends({churchId}:{churchId:string}){
  const supabase=await createClient()
  const now=Date.now(),today=new Date()
  const yearAgoIso=isoDay(new Date(now-365*dayMs))
  const [{data:members},{data:milestones},{data:groups},{data:outreach}]=await Promise.all([
    supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('status','active'),
    supabase.from('member_milestones').select('user_id,baptized,holy_ghost_received,first_steps_status,soul_winning_status,bible_study_teacher_status,timothys_status').eq('church_id',churchId),
    supabase.from('groups').select('id').eq('church_id',churchId).eq('active',true),
    supabase.from('outreach_contacts').select('created_at,stage').eq('church_id',churchId).gte('created_at',new Date(now-365*dayMs).toISOString())
  ])
  const groupIds=(groups??[]).map((g:any)=>g.id)
  let reportRows:any[]=[]
  if(groupIds.length){const {data}=await supabase.from('group_reports').select('group_id,meeting_date,attendance_count,first_time_guests,prayer_needs,issues_notes').in('group_id',groupIds).gte('meeting_date',yearAgoIso).order('meeting_date');reportRows=data??[]}
  const memberIds=new Set((members??[]).map((m:any)=>m.user_id)),rows=(milestones??[]).filter((m:any)=>memberIds.has(m.user_id)),total=memberIds.size
  const gaps=[
    ['Baptism record',rows.filter((m:any)=>m.baptized===true).length],
    ['Holy Ghost record',rows.filter((m:any)=>m.holy_ghost_received===true).length],
    ['First Steps complete',rows.filter((m:any)=>m.first_steps_status==='completed').length],
    ['Soul Winning complete',rows.filter((m:any)=>m.soul_winning_status==='completed').length],
    ['Bible Study Teacher approved',rows.filter((m:any)=>m.bible_study_teacher_status==='approved').length],
    ['Timothys complete',rows.filter((m:any)=>m.timothys_status==='completed').length]
  ].map(([label,value])=>({label:String(label),value:Number(value),missing:Math.max(0,total-Number(value))})).sort((a,b)=>b.missing-a.missing)

  const outreachRows=outreach??[]
  const weekNow=countIn(reportRows,'meeting_date',now-7*dayMs,now+dayMs),weekPrev=countIn(reportRows,'meeting_date',now-14*dayMs,now-7*dayMs)
  const monthNow=countIn(outreachRows,'created_at',now-30*dayMs,now+dayMs),monthPrev=countIn(outreachRows,'created_at',now-60*dayMs,now-30*dayMs)
  const quarterGuests=reportRows.filter((r:any)=>new Date(`${r.meeting_date}T12:00:00`).getTime()>=now-90*dayMs).reduce((s:number,r:any)=>s+Number(r.first_time_guests||0),0)
  const priorQuarterGuests=reportRows.filter((r:any)=>{const t=new Date(`${r.meeting_date}T12:00:00`).getTime();return t>=now-180*dayMs&&t<now-90*dayMs}).reduce((s:number,r:any)=>s+Number(r.first_time_guests||0),0)
  const yearAttendance=reportRows.reduce((s:number,r:any)=>s+Number(r.attendance_count||0),0)
  const weekly=Array.from({length:12},(_,index)=>{
    const end=now-(11-index)*7*dayMs+dayMs,start=end-7*dayMs
    return reportRows.filter((r:any)=>{const t=new Date(`${r.meeting_date}T12:00:00`).getTime();return t>=start&&t<end}).reduce((s:number,r:any)=>s+Number(r.attendance_count||0),0)
  })
  const recentNeeds=reportRows.filter((r:any)=>new Date(`${r.meeting_date}T12:00:00`).getTime()>=now-30*dayMs&&(r.prayer_needs||r.issues_notes)).slice(-6).reverse()

  return <section style={{display:'grid',gap:18,marginBottom:18}}>
    <section className="card" style={{padding:18}}><div className="pill">TREND DIRECTION</div><h2>See movement over time, not just today’s totals.</h2><p className="small muted">These are operational ministry indicators from stored reports and outreach records. They do not assign a spiritual “health score.”</p><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10,marginTop:12}}><Trend label="Group meetings • 7 days" current={weekNow} previous={weekPrev}/><Trend label="New outreach contacts • 30 days" current={monthNow} previous={monthPrev}/><Trend label="First-time guests • 90 days" current={quarterGuests} previous={priorQuarterGuests}/><div className="card" style={{padding:14}}><div className="small muted">Reported attendance entries • 12 months</div><strong style={{display:'block',fontSize:'1.55rem',margin:'4px 0'}}>{yearAttendance}</strong><span className="small">From Friendship Group reports</span></div></div><div style={{marginTop:16}}><strong>12-week reported attendance trend</strong><Bars values={weekly}/><div className="row small muted" style={{justifyContent:'space-between'}}><span>12 weeks ago</span><span>{today.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</span></div></div></section>

    <section className="card" style={{padding:18}}><div className="pill">PATHWAY GAPS</div><h2>Where verified records show the biggest unfinished areas.</h2><p className="small muted">A missing record can mean the milestone has not happened, has not been entered, or still needs verification. This panel is a follow-up aid, not a judgment about a person.</p><div style={{display:'grid',gap:10,marginTop:12}}>{gaps.slice(0,4).map(g=><div key={g.label} style={{display:'grid',gridTemplateColumns:'minmax(150px,1fr) minmax(120px,2fr) auto',gap:10,alignItems:'center'}}><span>{g.label}</span><div style={{height:8,background:'var(--line)',borderRadius:999,overflow:'hidden'}}><div style={{height:'100%',width:`${pct(g.value,total)}%`,background:'var(--accent)'}}/></div><strong>{g.value}/{total}</strong></div>)}</div></section>

    <section className="card" style={{padding:18}}><div className="pill">PASTORAL SIGNALS FROM GROUP REPORTS</div><h2>Prayer needs and issues reported in the last 30 days.</h2>{recentNeeds.length?<div style={{display:'grid',gap:10,marginTop:12}}>{recentNeeds.map((r:any,i:number)=><Link key={`${r.group_id}-${r.meeting_date}-${i}`} href={`/groups/${r.group_id}`} className="card" style={{padding:13,textDecoration:'none'}}><div className="row" style={{alignItems:'flex-start',gap:10}}>{r.issues_notes?<AlertTriangle size={17}/>:<HeartPulse size={17}/>}<div><strong>{new Date(`${r.meeting_date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</strong>{r.prayer_needs&&<div className="small muted" style={{marginTop:4}}><strong>Prayer:</strong> {r.prayer_needs}</div>}{r.issues_notes&&<div className="small muted" style={{marginTop:4}}><strong>Issue:</strong> {r.issues_notes}</div>}</div></div></Link>)}</div>:<p className="muted">No prayer needs or issue notes were recorded in Friendship Group reports during the last 30 days.</p>}</section>
  </section>
}
