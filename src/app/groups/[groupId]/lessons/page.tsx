import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,CheckCircle2,ChevronRight,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { assignGroupLesson,cancelGroupLessonAssignment } from './actions'
import '../../groups.css'

const fmtDate=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})
const list=(v:any)=>Array.isArray(v)?v:[]

export default async function GroupLessonsPage({params,searchParams}:{params:Promise<{groupId:string}>;searchParams:Promise<{assigned?:string;cancelled?:string;error?:string}>}){
  const [{groupId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const {data:churchMembership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!churchMembership?.church_id)redirect('/')
  const {data:group}=await supabase.from('groups').select('id,name,description,group_type,leader_id,meeting_day,meeting_time').eq('id',groupId).eq('church_id',churchMembership.church_id).single()
  if(!group)redirect('/groups?error='+encodeURIComponent('Group not found.'))

  const {data:myGroupMembership}=await supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  const canManage=group.leader_id===userId||myGroupMembership?.role==='leader'||['minister','pastor','church_admin'].includes(churchMembership.role)
  const canView=canManage||Boolean(myGroupMembership)
  if(!canView)redirect(`/groups/${groupId}?error=`+encodeURIComponent('Join this group to view its weekly lesson.'))

  const [{data:lessons},{data:assignmentRows}]=await Promise.all([
    supabase.from('friendship_group_lessons').select('id,lesson_number,title,opening_question,content,source_label').eq('church_id',churchMembership.church_id).eq('published',true).order('lesson_number'),
    supabase.from('group_lesson_assignments').select('id,lesson_id,scheduled_for,status,teaching_note,created_at,updated_at').eq('group_id',groupId).neq('status','cancelled').order('scheduled_for',{ascending:false}).limit(16)
  ])
  const lessonRows:any[]=lessons??[]
  const assignments:any[]=assignmentRows??[]
  const lessonMap=new Map(lessonRows.map((l:any)=>[l.id,l]))
  const today=new Date().toISOString().slice(0,10)
  const upcoming=assignments.filter((a:any)=>a.status==='scheduled'&&a.scheduled_for>=today).sort((a:any,b:any)=>a.scheduled_for.localeCompare(b.scheduled_for))
  const recentCompleted=assignments.filter((a:any)=>a.status==='completed').sort((a:any,b:any)=>b.scheduled_for.localeCompare(a.scheduled_for))
  const activeAssignment=upcoming[0]??recentCompleted[0]??null
  const activeLesson=activeAssignment?lessonMap.get(activeAssignment.lesson_id):null
  const church=Array.isArray(churchMembership.churches)?churchMembership.churches[0]:churchMembership.churches as any

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Friendship Group Lessons</div></div><div className="row"><Link className="ghost" href={`/groups/${groupId}`}>← {group.name}</Link><Link className="ghost" href="/groups">All groups</Link></div></header>

    <section className="group-detail-hero card"><div><div className="pill">52-LESSON LIBRARY</div><h1>{group.name} Lessons</h1><p className="muted">Choose a source-backed weekly lesson, teach it with your group, and let Kingdom Network connect it to the meeting report automatically.</p><div className="group-detail-meta"><span><BookOpen size={15}/>{lessonRows.length} lessons ready</span><span><CalendarDays size={15}/>{group.meeting_day||'Schedule TBD'} {group.meeting_time?String(group.meeting_time).slice(0,5):''}</span><span><Users size={15}/>Member lesson view</span></div></div>{canManage&&<div className="leader-badge">Leader lesson tools</div>}</section>

    {query.assigned&&<div className="notice success">This week’s lesson is scheduled. Members can open it here now.</div>}
    {query.cancelled&&<div className="notice success">Scheduled lesson cancelled.</div>}
    {query.error&&<div className="notice error">{query.error}</div>}

    {activeLesson?<section className="card group-section" style={{marginBottom:16}}><div className="section-heading"><div><div className="pill">{activeAssignment.status==='completed'?'MOST RECENT LESSON':'THIS WEEK’S LESSON'}</div><h2>Lesson {activeLesson.lesson_number} — {activeLesson.title}</h2></div><span className="small muted"><CalendarDays size={12}/> {fmtDate(activeAssignment.scheduled_for)}</span></div>
      {activeAssignment.teaching_note&&<div className="notice" style={{marginBottom:12}}><strong>Leader note:</strong> {activeAssignment.teaching_note}</div>}
      {activeLesson.opening_question&&<div className="card" style={{padding:14,marginBottom:12,background:'rgba(255,255,255,.03)'}}><div className="pill">OPENING QUESTION</div><p style={{fontSize:'1.08rem',marginBottom:0}}>{activeLesson.opening_question}</p></div>}
      <div style={{display:'grid',gap:14}}>{list(activeLesson.content?.sections).map((section:any,i:number)=><div key={i}><h3 style={{margin:'0 0 6px'}}>{section.heading}</h3><p className="muted" style={{margin:0,lineHeight:1.65}}>{section.body}</p></div>)}</div>
      {list(activeLesson.content?.scripture_refs).length>0&&<div style={{marginTop:16}}><strong>Key Scriptures</strong><p className="muted">{list(activeLesson.content.scripture_refs).join(' • ')}</p></div>}
      {list(activeLesson.content?.leader_discussion_prompts).length>0&&<div className="card" style={{padding:14,marginTop:14,background:'rgba(255,255,255,.03)'}}><div className="pill">GROUP DISCUSSION</div><ol>{list(activeLesson.content.leader_discussion_prompts).map((p:any,i:number)=><li key={i}>{String(p)}</li>)}</ol></div>}
      {canManage&&list(activeLesson.content?.leadership_review_flags).length>0&&<details style={{marginTop:14}}><summary style={{cursor:'pointer',fontWeight:800}}>Leadership review notes</summary><ul>{list(activeLesson.content.leadership_review_flags).map((p:any,i:number)=><li key={i}>{String(p)}</li>)}</ul></details>}
      <p className="small muted" style={{marginBottom:0}}>Source: {activeLesson.source_label}</p>
    </section>:<section className="card group-section" style={{marginBottom:16}}><div className="pill">THIS WEEK’S LESSON</div><h2>No lesson assigned yet</h2><p className="muted">{canManage?'Choose the meeting date and lesson below.':'Your group leader has not assigned the next lesson yet.'}</p></section>}

    {canManage&&<section className="card group-section" style={{marginBottom:16}}><div className="pill">LEADER TOOL</div><h2>Choose this week’s lesson</h2><p className="muted">Schedule the lesson for the same date you will use on the meeting report. Kingdom Network will attach the lesson to that report automatically and mark the assignment complete.</p><form action={assignGroupLesson} className="group-settings-grid"><input type="hidden" name="group_id" value={groupId}/><label><span>Meeting date</span><input type="date" name="scheduled_for" defaultValue={upcoming[0]?.scheduled_for??today} required/></label><label className="wide"><span>Lesson</span><select name="lesson_id" defaultValue={upcoming[0]?.lesson_id??''} required><option value="" disabled>Choose one of the 52 lessons</option>{lessonRows.map((lesson:any)=><option value={lesson.id} key={lesson.id}>Lesson {lesson.lesson_number} — {lesson.title}</option>)}</select></label><label className="wide"><span>Leader note (optional)</span><textarea name="teaching_note" rows={2} placeholder="Special focus, reminder, or group-specific note" defaultValue={upcoming[0]?.teaching_note??''}/></label><button className="btn wide"><CalendarDays size={15}/> Assign this lesson</button></form></section>}

    {canManage&&assignments.length>0&&<section className="card group-section" style={{marginBottom:16}}><div className="pill">LESSON SCHEDULE</div><h2>Recent & upcoming assignments</h2><div className="report-history">{assignments.slice(0,10).map((a:any)=>{const lesson=lessonMap.get(a.lesson_id);return <article className="report-card" key={a.id}><div className="report-top"><strong>{fmtDate(a.scheduled_for)}</strong><span>{lesson?`Lesson ${lesson.lesson_number} — ${lesson.title}`:'Lesson unavailable'}</span></div><div className="row" style={{justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><span className={a.status==='completed'?'complete-chip':'role-chip'}>{a.status==='completed'?<><CheckCircle2 size={12}/> Completed</>:a.status}</span>{a.status==='scheduled'&&<form action={cancelGroupLessonAssignment}><input type="hidden" name="group_id" value={groupId}/><input type="hidden" name="assignment_id" value={a.id}/><button className="ghost">Cancel</button></form>}</div></article>})}</div></section>}

    <section className="card group-section"><div className="section-heading"><div><div className="pill">LESSON LIBRARY</div><h2>Browse all 52 lessons</h2></div><span className="small muted">Open a lesson to preview it</span></div><div style={{display:'grid',gap:8}}>{lessonRows.map((lesson:any)=><details className="card" style={{padding:14,background:'rgba(255,255,255,.025)'}} key={lesson.id}><summary style={{cursor:'pointer',fontWeight:800}}>Lesson {lesson.lesson_number} — {lesson.title}</summary><div style={{marginTop:12}}>{lesson.opening_question&&<p><strong>Opening question:</strong> {lesson.opening_question}</p>}<p className="muted">{lesson.content?.summary}</p><div style={{display:'grid',gap:10}}>{list(lesson.content?.sections).map((section:any,i:number)=><div key={i}><strong>{section.heading}</strong><p className="small muted" style={{margin:'4px 0 0'}}>{section.body}</p></div>)}</div>{list(lesson.content?.scripture_refs).length>0&&<p className="small muted"><strong>Scriptures:</strong> {list(lesson.content.scripture_refs).join(' • ')}</p>}{canManage&&list(lesson.content?.leadership_review_flags).length>0&&<div className="notice" style={{marginTop:10}}><strong>Leadership review:</strong><ul>{list(lesson.content.leadership_review_flags).map((x:any,i:number)=><li key={i}>{String(x)}</li>)}</ul></div>}</div></details>)}</div>
      <div className="row" style={{marginTop:16}}><Link className="ghost" href={`/groups/${groupId}`}>Back to group <ChevronRight size={14}/></Link></div>
    </section>
  </main>
}
