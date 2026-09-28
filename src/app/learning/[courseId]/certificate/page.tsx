import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Award,ChevronLeft} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {CertificatePrintButton} from './print-button'
import '../../learning.css'

const dateLabel=(value:string|null|undefined,locale:string)=>{
  if(!value)return ''
  const d=new Date(value)
  if(Number.isNaN(d.getTime()))return ''
  return new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric'}).format(d)
}

export default async function LearningCertificate({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:enrollment},{data:profile},{data:course}]=await Promise.all([
    supabase.from('course_enrollments').select('course_id,user_id,final_score,completed_at,credential_earned').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('profiles').select('first_name,last_name,display_name').eq('id',userId).maybeSingle(),
    supabase.from('courses').select('id,title,badge_name,church_id,language_code,churches(name)').eq('id',courseId).maybeSingle(),
  ])
  if(!course||!enrollment?.credential_earned||!enrollment.completed_at)redirect(`/learning/${courseId}`)
  const isEs=(course.language_code??'en')==='es',t=(en:string,es:string)=>isEs?es:en
  const church:any=Array.isArray(course.churches)?course.churches[0]:course.churches
  const memberName=[profile?.first_name,profile?.last_name].filter(Boolean).join(' ').trim()||profile?.display_name||t('Course Participant','Participante del Curso')
  const completion=dateLabel(enrollment.completed_at,isEs?'es-US':'en-US')
  const credential=course.badge_name||t('Certificate of Completion','Certificado de Finalización')

  return <main className="certificate-shell">
    <div className="certificate-actions no-print"><Link className="ghost" href={`/learning/${courseId}`}><ChevronLeft size={14}/> {t('Back to course','Volver al curso')}</Link><CertificatePrintButton label={t('Print / Save PDF','Imprimir / Guardar PDF')}/></div>
    <article className="learning-certificate">
      <div className="certificate-kicker">{t('ONE KINGDOM LEARNING CENTER','CENTRO DE APRENDIZAJE ONE KINGDOM')}</div>
      <Award className="certificate-seal" size={52}/>
      <div className="certificate-title">{credential}</div>
      <p className="certificate-copy">{t('This certifies that','Esto certifica que')}</p>
      <h1>{memberName}</h1>
      <p className="certificate-copy">{t('has successfully completed','ha completado satisfactoriamente')}</p>
      <h2>{course.title}</h2>
      <div className="certificate-meta"><span>{t('Completed','Completado')}: <strong>{completion}</strong></span>{enrollment.final_score!=null&&<span>{t('Final score','Puntaje final')}: <strong>{Number(enrollment.final_score)}%</strong></span>}</div>
      {church?.name&&<div className="certificate-church">{church.name}</div>}
      <div className="certificate-foot">{t('Completion is verified from the learner’s One Kingdom course record.','La finalización está verificada por el registro del curso del alumno en One Kingdom.')}</div>
    </article>
  </main>
}
