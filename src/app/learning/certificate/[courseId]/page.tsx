import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Award} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {PrintCertificateButton} from './print-certificate-button'
import './certificate.css'

const fmt=(value?:string|null)=>value?new Date(value).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'—'

export default async function LearningCertificatePage({params}:{params:Promise<{courseId:string}>}){
  const {courseId}=await params
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:enrollment},{data:course},{data:profile}]=await Promise.all([
    supabase.from('course_enrollments').select('course_id,completed_at,final_score,credential_earned,curriculum_version,certificate_number,certificate_issued_at').eq('course_id',courseId).eq('user_id',userId).maybeSingle(),
    supabase.from('courses').select('id,title,badge_name,church_id,language_code').eq('id',courseId).maybeSingle(),
    supabase.from('profiles').select('display_name,first_name,last_name').eq('id',userId).maybeSingle()
  ])
  if(!course||!enrollment?.credential_earned||!enrollment.certificate_number)redirect(`/learning/${courseId}`)
  const {data:membership}=await supabase.from('church_memberships').select('churches(name)').eq('church_id',course.church_id).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership)redirect('/learning')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const learner=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||'Learner'
  const es=(course.language_code??'en')==='es'
  const t=(en:string,sp:string)=>es?sp:en

  return <main className="certificate-shell">
    <div className="certificate-actions"><Link className="ghost" href={`/learning/${courseId}`}>← {t('Course','Curso')}</Link><PrintCertificateButton label={t('Print / Save PDF','Imprimir / Guardar PDF')}/></div>
    <article className="learning-certificate">
      <div className="certificate-mark"><Award size={44}/></div>
      <div className="certificate-kicker">{t('CERTIFICATE OF COMPLETION','CERTIFICADO DE FINALIZACIÓN')}</div>
      <h1>{course.badge_name||course.title}</h1>
      <p className="certificate-copy">{t('This certifies that','Esto certifica que')}</p>
      <div className="certificate-name">{learner}</div>
      <p className="certificate-copy">{t('has successfully completed','ha completado satisfactoriamente')}</p>
      <h2>{course.title}</h2>
      <div className="certificate-meta">
        <div><span>{t('Completed','Completado')}</span><strong>{fmt(enrollment.completed_at||enrollment.certificate_issued_at)}</strong></div>
        {enrollment.final_score!=null&&<div><span>{t('Final score','Puntaje final')}</span><strong>{Number(enrollment.final_score)}%</strong></div>}
        <div><span>{t('Curriculum version','Versión del currículo')}</span><strong>{enrollment.curriculum_version||'1.0'}</strong></div>
      </div>
      <div className="certificate-footer">
        <div><span>{church?.name||'Kingdom Network Church'}</span><small>{t('Issuing church','Iglesia emisora')}</small></div>
        <div><span>{enrollment.certificate_number}</span><small>{t('Certificate number','Número de certificado')}</small></div>
      </div>
    </article>
  </main>
}
