import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CheckCircle2,ShieldCheck,Sparkles,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateMilestones } from '../../actions'
import { LearningScorecard } from './learning-scorecard'
import { BibleStudyPracticum } from './bible-study-practicum'
import { MemberDetailsForm } from './member-details-form'
import '../../church.css'

const progress={en:[['not_started','Not started'],['in_progress','In progress'],['completed','Completed'],['waived','Waived']],es:[['not_started','No iniciado'],['in_progress','En progreso'],['completed','Completado'],['waived','Exento']]} as const
const teacher={en:[['not_ready','Not ready'],['training','Training'],['approved','Approved']],es:[['not_ready','No preparado'],['training','En entrenamiento'],['approved','Aprobado']]} as const
const training={en:[['not_complete','Not complete'],['current','Current'],['expired','Expired']],es:[['not_complete','No completado'],['current','Vigente'],['expired','Vencido']]} as const
const yesNo={en:[['','Unknown'],['yes','Yes'],['no','No']],es:[['','Desconocido'],['yes','Sí'],['no','No']]} as const
const boolValue=(v:boolean|null|undefined)=>v===true?'yes':v===false?'no':''
const fmt=(v:string|null|undefined,lang:'en'|'es')=>v?new Date(v+'T12:00:00').toLocaleDateString(lang==='es'?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}):(lang==='es'?'No registrado':'Not recorded')
const roleLabel=(role:string,lang:'en'|'es')=>{const en:Record<string,string>={member:'Member',group_leader:'Group leader',ministry_leader:'Ministry leader',minister:'Minister',pastor:'Pastor',church_admin:'Church admin'};const es:Record<string,string>={member:'Miembro',group_leader:'Líder de grupo',ministry_leader:'Líder de ministerio',minister:'Ministro',pastor:'Pastor',church_admin:'Administrador de iglesia'};return (lang==='es'?es:en)[role]??role.replaceAll('_',' ')}
const statusLabel=(status:string,lang:'en'|'es')=>{const en:Record<string,string>={active:'Active',inactive:'Inactive',visitor:'Visitor',pending:'Pending'};const es:Record<string,string>={active:'Activo',inactive:'Inactivo',visitor:'Visitante',pending:'Pendiente'};return (lang==='es'?es:en)[status]??status}

function SelectField({label,name,value,options}:{label:string;name:string;value:string;options:readonly(readonly[string,string])[]}){return <label className="record-field"><span>{label}</span><select name={name} defaultValue={value}>{options.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>}
function DateField({label,name,value}:{label:string;name:string;value?:string|null}){return <label className="record-field"><span>{label}</span><input type="date" name={name} defaultValue={value??''}/></label>}

export default async function MemberRecordPage({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{saved?:string;details_saved?:string;practicum?:string;error?:string;lang?:string}>}){
  const [{userId:targetUserId},query]=await Promise.all([params,searchParams])
  const lang: 'en'|'es'=query.lang==='es'?'es':'en'
  const es=lang==='es'
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const actorId=claimsData?.claims?.sub
  if(!actorId)redirect('/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id)redirect('/')
  const {data:customAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:actor.church_id,p_permission_key:'manage_members'})
  const canManageRecords=['pastor','church_admin'].includes(actor.role)||Boolean(customAccess)
  if(!canManageRecords)redirect('/')
  const {data:membership}=await supabase.from('church_memberships').select('id,role,status,joined_at,created_at').eq('church_id',actor.church_id).eq('user_id',targetUserId).single()
  if(!membership)redirect(`/church/member-records?lang=${lang}&error=`+encodeURIComponent(es?'Miembro no encontrado en esta iglesia.':'Member not found in this church.'))
  const [{data:profile},{data:details},{data:milestones}]=await Promise.all([
    supabase.from('profiles').select('first_name,last_name,display_name,bio,contact_email').eq('id',targetUserId).maybeSingle(),
    supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',targetUserId).maybeSingle(),
    supabase.from('member_milestones').select('*').eq('church_id',actor.church_id).eq('user_id',targetUserId).maybeSingle()
  ])
  const church=Array.isArray(actor.churches)?actor.churches[0]:actor.churches as {name?:string}|null
  const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||(es?'Miembro sin nombre':'Unnamed member')
  const m:any=milestones??{}
  const address=[details?.address_line1,details?.address_line2,[details?.city,details?.state,details?.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')||(es?'No agregado':'Not added')
  const completed=[m.first_steps_status,m.salt_series_status,m.soul_winning_status,m.timothys_status,m.school_pastors_status].filter((v:string)=>v==='completed').length

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??(es?'Tu Iglesia':'Your Church')} • {es?'Registro verificado de miembro':'Verified Member Record'}</div></div><div className="row"><Link className="ghost" href={`/church/member-records?lang=${lang}`}>← {es?'Registros':'Records'}</Link><Link className="ghost" href={`/church/members/${targetUserId}?lang=${es?'en':'es'}`}>{es?'English':'Español'}</Link><Link className="ghost" href="/">{es?'Inicio':'Home'}</Link></div></header>

    <section className="record-hero card"><div className="member-main"><div className="avatar record-avatar">{name.slice(0,1).toUpperCase()}</div><div><div className="pill">{es?'REGISTRO DE MIEMBRO':'MEMBER RECORD'}</div><h1>{name}</h1><p className="muted">{roleLabel(membership.role,lang)} • {statusLabel(membership.status,lang)}</p></div></div><div className="record-score"><strong>{completed}/5</strong><span>{es?'hitos principales de capacitación completados':'core training milestones completed'}</span></div></section>
    {query.saved&&<div className="notice success">{es?'Registro verificado guardado.':'Verified member record saved.'}</div>}{query.details_saved&&<div className="notice success">{es?'Contacto y perfil guardados.':'Contact and profile details saved.'}</div>}{query.practicum&&<div className="notice success">{es?'Evaluación práctica de maestro de estudio bíblico guardada.':'Bible Study Teacher practicum scorecard saved.'}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <MemberDetailsForm churchId={actor.church_id} userId={targetUserId} profile={profile} details={details} lang={lang}/>
    <LearningScorecard userId={targetUserId} churchId={actor.church_id} lang={lang}/>
    <BibleStudyPracticum userId={targetUserId} churchId={actor.church_id} lang={lang}/>

    <div className="record-layout"><aside>
      <section className="card record-side"><div className="pill">{es?'CONTACTO':'CONTACT'}</div><h3>{es?'Información del miembro':'Member information'}</h3><dl><dt>Email</dt><dd>{profile?.contact_email||details?.email||(es?'No agregado':'Not added')}</dd><dt>{es?'Teléfono':'Phone'}</dt><dd>{details?.phone||(es?'No agregado':'Not added')}</dd><dt>{es?'Dirección':'Address'}</dt><dd>{address}</dd><dt>{es?'Cumpleaños':'Birthday'}</dt><dd>{fmt(details?.birthday,lang)}</dd><dt>{es?'Aniversario':'Anniversary'}</dt><dd>{fmt(details?.marriage_anniversary,lang)}</dd></dl></section>
      <section className="card record-side"><div className="pill">{es?'ACCESO':'ACCESS'}</div><h3>{es?'Membresía de iglesia':'Church membership'}</h3><dl><dt>{es?'Rol':'Role'}</dt><dd>{roleLabel(membership.role,lang)}</dd><dt>{es?'Estado':'Status'}</dt><dd>{statusLabel(membership.status,lang)}</dd><dt>{es?'Se unió':'Joined'}</dt><dd>{fmt(membership.joined_at,lang)}</dd></dl><p className="small muted">{es?'Este rol de acceso solo puede ser cambiado por un pastor o administrador de iglesia.':'This security/access role can only be changed by a pastor or church admin.'}</p></section>
    </aside>

    <form action={updateMilestones} className="record-form">
      <input type="hidden" name="church_id" value={actor.church_id}/><input type="hidden" name="user_id" value={targetUserId}/><input type="hidden" name="lang" value={lang}/>
      <section className="card record-section"><div className="record-section-head"><div><Sparkles/><div><h2>{es?'Nuevo Nacimiento':'New Birth'}</h2><p>{es?'Hitos de salvación verificados por líderes autorizados.':'Salvation milestones verified by authorized church leaders.'}</p></div></div><span className="verified-label"><ShieldCheck size={14}/> {es?'Verificado':'Verified'}</span></div><div className="record-grid"><SelectField label={es?'Recibió el Espíritu Santo':'Holy Ghost received'} name="holy_ghost_received" value={boolValue(m.holy_ghost_received)} options={yesNo[lang]}/><DateField label={es?'Fecha del Espíritu Santo':'Holy Ghost date'} name="holy_ghost_date" value={m.holy_ghost_date}/><SelectField label={es?'Bautizado':'Baptized'} name="baptized" value={boolValue(m.baptized)} options={yesNo[lang]}/><DateField label={es?'Fecha de bautismo':'Baptism date'} name="baptism_date" value={m.baptism_date}/></div></section>

      <section className="card record-section"><div className="record-section-head"><div><BookOpen/><div><h2>{es?'Discipulado':'Discipleship'}</h2><p>{es?'Sigue el camino del miembro desde los fundamentos hasta el evangelismo.':'Track the member’s path from foundation to evangelism.'}</p></div></div></div><div className="record-grid"><SelectField label="First Steps" name="first_steps_status" value={m.first_steps_status??'not_started'} options={progress[lang]}/><DateField label={es?'First Steps completado':'First Steps completed'} name="first_steps_completed_at" value={m.first_steps_completed_at}/><SelectField label="Salt Series" name="salt_series_status" value={m.salt_series_status??'not_started'} options={progress[lang]}/><DateField label={es?'Salt completado':'Salt completed'} name="salt_series_completed_at" value={m.salt_series_completed_at}/><SelectField label="Effective Soul Winning" name="soul_winning_status" value={m.soul_winning_status??'not_started'} options={progress[lang]}/><DateField label={es?'Soul Winning completado':'Soul Winning completed'} name="soul_winning_completed_at" value={m.soul_winning_completed_at}/><SelectField label={es?'Maestro de estudio bíblico':'Bible Study Teacher'} name="bible_study_teacher_status" value={m.bible_study_teacher_status??'not_ready'} options={teacher[lang]}/></div></section>

      <section className="card record-section"><div className="record-section-head"><div><UserRound/><div><h2>{es?'Liderazgo y Capacitación':'Leadership & Training'}</h2><p>{es?'Calificaciones, capacitación de seguridad y estado del pacto.':'Qualifications, safety training and covenant status.'}</p></div></div></div><div className="record-grid"><SelectField label="Timothys" name="timothys_status" value={m.timothys_status??'not_started'} options={progress[lang]}/><DateField label={es?'Timothys completado':'Timothys completed'} name="timothys_completed_at" value={m.timothys_completed_at}/><SelectField label={es?'Escuela de Pastores':'School of Pastors'} name="school_pastors_status" value={m.school_pastors_status??'not_started'} options={progress[lang]}/><DateField label={es?'Escuela de Pastores completada':'School of Pastors completed'} name="school_pastors_completed_at" value={m.school_pastors_completed_at}/><SelectField label={es?'Capacitación sobre abuso infantil':'Child abuse training'} name="child_abuse_training_status" value={m.child_abuse_training_status??'not_complete'} options={training[lang]}/><DateField label={es?'Abuso infantil completado':'Child abuse completed'} name="child_abuse_completed_at" value={m.child_abuse_completed_at}/><DateField label={es?'Abuso infantil vence':'Child abuse expires'} name="child_abuse_expires_at" value={m.child_abuse_expires_at}/><SelectField label={es?'Capacitación sobre acoso sexual':'Sexual harassment training'} name="sexual_harassment_training_status" value={m.sexual_harassment_training_status??'not_complete'} options={training[lang]}/><DateField label={es?'Acoso completado':'Harassment completed'} name="sexual_harassment_completed_at" value={m.sexual_harassment_completed_at}/><DateField label={es?'Acoso vence':'Harassment expires'} name="sexual_harassment_expires_at" value={m.sexual_harassment_expires_at}/><SelectField label={es?'Pacto vigente':'Covenant current'} name="covenant_current" value={boolValue(m.covenant_current)} options={yesNo[lang]}/><DateField label={es?'Pacto firmado':'Covenant signed'} name="covenant_signed_at" value={m.covenant_signed_at}/></div></section>

      <div className="record-save card"><div><CheckCircle2/><div><strong>{es?'Guardar registro verificado':'Save verified record'}</strong><span>{es?'Los cambios están restringidos a líderes autorizados para registros de miembros.':'Changes are restricted to authorized member-record leaders.'}</span></div></div><button className="btn" type="submit">{es?'Guardar hitos':'Save milestones'}</button></div>
    </form></div>
  </main>
}
