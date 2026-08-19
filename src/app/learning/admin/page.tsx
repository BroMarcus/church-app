import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,ClipboardPlus,Eye,EyeOff,FileText,PlusCircle,ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { addLesson,addQuestion,createAssessment,toggleCoursePublished } from './actions'
import { AssetUploader } from './asset-uploader'
import { CourseSettings,NewCourseForm } from './course-settings'
import './studio.css'

const by=<T extends Record<string,any>>(rows:T[],key:string)=>{const m=new Map<string,T[]>();for(const row of rows){const k=String(row[key]);const list=m.get(k)??[];list.push(row);m.set(k,list)}return m}
const reviewFlags=(module:any)=>Array.isArray(module?.content?.leadership_review_flags)?module.content.leadership_review_flags.filter(Boolean):[]

export default async function LearningStudio({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  const churchId=membership.church_id
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  const {data:coursesData}=await supabase.from('courses').select('*').eq('church_id',churchId).order('pathway_order').order('created_at',{ascending:false})
  const courses=coursesData??[]
  const courseIds=courses.map((c:any)=>c.id)
  let modules:any[]=[];let assessments:any[]=[]
  if(courseIds.length){
    const [m,a]=await Promise.all([
      supabase.from('course_modules').select('*').in('course_id',courseIds).order('position'),
      supabase.from('course_assessments').select('*').in('course_id',courseIds).order('created_at')
    ])
    modules=m.data??[];assessments=a.data??[]
  }
  const moduleIds=modules.map((m:any)=>m.id);const assessmentIds=assessments.map((a:any)=>a.id)
  let questions:any[]=[];let assets:any[]=[]
  if(assessmentIds.length){const r=await supabase.from('assessment_questions').select('id,assessment_id,position,question_type,prompt,points').in('assessment_id',assessmentIds).order('position');questions=r.data??[]}
  if(moduleIds.length){const r=await supabase.from('course_module_assets').select('*').in('module_id',moduleIds).order('position');assets=r.data??[]}
  const signedAssets=await Promise.all(assets.map(async(asset:any)=>{const r=await supabase.storage.from('learning-assets').createSignedUrl(asset.storage_path,600);return {...asset,url:r.data?.signedUrl??null}}))

  const modulesByCourse=by(modules,'course_id');const assessmentsByCourse=by(assessments,'course_id');const questionsByAssessment=by(questions,'assessment_id');const assetsByModule=by(signedAssets,'module_id')
  const courseById=new Map(courses.map((c:any)=>[c.id,c]))
  const flaggedModules=modules.filter((m:any)=>reviewFlags(m).length>0)
  const notices=[query.created&&'Course draft created.',query.settings&&'Course settings saved.',query.lesson&&'Lesson added.',query.assessment&&'Assessment created.',query.question&&'Question added.',query.published&&'Course publishing status updated.'].filter(Boolean)

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Learning Studio</div></div><div className="row"><Link className="ghost" href="/learning">← Learning</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="studio-hero card"><div><div className="pill">LEARNING STUDIO</div><h1>Build discipleship pathways.</h1><p className="muted">Create bilingual, versioned courses, attach curriculum, build assessments and publish only when leadership is ready.</p></div><div className="row" style={{gap:12,flexWrap:'wrap'}}><div className="hero-stat"><strong>{courses.length}</strong><span>course{courses.length===1?'':'s'} in this church</span></div><div className="hero-stat"><strong>{flaggedModules.length}</strong><span>lesson{flaggedModules.length===1?'':'s'} flagged for review</span></div></div></section>
    {notices.map((n:any)=><div className="notice success studio-notice" key={String(n)}>{n}</div>)}{query.error&&<div className="notice error studio-notice">{query.error}</div>}

    {flaggedModules.length>0&&<section className="card" style={{padding:18,marginBottom:16}}><div className="row" style={{alignItems:'flex-start',gap:12}}><ShieldAlert size={24}/><div style={{width:'100%'}}><div className="pill">CURRICULUM REVIEW QUEUE</div><h2 style={{margin:'8px 0 6px'}}>{flaggedModules.length} lesson{flaggedModules.length===1?'':'s'} need leadership eyes.</h2><p className="muted" style={{marginTop:0}}>Internal review notes stay here for ministers, pastors and church admins. Members see the source-backed lesson material without these editorial notes.</p><div style={{display:'grid',gap:10}}>{flaggedModules.map((module:any)=>{const course:any=courseById.get(module.course_id);const flags=reviewFlags(module);return <article className="card" style={{padding:14,background:'rgba(255,255,255,.025)'}} key={module.id}><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">{course?.title||'Course'}</span><span className="pill">LESSON {module.position}</span></div><h3 style={{margin:'8px 0 6px'}}>{module.title}</h3><ul style={{marginBottom:0}}>{flags.map((flag:any,i:number)=><li key={i}>{String(flag)}</li>)}</ul></article>})}</div></div></div></section>}

    <div className="studio-layout">
      <aside className="card studio-create"><div className="pill">NEW COURSE</div><h2>Create a draft</h2><p className="small muted">Set the language, audience and growth-path stage from the beginning. Draft courses stay hidden from members.</p><NewCourseForm/></aside>

      <section className="studio-list">{courses.map((course:any)=>{const courseModules=modulesByCourse.get(course.id)??[];const courseAssessments=assessmentsByCourse.get(course.id)??[];return <article className="card studio-course" key={course.id}><div className="studio-course-head"><div><div className="row" style={{gap:6,flexWrap:'wrap'}}><div className="pill">{course.pathway_stage?.replaceAll('_',' ')||'FOUNDATION'}</div><div className="pill">{course.language_code==='es'?'ESPAÑOL':'ENGLISH'}</div><div className="pill">v{course.curriculum_version??'1.0'}</div></div><h2>{course.title}</h2><p className="small muted">{course.description||'No description yet.'}</p><span className="mini-count">{courseModules.length} lessons • {courseAssessments.length} assessments • pass {course.passing_score}% • order {course.pathway_order??100}</span></div><div className="studio-actions"><span className={`course-state ${course.published?'live':''}`}>{course.published?'Published':'Draft'}</span><form action={toggleCoursePublished}><input type="hidden" name="course_id" value={course.id}/><input type="hidden" name="published" value={course.published?'0':'1'}/><button className="ghost">{course.published?<><EyeOff size={13}/> Unpublish</>:<><Eye size={13}/> Publish</>}</button></form></div></div>

        <CourseSettings course={course}/>

        <div className="studio-section"><h3><BookOpen size={14}/> Lessons</h3>{courseModules.map((module:any)=>{const moduleAssets=assetsByModule.get(module.id)??[];const flags=reviewFlags(module);return <div className="lesson-editor" key={module.id}><h4>{module.position}. {module.title}</h4><p>{module.content?.summary||'No lesson summary yet.'}</p>{flags.length>0&&<div className="notice" style={{margin:'8px 0'}}><strong><ShieldAlert size={13}/> Leadership review</strong><ul style={{marginBottom:0}}>{flags.map((flag:any,i:number)=><li key={i}>{String(flag)}</li>)}</ul></div>}{module.content?.body&&<p style={{whiteSpace:'pre-wrap',color:'#d9cfe0'}}>{module.content.body}</p>}{moduleAssets.map((asset:any)=><div className="question-row" key={asset.id}><FileText size={11}/> {asset.title} • {String(asset.asset_type).replaceAll('_',' ')} {asset.url&&<a href={asset.url} target="_blank" rel="noreferrer" className="record-link">Open</a>}</div>)}<AssetUploader churchId={churchId} courseId={course.id} moduleId={module.id}/></div>})}
          <form action={addLesson} className="studio-grid" style={{marginTop:10}}><input type="hidden" name="course_id" value={course.id}/><label><span>Lesson title</span><input name="title" required placeholder="Lesson title"/></label><label><span>Short summary</span><input name="summary" placeholder="What this lesson covers"/></label><label className="wide"><span>Lesson text / notes</span><textarea name="body" rows={4} placeholder="Paste or write lesson content here. Files can be attached after saving."/></label><button className="ghost wide"><PlusCircle size={13}/> Add lesson</button></form>
        </div>

        <div className="studio-section"><h3><ClipboardPlus size={14}/> Assessments</h3>{courseAssessments.map((assessment:any)=>{const qs=questionsByAssessment.get(assessment.id)??[];return <div className="assessment-editor" key={assessment.id}><h4>{assessment.title}</h4><div className="assessment-meta">{String(assessment.assessment_type).replaceAll('_',' ')} • pass {assessment.passing_score}% • {assessment.max_attempts?`${assessment.max_attempts} attempts max`:'unlimited attempts'} • {assessment.required?'required':'optional'} • {assessment.published?'published':'draft'} • {qs.length} questions</div>{qs.map((q:any)=><div className="question-row" key={q.id}>{q.position}. {q.prompt} <span className="muted">({String(q.question_type).replaceAll('_',' ')}, {q.points} pt)</span></div>)}<form action={addQuestion} className="studio-grid" style={{marginTop:9}}><input type="hidden" name="assessment_id" value={assessment.id}/><label><span>Question type</span><select name="question_type" defaultValue="multiple_choice"><option value="multiple_choice">Multiple choice</option><option value="true_false">True / False</option><option value="multi_select">Select all that apply</option></select></label><label><span>Points</span><input name="points" type="number" min="1" defaultValue="1"/></label><label className="wide"><span>Question</span><input name="prompt" required placeholder="Enter the question"/></label><label className="wide"><span>Answer choices</span><textarea name="options" rows={4} placeholder={'One answer per line\nChoice A\nChoice B\nChoice C'}/><small className="muted">For True/False, leave choices blank.</small></label><label><span>Correct answer</span><input name="correct_answer" required placeholder={"1 (or 1,3 for multi-select)"}/><small className="muted">Use choice number(s); True/False uses true or false.</small></label><label><span>Explanation after submit</span><input name="explanation" placeholder="Optional teaching note"/></label><button className="ghost wide">Add question securely</button></form></div>})}
          <form action={createAssessment} className="studio-grid" style={{marginTop:10}}><input type="hidden" name="course_id" value={course.id}/><label><span>Assessment title</span><input name="title" required placeholder="Lesson 1 Knowledge Check"/></label><label><span>Type</span><select name="assessment_type" defaultValue="lesson_quiz"><option value="lesson_quiz">Lesson quiz</option><option value="knowledge_check">Knowledge check</option><option value="final_exam">Final exam</option></select></label><label><span>Attach to lesson</span><select name="module_id" defaultValue=""><option value="">Whole course / final</option>{courseModules.map((m:any)=><option value={m.id} key={m.id}>{m.position}. {m.title}</option>)}</select></label><label><span>Passing score</span><input name="passing_score" type="number" min="0" max="100" defaultValue={course.passing_score??80}/></label><label><span>Max attempts</span><input name="max_attempts" type="number" min="1" placeholder="Blank = unlimited"/></label><label style={{justifyContent:'flex-end'}}><span>Options</span><div className="row"><label className="row"><input type="checkbox" name="required" defaultChecked/> Required</label><label className="row"><input type="checkbox" name="published"/> Publish now</label></div></label><button className="ghost wide"><PlusCircle size={13}/> Create assessment</button></form>
        </div>
      </article>})}{!courses.length&&<div className="card empty"><h3>No courses yet.</h3><p className="muted">Create the first course draft using the Learning Studio form.</p></div>}</section>
    </div>
  </main>
}
