import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,CheckCircle2,Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { setModuleComplete,startCourse } from '../actions'
import '../learning.css'

export default async function CoursePage({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:Promise<{saved?:string;error?:string}>}){
  const [{courseId},query]=await Promise.all([params,searchParams])
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:course},{data:modules},{data:enrollment},{data:moduleProgress}]=await Promise.all([
    supabase.from('courses').select('*').eq('id',courseId).eq('published',true).single(),
    supabase.from('course_modules').select('*').eq('course_id',courseId).order('position'),
    supabase.from('course_enrollments').select('*').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('course_module_progress').select('module_id,completed,completed_at').eq('course_id',courseId).eq('user_id',userId)
  ])
  if(!course)redirect('/learning')
  const completeIds=new Set((moduleProgress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
  const progress=enrollment?.progress??0
  const credential=Boolean(enrollment?.credential_earned)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Learning Center</div></div><div className="row"><Link className="ghost" href="/learning">← Learning</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="course-detail-hero card"><div className="pill">{course.category||'COURSE'}</div><h1>{course.title}</h1><p className="muted">{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hours':'Self paced'}</span><span><Award size={13}/> {course.badge_name||'Completion credential'}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% complete</span><span>{completeIds.size}/{modules?.length??0} lessons</span></div></section>
    {query.saved&&<div className="notice success">Lesson progress saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}
    {credential&&<section className="course-complete card"><div className="pill">COMPLETED</div><h2>Credential earned: {course.badge_name||course.title}</h2><p>You completed every lesson in this course. Leadership can use this verified learning record in your discipleship and ministry pathway.</p></section>}
    {!enrollment&&<form action={startCourse} className="card" style={{padding:18,marginBottom:14}}><input type="hidden" name="course_id" value={courseId}/><p className="muted">Start the course to begin tracking lesson completion.</p><button className="btn">Start {course.title}</button></form>}
    <section className="course-list">{(modules??[]).map((module:any)=>{const done=completeIds.has(module.id);const summary=module.content?.summary||'Lesson content will be added by church leadership.';return <article className="card lesson-card" key={module.id}><div className="lesson-number">{module.position}</div><div className="lesson-copy"><h3>{module.title}</h3><p>{summary}</p></div><div className="lesson-status">{done&&<span className="complete-chip"><CheckCircle2 size={12}/> Complete</span>}<form action={setModuleComplete}><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="module_id" value={module.id}/><input type="hidden" name="complete" value={done?'0':'1'}/><button className={done?'ghost':'btn'} disabled={!enrollment}>{done?'Undo':'Mark complete'}</button></form></div></article>})}</section>
  </main>
}
