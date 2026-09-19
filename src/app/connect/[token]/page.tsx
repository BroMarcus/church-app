import Link from 'next/link'
import {randomUUID} from 'node:crypto'
import {createClient} from '@/lib/supabase/server'
import {submitConnectionCard} from '../actions'
import '../connect.css'

const typeLabel=(type:string,es:boolean)=>{const labels:Record<string,[string,string]>={member_invite:['Personal invitation','Invitación personal'],friendship_group:['Friendship Group','Grupo de Amistad'],church_service:['Church service','Servicio de la iglesia'],front_door:['Church welcome','Bienvenida de la iglesia'],outreach:['Outreach','Evangelismo'],event:['Event','Evento'],campaign:['Campaign','Campaña']};const row=labels[type];return row?(es?row[1]:row[0]):type.replaceAll('_',' ')}

export default async function PublicConnectPage({params,searchParams}:{params:Promise<{token:string}>;searchParams:Promise<{status?:string;error?:string;lang?:string}>}){
  const {token}=await params
  const query=await searchParams
  const supabase=await createClient()
  const {data,error}=await supabase.rpc('resolve_outreach_source_link',{p_token:token}).maybeSingle()
  const source:any=data
  const sourceLang=source?.language_code==='es'?'es':'en'
  const lang:'en'|'es'=query.lang==='es'?'es':query.lang==='en'?'en':sourceLang
  const es=lang==='es'
  const swap=`/connect/${encodeURIComponent(token)}?lang=${es?'en':'es'}`

  if(error||!source){return <main className="connect-shell"><section className="connect-card connect-success"><div className="connect-actions" style={{justifyContent:'flex-end'}}><Link className="connect-btn secondary" href={swap}>{es?'English':'Español'}</Link></div><div className="connect-pill">{es?'ENLACE NO DISPONIBLE':'LINK NOT AVAILABLE'}</div><h1>{es?'Este enlace no está disponible ahora.':'This connection link is not available right now.'}</h1><p className="connect-muted">{es?'Puede estar vencido, pausado o desactivado. Pida a la persona que lo invitó un enlace nuevo o comuníquese directamente con la iglesia.':'It may be expired, paused, or inactive. Ask the person who invited you for a new link or contact the church directly.'}</p></section></main>}

  if(query.status==='connected'||query.status==='review'){
    const review=query.status==='review'
    return <main className="connect-shell"><section className="connect-card connect-success"><div className="connect-pill">{review?(es?'RECIBIDO — REVISIÓN SEGURA':'RECEIVED — SAFE REVIEW'):(es?'YA ESTÁ CONECTADO':'YOU’RE CONNECTED')}</div><h1>{review?(es?'Recibimos su información.':'We received your information.'):(es?'Gracias por conectarse.':'Thanks for connecting.')}</h1><p className="connect-muted">{review?(es?'Parece que la iglesia puede tener más de un registro parecido. Un líder lo revisará para conectarlo correctamente. No necesita volver a enviarlo.':'The church may have more than one similar record. A leader will review it so your history connects correctly. You do not need to submit again.'):(es?'Su información quedó en la lista de seguimiento de la iglesia. Alguien podrá comunicarse con usted para ayudarle con su próximo paso.':'Your information is now in the church follow-up flow. Someone can follow up with you and help with your next step.')}</p><div className="connect-actions" style={{justifyContent:'center',marginTop:18}}><Link className="connect-btn" href={`/join/${source.church_slug}?lang=${lang}`}>{es?'Crear o abrir mi cuenta':'Create or open my account'}</Link><Link className="connect-btn secondary" href={swap}>{es?'English':'Español'}</Link></div></section></main>
  }

  const requestKey=randomUUID()
  const sourceName=source.source_label||typeLabel(source.source_type,es)
  // Anonymous Friendship Group context stays intentionally coarse. Exact/private
  // meeting locations are never rendered from this public connection page.
  const groupMeta=source.source_group_id?[source.group_name,source.group_meeting_day].filter(Boolean).join(' • '):null

  return <main className="connect-shell">
    <div className="connect-top"><div><div className="connect-brand">Kingdom <span>Network</span></div><div className="connect-muted">{source.church_name}</div></div><Link className="connect-btn secondary" href={swap}>{es?'English':'Español'}</Link></div>

    <section className="connect-card connect-hero"><div className="connect-pill">{es?'BIENVENIDO':'WELCOME'}</div><h1>{es?'Nos alegra que esté aquí.':'We’re glad you’re here.'}</h1><p className="connect-muted">{es?'Comparta solo lo necesario para que la iglesia pueda darle seguimiento. No necesita una cuenta para conectarse.':'Share only what is needed so the church can follow up with you. You do not need an account to connect.'}</p><div className="connect-source"><span>{typeLabel(source.source_type,es)}</span><span>{sourceName}</span>{groupMeta&&<span>{groupMeta}</span>}</div></section>

    {query.error&&<div className="connect-notice error">{es?'No pudimos confirmar que se guardó. No presione enviar muchas veces. Revise su conexión e inténtelo una vez más.':'We could not confirm that it saved. Please do not press submit repeatedly. Check your connection and try once more.'}</div>}

    <section className="connect-card"><form action={submitConnectionCard} className="connect-form"><input type="hidden" name="token" value={token}/><input type="hidden" name="request_key" value={requestKey}/><input type="hidden" name="lang" value={lang}/><div className="connect-grid"><label><span>{es?'Nombre':'First name'}</span><input name="first_name" required autoComplete="given-name" maxLength={120}/></label><label><span>{es?'Apellido (opcional)':'Last name (optional)'}</span><input name="last_name" autoComplete="family-name" maxLength={120}/></label></div><div className="connect-grid"><label><span>{es?'Teléfono':'Phone'}</span><input name="phone" type="tel" autoComplete="tel"/></label><label><span>{es?'Correo electrónico':'Email'}</span><input name="email" type="email" autoComplete="email"/></label></div><div className="connect-safe">{es?'Ingrese por lo menos un teléfono o correo. Kingdom Network usa esto para evitar registros duplicados y ayudar a la iglesia a reconocer cuando usted vuelve.':'Enter at least a phone number or email. Kingdom Network uses it to prevent duplicate records and help the church recognize when you return.'}</div><label className="connect-check"><input type="checkbox" name="sms_consent"/> <span>{es?'Acepto recibir mensajes de texto relacionados con seguimiento de la iglesia.':'I agree to receive text messages related to church follow-up.'}</span></label><label className="connect-check"><input type="checkbox" name="email_consent"/> <span>{es?'Acepto recibir correos relacionados con seguimiento de la iglesia.':'I agree to receive email related to church follow-up.'}</span></label><details className="connect-details"><summary>{es?'Quiero compartir un poco más (opcional)':'I want to share a little more (optional)'}</summary><div className="connect-form"><label className="connect-check"><input type="checkbox" name="bible_study_interest"/> <span>{es?'Me interesa un estudio bíblico.':'I’m interested in a Bible study.'}</span></label><label className="connect-check"><input type="checkbox" name="first_steps_interest"/> <span>{es?'Me interesa Primeros Pasos / conocer mi próximo paso.':'I’m interested in First Steps / learning my next step.'}</span></label><label><span>{es?'Petición de oración no confidencial (opcional)':'Non-confidential prayer request (optional)'}</span><textarea name="prayer_request" rows={3} maxLength={1000} placeholder={es?'No incluya aquí asuntos pastorales privados o información muy sensible.':'Please do not put private pastoral matters or highly sensitive information here.'}/></label></div></details><button>{es?'Conectarme con la iglesia':'Connect with the church'}</button></form></section>

    <div className="connect-safe">{es?'Este enlace registra cómo se conectó con la iglesia. No le da automáticamente membresía, acceso a un Grupo de Amistad, dirección privada, liderazgo ni permisos especiales.':'This link records how you connected with the church. It does not automatically grant membership, Friendship Group access, private addresses, leadership, or special permissions.'}</div>
  </main>
}
