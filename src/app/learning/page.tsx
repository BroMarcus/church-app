import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,BookOpen,Clock,Languages,Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { startCourse } from './actions'
import './learning.css'

const audienceLabel=(v?:string|null)=>({new_convert:'New Convert',member:'Member',teacher_training:'Teacher Training',leadership:'Leadership',general:'General'} as Record<string,string>)[v??'general']??String(v??'general').replaceAll('_',' ')

export default async function LearningPage({searchParams}:{searchParams:Promise<{error?:string;lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':params.lang==='all'?'all':'en'
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const [{data:allCourses},{data:enrollments}]=await Promise.all([
    supabase.from('courses').select('*').eq('published',true).order('created_at'),
    supabase.from('course_enrollments').select('course_id,progress,completed_at,credential_earned,curriculum_version').eq('user_id',userId)
  ])
  const courses=(allCourses??[]).filter((c:any)=>lang==='all'||(c.language_code??'en')===lang)
  const em=new Map((enrollments??[]).map((e:any)=>[e.course_id,e]))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const completed=(enrollments??[]).filter((e:any)=>e.credential_earned).length
  const canManage=['minister','pastor','church_admin'].includes(membership.role)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Learning</div></div><div className="row">{canManage&&<Link className="ghost" href="/learning/admin"><Settings2 size={14}/> Learning Studio</Link>}<Link className="ghost" href="/">← Home</Link></div></header>
    <section className="learning-hero card"><div><div className="pill">LEARNING CENTER</div><h1>{lang==='es'?'Crece con propósito.':'Grow on purpose.'}</h1><p className="muted">{lang==='es'?'Cursos, capacitación, progreso y preparación ministerial en un solo lugar.':'Courses, training, progress and qualifications in one place.'}</p></div><div className="learning-stat"><strong>{completed}</strong><span>{lang==='es'?'credenciales obtenidas':'credentials earned'}</span></div></section>
    <div className="row" style={{gap:8,marginBottom:16,flexWrap:'wrap'}}><Languages size={16}/><Link className={lang==='en'?'btn':'ghost'} href="/learning?lang=en">English</Link><Link className={lang==='es'?'btn':'ghost'} href="/learning?lang=es">Español</Link><Link className={lang==='all'?'btn':'ghost'} href="/learning?lang=all">All</Link></div>
    {params.error&&<div className="notice error">{params.error}</div>}
    <section className="course-grid">{courses.map((course:any)=>{const enrollment:any=em.get(course.id);const progress=enrollment?.progress??0;const isEs=(course.language_code??'en')==='es';return <article className="card course-card" key={course.id}><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.category||'COURSE'}</div><div className="pill">{isEs?'ESPAÑOL':'ENGLISH'}</div><div className="pill">{audienceLabel(course.audience_level).toUpperCase()}</div></div><h2>{course.title}</h2><p>{course.description}</p><div className="course-meta"><span><Clock size={13}/> {course.estimated_minutes?Math.round(course.estimated_minutes/60)+' hrs':'Self paced'}</span><span><Award size={13}/> {course.badge_name||'Completion'}</span><span>v{course.curriculum_version??'1.0'}</span></div><div className="progress-track"><div className="progress-fill" style={{width:`${progress}%`}}/></div><div className="progress-row"><span>{progress}% complete</span><span>{enrollment?.credential_earned?'Credential earned':enrollment?'In progress':'Not started'}</span></div>{enrollment?<Link className="btn" href={`/learning/${course.id}`} style={{display:'inline-block',marginTop:14}}>{progress?'Continue course':'Open course'}</Link>:<form action={startCourse}><input type="hidden" name="course_id" value={course.id}/><button className="btn" style={{marginTop:14}}><BookOpen size={15}/> {isEs?'Comenzar curso':'Start course'}</button></form>}</article>})}{!courses.length&&<div className="card empty"><h3>{lang==='es'?'Todavía no hay cursos publicados en español.':'No published courses in this view yet.'}</h3><p className="muted">{lang==='es'?'Los cursos en español aparecerán aquí cuando el liderazgo los publique.':'Training added by church leadership will appear here.'}</p></div>}</section>
  </main>
}
