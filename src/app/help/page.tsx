import Link from 'next/link'
import { redirect } from 'next/navigation'
import { HandHeart,Languages,MessageSquareWarning,ShieldCheck,UserRoundCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createCareRequest,updateCareRequest,withdrawCareRequest } from './actions'
import HelpSubmitButton from './help-submit-button'
import './help.css'

const categoryRows=[['prayer','Prayer','Oración'],['pastoral','Pastoral guidance','Guía pastoral'],['family','Family','Familia'],['grief','Grief','Duelo'],['health','Health','Salud'],['benevolence','Benevolence','Ayuda económica'],['counseling','Counseling','Consejería'],['other','Other','Otro']] as const
const urgencyRows=[['normal','Normal','Normal'],['soon','Soon','Pronto'],['urgent','Urgent','Urgente']] as const
const contactRows=[['in_app','In app','En la aplicación'],['phone','Phone','Teléfono'],['email','Email','Correo'],['either','Phone or email','Teléfono o correo']] as const
const statusRows=[['new','New','Nueva'],['in_review','In review','En revisión'],['contacted','Contacted','Contactado'],['closed','Closed','Cerrada'],['withdrawn','Withdrawn','Retirada']] as const
const allowedNotices=new Set(['created','saved','withdrawn','invalid_request','invalid_update','request_not_found','save_failed','withdraw_failed','temporary_problem','not_authorized'])
const label=(rows:readonly (readonly [string,string,string])[],v:string,es:boolean)=>rows.find(([k])=>k===v)?.[es?2:1]??v.replaceAll('_',' ')
const personName=(p:any,fallback:string)=>p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||fallback
const niceDate=(v:string,es:boolean)=>new Date(v).toLocaleString(es?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})
const safeCode=(error:unknown)=>error&&typeof error==='object'&&'code' in error?String((error as {code?:unknown}).code??'unknown').slice(0,80):'unknown'
const readFailure=(area:string,error:unknown):never=>{console.error('[help-care-read]',{area,code:safeCode(error)});throw new Error('HELP_CARE_READ_FAILED')}

export default async function HelpPage({searchParams}:{searchParams:Promise<{created?:string;saved?:string;withdrawn?:string;error?:string;status?:string;lang?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims,error:claimsError}=await supabase.auth.getClaims()
  if(claimsError)readFailure('claims',claimsError)
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))

  const {data:membership,error:membershipError}=await supabase
    .from('church_memberships')
    .select('church_id,role,churches(name)')
    .eq('user_id',userId)
    .eq('status','active')
    .limit(1)
    .maybeSingle()
  if(membershipError)readFailure('membership',membershipError)
  if(!membership?.church_id)redirect('/')

  const churchId=membership.church_id,church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches,isPastoral=['pastor','church_admin'].includes(membership.role)
  const {data:myRequests,error:myRequestsError}=await supabase.from('care_requests').select('id,category,urgency,subject,message,preferred_contact,status,created_at,updated_at,closed_at').eq('church_id',churchId).eq('user_id',userId).order('created_at',{ascending:false})
  if(myRequestsError)readFailure('member_requests',myRequestsError)

  let queue:any[]=[];let pastorOptions:any[]=[];let profileMap=new Map<string,any>();let detailMap=new Map<string,any>()
  if(isPastoral){
    const [careResult,leaderResult]=await Promise.all([
      supabase.from('care_requests').select('*').eq('church_id',churchId).neq('status','withdrawn').order('created_at',{ascending:false}),
      supabase.from('church_memberships').select('user_id,role').eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin'])
    ])
    if(careResult.error)readFailure('pastoral_queue',careResult.error)
    if(leaderResult.error)readFailure('pastoral_leaders',leaderResult.error)
    queue=careResult.data??[]
    const leaders=leaderResult.data??[]
    const ids=Array.from(new Set([...queue.map((r:any)=>r.user_id),...queue.map((r:any)=>r.assigned_to).filter(Boolean),...leaders.map((r:any)=>r.user_id)]))
    if(ids.length){
      const [profilesResult,detailsResult]=await Promise.all([
        supabase.from('profiles').select('id,display_name,first_name,last_name').in('id',ids),
        supabase.from('member_private_details').select('user_id,email,phone').in('user_id',ids)
      ])
      if(profilesResult.error)readFailure('pastoral_profiles',profilesResult.error)
      if(detailsResult.error)readFailure('pastoral_contacts',detailsResult.error)
      profileMap=new Map((profilesResult.data??[]).map((r:any)=>[r.id,r]))
      detailMap=new Map((detailsResult.data??[]).map((r:any)=>[r.user_id,r]))
    }
    pastorOptions=leaders.map((r:any)=>({id:r.user_id,name:personName(profileMap.get(r.user_id),t('Church leader','Líder de iglesia'))})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  }

  const legacyStatus=query.created?'created':query.saved?'saved':query.withdrawn?'withdrawn':query.error?'temporary_problem':undefined
  const notice=allowedNotices.has(query.status??'')?query.status:legacyStatus
  const noticeText=notice?({
    created:t('Your private care request was submitted.','Tu solicitud privada fue enviada.'),
    saved:t('Care request updated.','Solicitud de cuidado actualizada.'),
    withdrawn:t('Your request was withdrawn.','Tu solicitud fue retirada.'),
    invalid_request:t('Please complete the care request and try again.','Completa la solicitud de cuidado e inténtalo de nuevo.'),
    invalid_update:t('That care update could not be saved. Check the fields and try again.','No se pudo guardar esa actualización. Revisa los campos e inténtalo de nuevo.'),
    request_not_found:t('That request could not be found or is no longer available to change.','No se encontró esa solicitud o ya no está disponible para cambiar.'),
    save_failed:t('We could not save that change right now. Nothing was changed. Please try again.','No pudimos guardar ese cambio ahora. No se cambió nada. Inténtalo de nuevo.'),
    withdraw_failed:t('We could not withdraw that request right now. Nothing was changed. Please try again.','No pudimos retirar esa solicitud ahora. No se cambió nada. Inténtalo de nuevo.'),
    temporary_problem:t('We could not safely verify your church care information. Please try again.','No pudimos verificar de forma segura la información de cuidado de tu iglesia. Inténtalo de nuevo.'),
    not_authorized:t('That pastoral action is not available for this account.','Esa acción pastoral no está disponible para esta cuenta.')
  } as Record<string,string>)[notice]:undefined
  const noticeSuccess=['created','saved','withdrawn'].includes(notice??'')

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Private Care','Cuidado Privado')}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/help?lang=en">English</Link><Link className="ghost" href="/help?lang=es">Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="care-hero card"><div><div className="pill">{t('PRIVATE CARE','CUIDADO PRIVADO')}</div><h1>{t('Need prayer or pastoral help?','¿Necesitas oración o ayuda pastoral?')}</h1><p className="muted">{t('Send a private request directly to the pastoral-care leadership of your church.','Envía una solicitud privada directamente al liderazgo pastoral de tu iglesia.')}</p></div><div className="hero-stat"><HandHeart size={22}/><span>{t('Private to you + authorized leadership','Privado para ti + liderazgo autorizado')}</span></div></section>
    {noticeText&&<div role="alert" className={`notice ${noticeSuccess?'success':'error'}`}>{noticeText}</div>}

    <section className="card care-form" style={{marginBottom:22}}><div className="pill">{t('ASK FOR HELP','PEDIR AYUDA')}</div><h2>{t('How can we help?','¿Cómo podemos ayudarte?')}</h2><p className="small muted">{t('Share only what you want pastoral leadership to know. This is not posted to the community feed.','Comparte solo lo que quieras que sepa el liderazgo pastoral. Esto no se publica en la comunidad.')}</p><form action={createCareRequest} className="care-grid"><input type="hidden" name="lang" value={es?'es':'en'}/><label><span>{t('What kind of help?','¿Qué tipo de ayuda?')}</span><select name="category" defaultValue="prayer">{categoryRows.map(([v,en,sp])=><option value={v} key={v}>{es?sp:en}</option>)}</select></label><label><span>{t('How soon?','¿Qué tan pronto?')}</span><select name="urgency" defaultValue="normal">{urgencyRows.map(([v,en,sp])=><option value={v} key={v}>{es?sp:en}</option>)}</select></label><label className="wide"><span>{t('Short subject','Asunto breve')}</span><input name="subject" required maxLength={160} placeholder={t('How can pastoral leadership help?','¿Cómo puede ayudarte el liderazgo pastoral?')}/></label><label className="wide"><span>{t('Tell us what you need','Cuéntanos qué necesitas')}</span><textarea name="message" required rows={6} maxLength={5000} placeholder={t('Share the situation, prayer need or request.','Comparte la situación, necesidad de oración o solicitud.')}/></label><label><span>{t('How should we contact you?','¿Cómo debemos contactarte?')}</span><select name="preferred_contact" defaultValue="in_app">{contactRows.map(([v,en,sp])=><option value={v} key={v}>{es?sp:en}</option>)}</select></label><div className="wide"><HelpSubmitButton label={t('Send privately','Enviar en privado')} pendingLabel={t('Sending… keep this page open','Enviando… mantén esta página abierta')}/><p className="small muted">{t('Tap once. Wait for the confirmation before leaving this page.','Toca una vez. Espera la confirmación antes de salir de esta página.')}</p></div></form><div className="privacy-note"><ShieldCheck size={13}/> {t('Visible only to you and authorized pastor/church-admin accounts for your church.','Visible solo para ti y cuentas autorizadas de pastor/administrador de tu iglesia.')}</div></section>

    <section className="care-stack"><div><div className="pill">{t('MY REQUESTS','MIS SOLICITUDES')}</div><h2>{t('My care history','Mi historial de cuidado')}</h2></div>{(myRequests??[]).map((r:any)=><article className="card care-card" key={r.id}><div className="care-head"><div><div className="small muted">{label(categoryRows,r.category,es)} • {niceDate(r.created_at,es)}</div><h3>{r.subject}</h3></div><span className={`care-status ${r.status}`}>{label(statusRows,r.status,es)}</span></div><div className="care-meta"><span className={`care-chip ${r.urgency}`}>{label(urgencyRows,r.urgency,es)}</span><span className="care-chip">{t('Contact','Contacto')}: {label(contactRows,r.preferred_contact,es)}</span></div><p className="care-message">{r.message}</p>{['new','in_review'].includes(r.status)&&<form action={withdrawCareRequest}><input type="hidden" name="request_id" value={r.id}/><input type="hidden" name="lang" value={es?'es':'en'}/><HelpSubmitButton className="ghost" label={t('Withdraw request','Retirar solicitud')} pendingLabel={t('Withdrawing…','Retirando…')}/></form>}</article>)}{!myRequests?.length&&<div className="card care-empty"><h3>{t('No private care requests yet.','Todavía no hay solicitudes privadas.')}</h3><p className="muted">{t('Use the form above when you need prayer, guidance or pastoral follow-up.','Usa el formulario de arriba cuando necesites oración, guía o seguimiento pastoral.')}</p></div>}</section>

    {isPastoral&&<details className="card" style={{padding:18,marginTop:24}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Pastoral tools','Herramientas pastorales')} • {queue.length} {t('care requests','solicitudes')}</summary><section className="pastoral-section" style={{marginTop:18}}><div className="section-heading"><div><div className="pill">{t('PASTORAL QUEUE','COLA PASTORAL')}</div><h2>{t('Requests requiring follow-up','Solicitudes que necesitan seguimiento')}</h2></div><span className="small muted">{t('Pastor and church-admin only.','Solo pastor y administrador de iglesia.')}</span></div><div className="pastoral-grid">{queue.map((r:any)=>{const p=profileMap.get(r.user_id),d=detailMap.get(r.user_id),assignee=profileMap.get(r.assigned_to);const contact=r.preferred_contact==='phone'?d?.phone:r.preferred_contact==='email'?d?.email:r.preferred_contact==='either'?[d?.phone,d?.email].filter(Boolean).join(' • '):t('In-app follow-up','Seguimiento en la aplicación');return <article className={`card pastoral-card ${r.urgency}`} key={r.id}><div className="care-head"><div className="pastoral-person"><div className="avatar">{personName(p,t('Church member','Miembro')).slice(0,1).toUpperCase()}</div><div><strong>{personName(p,t('Church member','Miembro'))}</strong><div className="pastoral-contact">{label(categoryRows,r.category,es)} • {label(contactRows,r.preferred_contact,es)}{contact?` • ${contact}`:''}</div></div></div><div><span className={`care-chip ${r.urgency}`}>{label(urgencyRows,r.urgency,es)}</span> <span className={`care-status ${r.status}`}>{label(statusRows,r.status,es)}</span></div></div><h3>{r.subject}</h3><p className="care-message">{r.message}</p>{r.assigned_to&&<div className="small muted"><UserRoundCheck size={12}/> {t('Assigned to','Asignado a')} {personName(assignee,t('Leader','Líder'))}</div>}{r.leadership_note&&<div className="pastoral-note"><strong>{t('Internal note','Nota interna')}:</strong> {r.leadership_note}</div>}<form action={updateCareRequest} className="pastoral-controls"><input type="hidden" name="request_id" value={r.id}/><input type="hidden" name="lang" value={es?'es':'en'}/><label><span>{t('Status','Estado')}</span><select name="status" defaultValue={r.status}>{statusRows.filter(([v])=>v!=='withdrawn').map(([v,en,sp])=><option value={v} key={v}>{es?sp:en}</option>)}</select></label><label><span>{t('Assigned to','Asignado a')}</span><select name="assigned_to" defaultValue={r.assigned_to??''}><option value="">{t('Unassigned','Sin asignar')}</option>{pastorOptions.map((o:any)=><option value={o.id} key={o.id}>{o.name}</option>)}</select></label><label className="note-field"><span>{t('Internal leadership note','Nota interna de liderazgo')}</span><input name="leadership_note" maxLength={2000} defaultValue={r.leadership_note??''} placeholder={t('Pastoral follow-up notes only','Notas de seguimiento pastoral')}/></label><HelpSubmitButton label={t('Save','Guardar')} pendingLabel={t('Saving… keep this page open','Guardando… mantén esta página abierta')}/></form></article>})}{!queue.length&&<div className="card care-empty"><h3>{t('No pastoral-care requests.','No hay solicitudes pastorales.')}</h3><p className="muted">{t('New private requests will appear here.','Las nuevas solicitudes privadas aparecerán aquí.')}</p></div>}</div></section></details>}
  </main>
}
