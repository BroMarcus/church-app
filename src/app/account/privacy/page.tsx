import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Eye,EyeOff,LockKeyhole,MessageCircle,MessageSquareWarning,ShieldCheck,UserRound} from 'lucide-react'
import {createClient} from '@/lib/supabase/server'
import {savePrivacySettings} from './actions'
import {PrivacySubmitButton} from './privacy-submit-button'
import './privacy.css'

const statusCopy={
  invalid_messaging:{en:'Choose one of the available messaging options and try again.',es:'Elige una de las opciones de mensajes disponibles e inténtalo otra vez.'},
  save_failed:{en:'We could not save your privacy settings right now. Nothing was changed. Please try again.',es:'No pudimos guardar tu configuración de privacidad en este momento. No se cambió nada. Inténtalo otra vez.'},
  generic:{en:'We could not complete that privacy change. Nothing was changed. Please try again.',es:'No pudimos completar ese cambio de privacidad. No se cambió nada. Inténtalo otra vez.'},
} as const

type PrivacyStatus=keyof typeof statusCopy

export default async function PrivacyPage({searchParams}:{searchParams:Promise<{saved?:string;status?:string;error?:string;lang?:string}>}){
  const query=await searchParams,es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient(),{data:claims}=await supabase.auth.getClaims(),userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const membershipResult=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',userId).eq('status','active').limit(1).maybeSingle()
  if(membershipResult.error){
    console.error('Privacy membership lookup failed',{code:membershipResult.error.code})
    return <main className="shell"><section className="card" style={{maxWidth:720,margin:'40px auto',padding:24}}><div className="pill">{t('PRIVACY','PRIVACIDAD')}</div><h1>{t('We could not load your privacy settings.','No pudimos cargar tu configuración de privacidad.')}</h1><p className="muted">{t('Nothing was changed. Please try again.','No se cambió nada. Inténtalo otra vez.')}</p><div className="row"><Link className="btn" href={l('/account/privacy')}>{t('Try again','Intentar otra vez')}</Link><Link className="ghost" href={l('/')}>{t('Home','Inicio')}</Link></div></section></main>
  }
  const membership=membershipResult.data
  if(!membership?.church_id)redirect(l('/'))
  const profileResult=await supabase.from('profiles').select('directory_visible,messaging_preference,show_contact_email,show_verified_credentials,show_learning_trophies,contact_email').eq('id',userId).maybeSingle()
  if(profileResult.error){
    console.error('Privacy profile lookup failed',{code:profileResult.error.code})
    return <main className="shell"><section className="card" style={{maxWidth:720,margin:'40px auto',padding:24}}><div className="pill">{t('PRIVACY','PRIVACIDAD')}</div><h1>{t('We could not load your privacy settings.','No pudimos cargar tu configuración de privacidad.')}</h1><p className="muted">{t('Nothing was changed. Please try again.','No se cambió nada. Inténtalo otra vez.')}</p><div className="row"><Link className="btn" href={l('/account/privacy')}>{t('Try again','Intentar otra vez')}</Link><Link className="ghost" href={l('/')}>{t('Home','Inicio')}</Link></div></section></main>
  }
  const profile=profileResult.data
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const status=(query.status&&Object.prototype.hasOwnProperty.call(statusCopy,query.status)?query.status:query.error?'generic':null) as PrivacyStatus|null
  const statusMessage=status?statusCopy[status][es?'es':'en']:null

  return <main className="shell"><header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Privacy','Privacidad')}</div></div><div className="row"><Link className="ghost" href="/account/privacy?lang=en">English</Link><Link className="ghost" href="/account/privacy?lang=es">Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/profile')}>{t('My Profile','Mi Perfil')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="privacy-hero card"><div><div className="pill">{t('MY PRIVACY','MI PRIVACIDAD')}</div><h1>{t('Choose what other members can see.','Elige lo que otros miembros pueden ver.')}</h1><p className="muted">{t('Your private church records keep their own stricter protections no matter what you choose here.','Tus registros privados de iglesia mantienen protecciones más estrictas sin importar lo que elijas aquí.')}</p></div><div className="hero-stat"><ShieldCheck size={24}/><span>{t('You control this','Tú lo controlas')}</span></div></section>
    {query.saved&&<div className="notice success" role="status" aria-live="polite">{t('Privacy settings saved.','Configuración de privacidad guardada.')}</div>}{statusMessage&&<div className="notice error" role="alert">{statusMessage}</div>}

    <section className="card privacy-card" style={{maxWidth:820,margin:'0 auto'}}><div className="pill">{t('WHAT CAN PEOPLE SEE?','¿QUÉ PUEDEN VER LOS DEMÁS?')}</div><form action={savePrivacySettings}><input type="hidden" name="lang" value={es?'es':'en'}/><div className="privacy-options">
      <div className="privacy-option"><label><input type="checkbox" name="directory_visible" defaultChecked={profile?.directory_visible??true}/><div><strong><UserRound size={12}/> {t('Show me in the church Directory','Mostrarme en el Directorio')}</strong><span>{t('Turn this off if you do not want ordinary members to find your profile while browsing.','Desactívalo si no quieres que miembros comunes encuentren tu perfil al navegar.')}</span></div></label></div>
      <div className="privacy-option"><label><input type="checkbox" name="show_contact_email" defaultChecked={profile?.show_contact_email??false}/><div><strong>{t('Show my contact email','Mostrar mi correo de contacto')}</strong><span>{t('This is the separate contact email on your profile—not your private login email.','Este es el correo de contacto de tu perfil, no tu correo privado de acceso.')}</span></div></label>{profile?.contact_email&&<div className="privacy-state">{profile.contact_email}</div>}</div>
      <div className="privacy-option"><label><input type="checkbox" name="show_verified_credentials" defaultChecked={profile?.show_verified_credentials??true}/><div><strong>{t('Show my verified credentials','Mostrar mis credenciales verificadas')}</strong><span>{t('Controls whether approved credentials appear on your public church profile.','Controla si las credenciales aprobadas aparecen en tu perfil de iglesia.')}</span></div></label></div>
      <div className="privacy-option"><label><input type="checkbox" name="show_learning_trophies" defaultChecked={profile?.show_learning_trophies??true}/><div><strong>{t('Show my learning trophies','Mostrar mis trofeos de aprendizaje')}</strong><span>{t('This only changes what others see. Your course progress stays saved.','Esto solo cambia lo que otros ven. Tu progreso de cursos permanece guardado.')}</span></div></label></div>
      <div className="privacy-option"><div><strong><MessageCircle size={12}/> {t('Who can message me?','¿Quién puede enviarme mensajes?')}</strong><span>{t('Choose who may start or continue private conversations with you.','Elige quién puede iniciar o continuar conversaciones privadas contigo.')}</span></div><select name="messaging_preference" defaultValue={profile?.messaging_preference??'church'}><option value="church">{t('Any active member of my church','Cualquier miembro activo de mi iglesia')}</option><option value="leaders_only">{t('Church leaders only','Solo líderes de la iglesia')}</option><option value="none">{t('Nobody','Nadie')}</option></select></div>
    </div><PrivacySubmitButton label={t('Save privacy settings','Guardar privacidad')} pendingLabel={t('Saving privacy…','Guardando privacidad…')}/></form></section>

    <details className="card" style={{padding:18,maxWidth:820,margin:'18px auto 0'}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('What always stays private?','¿Qué siempre permanece privado?')}</summary><div style={{display:'grid',gap:10,marginTop:12}}><p className="small muted"><LockKeyhole size={12}/> {t('Your login email is never shown to ordinary church members.','Tu correo de acceso nunca se muestra a miembros comunes.')}</p><p className="small muted"><ShieldCheck size={12}/> {t('Pastoral Care, private documents, home addresses, Outreach notes and leadership-only records keep separate access rules.','Cuidado Pastoral, documentos privados, direcciones, notas de Evangelismo y registros de liderazgo mantienen reglas separadas.')}</p><p className="small muted">{profile?.directory_visible??true?<><Eye size={12}/> {t('Your Directory profile is currently visible.','Tu perfil del Directorio está visible actualmente.')}</>:<><EyeOff size={12}/> {t('Your Directory profile is currently hidden.','Tu perfil del Directorio está oculto actualmente.')}</>}</p></div></details>
  </main>
}