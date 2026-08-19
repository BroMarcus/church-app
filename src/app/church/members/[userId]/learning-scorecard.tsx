import { Award,BookOpenCheck,ClipboardCheck,ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './scorecard.css'

export async function LearningScorecard({userId,churchId,lang='en'}:{userId:string;churchId:string;lang?:'en'|'es'}){
  const es=lang==='es'
  const supabase=await createClient()
  const [{data:enrollments},{data:attempts},{data:memberBadges},{data:milestones}]=await Promise.all([
    supabase.from('course_enrollments').select('course_id,progress,final_score,completed_at,credential_earned,updated_at').eq('user_id',userId),
    supabase.from('assessment_attempts').select('assessment_id,attempt_number,percentage,passed,submitted_at').eq('user_id',userId).order('submitted_at',{ascending:false}),
    supabase.from('member_badges').select('badge_id,earned_at').eq('user_id',userId).order('earned_at',{ascending:false}),
    supabase.from('member_milestones').select('first_steps_status,first_steps_completed_at').eq('church_id',churchId).eq('user_id',userId).maybeSingle()
  ])

  const courseIds=Array.from(new Set((enrollments??[]).map((e:any)=>e.course_id)))
  const assessmentIds=Array.from(new Set((attempts??[]).map((a:any)=>a.assessment_id)))
  const badgeIds=Array.from(new Set((memberBadges??[]).map((b:any)=>b.badge_id)))
  const [{data:courses},{data:assessments},{data:badges}]=await Promise.all([
    courseIds.length?supabase.from('courses').select('id,title,slug,badge_name,church_id').in('id',courseIds).eq('church_id',churchId):Promise.resolve({data:[] as any[]}),
    assessmentIds.length?supabase.from('course_assessments').select('id,title,course_id,assessment_type,passing_score').in('id',assessmentIds):Promise.resolve({data:[] as any[]}),
    badgeIds.length?supabase.from('badges').select('id,name,category,description').in('id',badgeIds).eq('church_id',churchId):Promise.resolve({data:[] as any[]})
  ])

  const cm=new Map((courses??[]).map((c:any)=>[c.id,c]))
  const am=new Map((assessments??[]).map((a:any)=>[a.id,a]))
  const bm=new Map((badges??[]).map((b:any)=>[b.id,b]))
  const completed=(enrollments??[]).filter((e:any)=>e.credential_earned===true||Boolean(e.completed_at)).length
  const passed=(attempts??[]).filter((a:any)=>a.passed).length
  const bestScore=(attempts??[]).reduce((max:number,a:any)=>Math.max(max,Number(a.percentage??0)),0)
  const firstStepsCourse=(courses??[]).find((c:any)=>c.slug==='first-steps')
  const firstStepsEnrollment=firstStepsCourse?(enrollments??[]).find((e:any)=>e.course_id===firstStepsCourse.id):null
  const firstStepsCredential=Boolean(firstStepsEnrollment?.credential_earned||firstStepsEnrollment?.completed_at)
  const firstStepsVerified=milestones?.first_steps_status==='completed'
  const locale=es?'es-US':'en-US'

  return <section className="card learning-scorecard"><div className="scorecard-head"><div><div className="pill">{es?'RESUMEN DE APRENDIZAJE':'LEARNING SCORECARD'}</div><h2>{es?'Capacitación, puntajes y credenciales':'Training, scores & credentials'}</h2><p className="small muted">{es?'Vista de liderazgo de la actividad de aprendizaje registrada y las credenciales obtenidas.':'Leadership view of the member’s recorded learning activity and earned course credentials.'}</p></div><BookOpenCheck/></div>
    <div className="scorecard-summary"><span className="score-chip">{completed} {es?'credenciales de curso obtenidas':'course credential(s) earned'}</span><span className="score-chip">{passed} {es?'evaluaciones aprobadas':'passing assessment(s)'}</span><span className="score-chip">{es?'Mejor puntaje':'Best score'} {bestScore||0}%</span><span className="score-chip">{memberBadges?.length??0} {es?'insignias de logro':'achievement badge(s)'}</span></div>
    {firstStepsCredential&&!firstStepsVerified&&<div className="notice success" style={{marginBottom:14}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><ShieldCheck size={18}/><div><strong>{es?'First Steps está listo para verificación de liderazgo.':'First Steps is ready for leadership verification.'}</strong><div className="small" style={{marginTop:4}}>{es?'El miembro obtuvo la credencial del curso. Revise el registro y luego confirme el hito oficial de la iglesia en Discipulado abajo.':'The member earned the First Steps course credential. Review the learning record, then use the First Steps fields in Discipleship below to confirm the official church milestone.'}</div></div></div></div>}
    {firstStepsCredential&&firstStepsVerified&&<div className="notice success" style={{marginBottom:14}}><strong>{es?'First Steps verificado.':'First Steps verified.'}</strong> {es?'La finalización del curso y el hito verificado por liderazgo están registrados.':'Course completion and the leadership-verified church milestone are both recorded.'}</div>}
    <div className="scorecard-grid">
      <div className="score-panel"><h3><BookOpenCheck size={15}/> {es?'Progreso del curso':'Course progress'}</h3>{(enrollments??[]).map((e:any)=>{const c=cm.get(e.course_id);const earned=Boolean(e.credential_earned||e.completed_at);return <div className="course-score" key={e.course_id}><div className="score-row"><strong>{c?.title??(es?'Curso':'Course')}</strong><span>{e.progress??0}%{earned?(es?' • credencial obtenida':' • credential earned'):Number(e.progress??0)>=100?(es?' • credencial final pendiente':' • final credential pending'):''}</span></div><div className="score-progress"><span style={{width:`${Math.max(0,Math.min(100,Number(e.progress??0)))}%`}}/></div>{e.final_score!=null&&<div className="credential-meta">{es?'Examen final':'Final exam'}: {Number(e.final_score)}%</div>}</div>})}{!enrollments?.length&&<div className="score-empty">{es?'Aún no hay actividad de cursos.':'No course activity yet.'}</div>}</div>
      <div className="score-panel"><h3><ClipboardCheck size={15}/> {es?'Historial de evaluaciones':'Assessment history'}</h3>{(attempts??[]).slice(0,8).map((a:any)=>{const assessment=am.get(a.assessment_id);const course=assessment?cm.get(assessment.course_id):null;return <div className="attempt-score" key={`${a.assessment_id}-${a.attempt_number}`}><div className="score-row"><strong>{assessment?.title??(es?'Evaluación':'Assessment')}{course?.title?` • ${course.title}`:''}</strong><span className={a.passed?'result-pass':'result-fail'}>{Number(a.percentage)}% • {a.passed?(es?'Aprobado':'Passed'):(es?'No aprobado':'Not passed')}</span></div><div className="credential-meta">{es?'Intento':'Attempt'} {a.attempt_number}{a.submitted_at?` • ${new Date(a.submitted_at).toLocaleDateString(locale)}`:''}</div></div>})}{!attempts?.length&&<div className="score-empty">{es?'Aún no hay intentos de evaluación.':'No assessment attempts yet.'}</div>}</div>
      <div className="score-panel" style={{gridColumn:'1 / -1'}}><h3><Award size={15}/> {es?'Logros obtenidos':'Earned achievements'}</h3>{(memberBadges??[]).map((mb:any)=>{const b=bm.get(mb.badge_id);return b?<div className="credential-score" key={mb.badge_id}><div className="credential-title">{b.name}</div><div className="credential-meta">{String(b.category).replaceAll('_',' ')} • {es?'obtenido':'earned'} {new Date(mb.earned_at).toLocaleDateString(locale)}</div><div className="small muted" style={{marginTop:4}}>{b.description}</div></div>:null})}{!memberBadges?.length&&<div className="score-empty">{es?'Aún no hay insignias de logro.':'No achievement badges yet.'}</div>}</div>
    </div>
  </section>
}
