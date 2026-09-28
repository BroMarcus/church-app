import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Bell,BookOpen,FileCheck,HandHeart,MessageCircle,MessageSquareText,MessageSquareWarning,ShieldAlert,Users} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {saveNotificationPreferences} from './actions'
import {NotificationSubmitButton} from './notification-submit-button'
import './preferences.css'

const statusCopy={
  auth_unavailable:{en:'We could not safely verify your account right now. Nothing was changed. Please try again.',es:'No pudimos verificar tu cuenta de forma segura en este momento. No se cambió nada. Inténtalo otra vez.'},
  save_failed:{en:'We could not save your notification preferences right now. Nothing was changed. Please try again.',es:'No pudimos guardar tus preferencias de notificación en este momento. No se cambió nada. Inténtalo otra vez.'},
  generic:{en:'We could not complete that notification change. Nothing was changed. Please try again.',es:'No pudimos completar ese cambio de notificaciones. No se cambió nada. Inténtalo otra vez.'},
} as const

type NotificationStatus=keyof typeof statusCopy
const bounded=(value:unknown)=>String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'unknown'
const thrownCode=(error:unknown)=>bounded((error as {code?:unknown})?.code??(error instanceof Error?error.name:'thrown'))

export default async function NotificationPreferencesPage({searchParams}:{searchParams:Promise<{saved?:string;status?:string;error?:string;lang?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const items=[
    ['direct_messages',t('Private Messages','Mensajes Privados'),t('New private messages from church members.','Nuevos mensajes privados de miembros.'),MessageCircle,'community'],
    ['community',t('Community','Comunidad'),t('Comments and activity on your community posts.','Comentarios y actividad en tus publicaciones.'),MessageCircle,'community'],
    ['church_updates',t('Church Updates','Avisos de la Iglesia'),t('Official announcements from your local church.','Anuncios oficiales de tu iglesia local.'),MessageSquareText,'church'],
    ['network_updates',t('District & Organization','Distrito y Organización'),t('Important updates beyond your local church.','Avisos importantes más allá de tu iglesia local.'),MessageSquareText,'church'],
    ['groups',t('Groups','Grupos'),t('Friendship Group requests and updates.','Solicitudes y avisos de Grupos de Amistad.'),Users,'church'],
    ['serving',t('Serving & Teams','Servicio y Equipos'),t('Assignments and ministry application updates.','Asignaciones y cambios en solicitudes de ministerio.'),HandHeart,'growth'],
    ['learning',t('Learning','Aprendizaje'),t('Credentials and learning achievements.','Credenciales y logros de aprendizaje.'),BookOpen,'growth'],
    ['documents',t('Documents','Documentos'),t('Document verification and review status.','Estado de verificación y revisión de documentos.'),FileCheck,'growth'],
    ['pastoral_care',t('Private Care','Cuidado Privado'),t('Updates about your private pastoral-care requests.','Cambios en tus solicitudes privadas de cuidado pastoral.'),HandHeart,'care']
  ] as const
  const recovery=(code:string)=>{console.error('Notification preferences unavailable',{code});return <main className="shell"><section className="card" style={{maxWidth:720,margin:'40px auto',padding:24}}><div className="pill">{t('NOTIFICATIONS','NOTIFICACIONES')}</div><h1>{t('We could not load your notification preferences.','No pudimos cargar tus preferencias de notificación.')}</h1><p className="muted">{t('Nothing was changed. Please try again.','No se cambió nada. Inténtalo otra vez.')}</p><div className="row"><Link className="btn" href={l('/account/notifications')}>{t('Try again','Intentar otra vez')}</Link><Link className="ghost" href={l('/')}>{t('Home','Inicio')}</Link></div></section></main>}
  let supabase
  try{supabase=await createClient()}catch(error){return recovery(`client:${thrownCode(error)}`)}
  let claimsResult
  try{claimsResult=await supabase.auth.getClaims()}catch(error){return recovery(`claims:${thrownCode(error)}`)}
  const {data:claims,error:claimsError}=claimsResult,userId=claims?.claims?.sub
  if(claimsError)return recovery(`claims:${bounded(claimsError.code)}`)
  if(!userId)redirect(`/login?mode=signin&lang=${es?'es':'en'}`)
  let prefsResult
  try{prefsResult=await supabase.from('notification_preferences').select('*').eq('user_id',userId).maybeSingle()}catch(error){return recovery(`preferences:${thrownCode(error)}`)}
  if(prefsResult.error)return recovery(`preferences:${bounded(prefsResult.error.code)}`)
  const prefs=prefsResult.data,on=(key:string)=>prefs?Boolean((prefs as Record<string,unknown>)[key]):true
  const groups=[['community',t('MESSAGES & COMMUNITY','MENSAJES Y COMUNIDAD')],['church',t('CHURCH LIFE','VIDA DE IGLESIA')],['growth',t('SERVING & GROWTH','SERVICIO Y CRECIMIENTO')],['care',t('PRIVATE CARE','CUIDADO PRIVADO')]] as const
  const status=(query.status&&Object.prototype.hasOwnProperty.call(statusCopy,query.status)?query.status:query.error?'generic':null) as NotificationStatus|null
  const statusMessage=status?statusCopy[status][es?'es':'en']:null

  return <main className="shell"><header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{t('My Account • Notifications','Mi Cuenta • Notificaciones')}</div></div><div className="row"><Link className="ghost" href="/account/notifications?lang=en">English</Link><Link className="ghost" href="/account/notifications?lang=es">Español</Link><Link className="ghost" href={l('/notifications')}>{t('Notification Inbox','Bandeja')}</Link><Link className="ghost" href={l('/account/privacy')}>{t('Privacy','Privacidad')}</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="prefs-hero card"><div><div className="pill">{t('NOTIFICATION PREFERENCES','PREFERENCIAS DE NOTIFICACIÓN')}</div><h1>{t('Choose what you want to hear about.','Elige sobre qué quieres recibir avisos.')}</h1><p className="muted">{t('Turning off an alert does not remove the underlying record or responsibility. It only quiets that notification category.','Desactivar un aviso no elimina el registro ni la responsabilidad. Solo silencia esa categoría de notificación.')}</p></div><div className="hero-stat"><Bell size={24}/><span>{t('In-app alerts','Avisos en la aplicación')}</span></div></section>
    {query.saved&&<div className="notice success" role="status" aria-live="polite">{t('Notification preferences saved.','Preferencias de notificación guardadas.')}</div>}{statusMessage&&<div className="notice error" role="alert">{statusMessage}</div>}

    <form action={saveNotificationPreferences}><input type="hidden" name="lang" value={es?'es':'en'}/>{groups.map(([groupKey,groupTitle])=><section className="card prefs-card" style={{marginBottom:14}} key={groupKey}><div className="pill">{groupTitle}</div><div className="prefs-grid" style={{marginTop:12}}>{items.filter(([, , , ,group])=>group===groupKey).map(([key,title,body,Icon])=><div className="pref-item" key={key}><label><input type="checkbox" name={key} defaultChecked={on(key)}/><div><strong><Icon size={12}/> {title}</strong><span>{body}</span></div></label></div>)}</div></section>)}<NotificationSubmitButton label={t('Save notification preferences','Guardar preferencias')} pendingLabel={t('Saving preferences…','Guardando preferencias…')}/></form>

    <details className="card prefs-note" style={{marginTop:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('About safety alerts','Acerca de los avisos de seguridad')}</summary><p style={{marginTop:12}}><ShieldAlert size={12}/> {t('Certain moderation or safety alerts for authorized leadership cannot be muted by personal notification settings because someone is responsible for reviewing them.','Algunos avisos de moderación o seguridad para liderazgo autorizado no pueden silenciarse porque alguien es responsable de revisarlos.')}</p></details>
  </main>
}
