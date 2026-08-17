import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,BookOpen,Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startCourse } from './actions'
import './learning.css'

export default async function LearningPage({searchParams}:{searchParams:Promise<{error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [{data:courses},{data:enrollments}]=await Promise.all([
    supabase.from('courses').select('*').eq('published',true).order('created_at'),
    supabase.from('course_enrollments').select('course_id,progress,completed_at,credential_earned').eq('user_id',userId)
  ])
  const em=new Map((enrollments??[]).map((e:any)=>[e.course_id,e]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const completed=(enrollments??[]).filter((e:any)=>e.credential_earned).length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Learning</div></div><Link className="ghost" href="/">← Home</Link></header>
    <section className="learning-hero card"><div><div className="pill">LEARNING CENTER</div><h1>Grow on purpose.</h1><p className="muted">Courses, training, progress and qualifications in one place.</p></div><div className="learning-stat"><strong>{completed}</strong><span>credentials earned</span></div></section>
    {params.error&&<div className="notice error">{params.error}</div>}
    <section className="course-grid">{(courses??[]).map((course:any)=>{const enrollment:any=em.get(course.id);const progress=enrollment?.progress??0;return <article className="card course-card" key={course.id}><div className="pill">{course.category||'COURSE'}</div><h2>{course.title}</h2><p>{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hrs':'Self paced'}</span><span><Award size={13}/> {course.badge_name||'Completion'}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% complete</span><span>{enrollment?.credential_earned?'Credential earned':enrollment?'In progress':'Not started'}</span></div>{enrollment?<Link className="btn" href={`/learning/${course.id}`} style={{display:'inline-block',marginTop:14}}>{progress?'Continue course':'Open course'}</Link>:<form action={startCourse}><input type="hidden" name="course_id" value={course.id}/><button className="btn" style={{marginTop:14}}><BookOpen size={15}/> Start course</button></form>}</article>})}{!courses?.length&&<div className="card empty"><h3>No published courses yet.</h3><p className="muted">Training added by church leadership will appear here.</p></div>}</section>
  </main>
}
