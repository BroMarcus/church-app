import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/lib/supabase/server'
import {resolveConnectionReview} from './actions'
import '../../connect/connect.css'

const nameOf=(c:any)=>[c?.first_name,c?.last_name].filter(Boolean).join(' ')||'Outreach contact'

export default async function OutreachReviewsPage({searchParams}:{searchParams:Promise<{lang?:string;saved?:string;error?:string}>}){
  const query=await searchParams
  const es=query.lang==='es'
  const lang:'en'|'es'=es?'es':'en'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches

  const {data:reviews,error}=await supabase.from('outreach_connection_reviews').select('id,source_link_id,request_key,candidate_ids,submitted_first_name,submitted_last_name,submitted_phone,submitted_email,communication_language,bible_study_interest,first_steps_interest,created_at,status').eq('church_id',membership.church_id).eq('status','pending').order('created_at',{ascending:true})
  if(error)redirect(`/outreach?error=${encodeURIComponent(es?'La revisión de conexiones no está disponible para su cuenta.':'Connection review is not available to your account.')}&lang=${lang}`)

  const candidateIds=[...new Set((reviews??[]).flatMap((r:any)=>r.candidate_ids??[]))]
  let contacts:any[]=[]
  if(candidateIds.length){const r=await supabase.from('outreach_contacts').select('id,first_name,last_name,email,phone,stage,member_user_id').in('id',candidateIds);contacts=r.data??[]}
  const contactMap=new Map(contacts.map((c:any)=>[c.id,c]))

  return <main className="connect-shell">
    <div className="connect-top"><div><Link href="/" className="connect-brand">Kingdom <span>Network</span></Link><div className="connect-muted">{church?.name??(es?'Su iglesia':'Your church')} • {es?'Revisión de conexiones':'Connection Review'}</div></div><div className="connect-actions"><Link className="connect-btn secondary" href={`/outreach/reviews?lang=${es?'en':'es'}`}>{es?'English':'Español'}</Link><Link className="connect-btn secondary" href={`/outreach?lang=${lang}`}>← {es?'Evangelismo':'Outreach'}</Link></div></div>

    <section className="connect-card connect-hero"><div className="connect-pill">{es?'EVITAR DUPLICADOS':'DUPLICATE-SAFE REVIEW'}</div><h1>{es?'Conexiones que necesitan una decisión humana':'Connections that need a human decision'}</h1><p className="connect-muted">{es?'Estas personas coincidieron con más de un registro existente. Kingdom Network no escogió automáticamente para evitar mezclar la historia de dos personas.':'These submissions matched more than one existing record. Kingdom Network did not choose automatically so two people’s history cannot be merged by mistake.'}</p></section>

    {query.saved&&<div className="connect-notice success">{es?'Revisión resuelta.':'Review resolved.'}</div>}
    {query.error&&<div className="connect-notice error">{es?'No pudimos guardar esa decisión. Revise el registro e inténtelo otra vez.':'We could not save that decision. Review the record and try again.'}</div>}

    {(reviews??[]).length===0?<section className="connect-card"><h2>{es?'No hay conexiones pendientes.':'No connection reviews are pending.'}</h2><p className="connect-muted">{es?'Las coincidencias claras se conectan automáticamente; solo los casos ambiguos llegan aquí.':'Clear matches connect automatically; only ambiguous cases come here.'}</p></section>:(reviews??[]).map((review:any)=>{
      const candidates=(review.candidate_ids??[]).map((id:string)=>contactMap.get(id)).filter(Boolean)
      return <section className="connect-card" key={review.id}><div className="connect-pill">{es?'REVISAR PERSONA':'REVIEW PERSON'}</div><h2>{[review.submitted_first_name,review.submitted_last_name].filter(Boolean).join(' ')}</h2><div className="connect-muted">{[review.submitted_phone,review.submitted_email].filter(Boolean).join(' • ')}</div>{(review.bible_study_interest||review.first_steps_interest)&&<div className="connect-source">{review.bible_study_interest&&<span>{es?'Interés: estudio bíblico':'Bible study interest'}</span>}{review.first_steps_interest&&<span>{es?'Interés: Primeros Pasos':'First Steps interest'}</span>}</div>}<div className="connect-divider"/><h3>{es?'Registros que podrían ser la misma persona':'Records that may be the same person'}</h3>{candidates.length===0?<p className="connect-notice warn">{es?'Los registros candidatos ya no están disponibles. Déjelo pendiente y pida ayuda a un administrador.':'The candidate records are no longer available. Leave this pending and ask an administrator for help.'}</p>:<div className="connect-grid">{candidates.map((c:any)=><form key={c.id} action={resolveConnectionReview} className="connect-card" style={{margin:0}}><input type="hidden" name="review_id" value={review.id}/><input type="hidden" name="contact_id" value={c.id}/><input type="hidden" name="lang" value={lang}/><strong>{nameOf(c)}</strong><div className="connect-muted">{[c.phone,c.email,c.stage].filter(Boolean).join(' • ')}</div><button className="connect-btn" style={{marginTop:12}}>{es?'Usar este registro':'Use this record'}</button></form>)}</div>}<form action={resolveConnectionReview} className="connect-actions" style={{marginTop:14}}><input type="hidden" name="review_id" value={review.id}/><input type="hidden" name="dismiss" value="true"/><input type="hidden" name="lang" value={lang}/><button className="connect-btn secondary">{es?'Descartar como envío incorrecto':'Dismiss as invalid submission'}</button></form></section>
    })}
  </main>
}
