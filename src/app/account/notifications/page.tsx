import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell,BookOpen,FileCheck,HandHeart,MessageCircle,MessageSquareText,MessageSquareWarning,ShieldAlert,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveNotificationPreferences } from './actions'
import './preferences.css'

export default async function NotificationPreferencesPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;lang?:string}>}){
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
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:prefs}=await supabase.from('notification_preferences').select('*').eq('user_id',userId).maybeSingle(),on=(key:string)=>prefs?Boolean((prefs as any)[key]):true
  const groups=[['community',t('MESSAGES & COMMUNITY','MENSAJES Y COMUNIDAD')],['church',t('CHURCH LIFE','VIDA DE IGLESIA')],['growth',t('SERVING & GROWTH','SERVICIO Y CRECIMIENTO')],['care',t('PRIVATE CARE','CUIDADO PRIVADO')]] as const

  return <main className="shell"><header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{t('My Account • Notifications','Mi Cuenta • Notificaciones')}</div></div><div className="row"><Link className="ghost" href="/account/notifications?lang=en">English</Link><Link className="ghost" href="/account/notifications?lang=es">Español</Link><Link className="ghost" href={l('/notifications')}>{t('Notification Inbox','Bandeja')}</Link><Link className="ghost" href={l('/account/privacy')}>{t('Privacy','Privacidad')}</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="prefs-hero card"><div><div className="pill">{t('NOTIFICATION PREFERENCES','PREFERENCIAS DE NOTIFICACIÓN')}</div><h1>{t('Choose what you want to hear about.','Elige sobre qué quieres recibir avisos.')}</h1><p className="muted">{t('Turning off an alert does not remove the underlying record or responsibility. It only quiets that notification category.','Desactivar un aviso no elimina el registro ni la responsabilidad. Solo silencia esa categoría de notificación.')}</p></div><div className="hero-stat"><Bell size={24}/><span>{t('In-app alerts','Avisos en la aplicación')}</span></div></section>
    {query.saved&&<div className="notice success">{t('Notification preferences saved.','Preferencias de notificación guardadas.')}</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <form action={saveNotificationPreferences}><input type="hidden" name="lang" value={es?'es':'en'}/>{groups.map(([groupKey,groupTitle])=><section className="card prefs-card" style={{marginBottom:14}} key={groupKey}><div className="pill">{groupTitle}</div><div className="prefs-grid" style={{marginTop:12}}>{items.filter(([, , , ,group])=>group===groupKey).map(([key,title,body,Icon])=><div className="pref-item" key={key}><label><input type="checkbox" name={key} defaultChecked={on(key)}/><div><strong><Icon size={12}/> {title}</strong><span>{body}</span></div></label></div>)}</div></section>)}<button className="btn" style={{marginTop:4}}>{t('Save notification preferences','Guardar preferencias')}</button></form>

    <details className="card prefs-note" style={{marginTop:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('About safety alerts','Acerca de los avisos de seguridad')}</summary><p style={{marginTop:12}}><ShieldAlert size={12}/> {t('Certain moderation or safety alerts for authorized leadership cannot be muted by personal notification settings because someone is responsible for reviewing them.','Algunos avisos de moderación o seguridad para liderazgo autorizado no pueden silenciarse porque alguien es responsable de revisarlos.')}</p></details>
  </main>
}