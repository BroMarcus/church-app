import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Languages,MessageSquareWarning } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BadgeSeal } from '@/components/badge-seal'
import { AvatarUploader } from './avatar-uploader'
import { updateProfile } from './actions'
import './badges.css'

const titleCase=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function ProfilePage({searchParams}:{searchParams:Promise<{saved?:string;error?:string;lang?:string}>}){
  const params=await searchParams,es=params.lang==='es',t=(en:string,sp:string)=>es?sp:en,suffix=es?'?lang=es':''
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims();const userId=claimsData?.claims?.sub
  if(!userId)redirect(`/login${suffix}`)

  const [profileResult,detailsResult,membershipResult,groupMembershipResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).single(),
    supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single(),
    supabase.from('group_memberships').select('role,groups(id,name,group_type,active)').eq('user_id',userId)
  ])
  const profile:any=profileResult.data,details:any=detailsResult.data,membership:any=membershipResult.data,groupMemberships:any[]=groupMembershipResult.data??[]

  let badges:any[]=[]
  if(membership?.church_id){const badgeResult=await supabase.from('member_badges').select('earned_at,badges(name,description,category,icon_key,badge_kind,visual_tier,display_order)').eq('user_id',userId).order('earned_at',{ascending:false});badges=badgeResult.data??[]}
  const church:any=Array.isArray(membership?.churches)?membership.churches[0]:membership?.churches
  const role=String(membership?.role??'member'),isAdmin=role==='pastor'||role==='church_admin'
  const credentials=badges.filter((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?.badge_kind!=='learning_trophy'})
  const trophies=badges.filter((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?.badge_kind==='learning_trophy'})
  const groupRoles=groupMemberships.flatMap((row:any)=>{const group=Array.isArray(row.groups)?row.groups[0]:row.groups;if(!group?.active)return[];return[{id:group.id,name:group.name,type:group.group_type,role:String(row.role??'member')}]})

  return <main className="shell">
    <div className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('My Profile','Mi Perfil')}</div></div><div className="row"><Languages size={15}/><Link className="ghost" href="/profile?lang=en">English</Link><Link className="ghost" href="/profile?lang=es">Español</Link><Link className="ghost" href={`/feedback${suffix}`}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href="/">← {t('Home','Inicio')}</Link></div></div>
    {params.saved&&<div className="notice success">{t('Profile saved.','Perfil guardado.')}</div>}{params.error&&<div className="notice error">{params.error}</div>}

    <section className="card" style={{padding:22,marginBottom:18}}><div className="pill">{t('MY PROFILE','MI PERFIL')}</div><h1 style={{margin:'9px 0 6px'}}>{t('Tell us who you are.','Cuéntanos quién eres.')}</h1><p className="muted" style={{margin:0}}>{t('Start with the basics. You can add the rest later.','Comienza con lo básico. Puedes agregar lo demás después.')}</p></section>

    <AvatarUploader userId={userId} currentPath={profile?.avatar_path}/>

    <form action={updateProfile} className="card" style={{padding:22,marginTop:18,maxWidth:820}}><input type="hidden" name="lang" value={es?'es':'en'}/><div className="pill">{t('ABOUT ME','SOBRE MÍ')}</div><div className="row"><label className="field" style={{flex:1}}><span>{t('First name','Nombre')}</span><input name="first_name" defaultValue={profile?.first_name??''}/></label><label className="field" style={{flex:1}}><span>{t('Last name','Apellido')}</span><input name="last_name" defaultValue={profile?.last_name??''}/></label></div><label className="field"><span>{t('Display name','Nombre para mostrar')}</span><input name="display_name" defaultValue={profile?.display_name??''}/></label><label className="field"><span>{t('A little about me','Un poco sobre mí')}</span><textarea name="bio" defaultValue={profile?.bio??''} rows={4} placeholder={t('Optional — share a little about yourself.','Opcional — comparte un poco sobre ti.')}/></label>

      <details className="card" style={{padding:16,margin:'20px 0 0'}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Contact information','Información de contacto')}</summary><div style={{marginTop:14}}><p className="small muted">{t('Add what you want your church to have. Private address details are visible only to you and authorized leadership.','Agrega lo que quieras que tenga tu iglesia. La dirección privada solo es visible para ti y liderazgo autorizado.')}</p><label className="field"><span>{t('Contact email','Correo de contacto')}</span><input name="contact_email" type="email" defaultValue={profile?.contact_email??''} placeholder="name@example.com"/></label><label className="row" style={{alignItems:'flex-start',margin:'8px 0 18px'}}><input name="show_contact_email" type="checkbox" defaultChecked={profile?.show_contact_email!==false} style={{marginTop:3}}/><span className="small">{t('Allow permitted church members to see my contact email.','Permitir que miembros autorizados vean mi correo de contacto.')}</span></label><label className="field"><span>{t('Phone','Teléfono')}</span><input name="phone" type="tel" defaultValue={details?.phone??''}/></label><label className="field"><span>{t('Address','Dirección')}</span><input name="address_line1" defaultValue={details?.address_line1??''}/></label><label className="field"><span>{t('Address line 2','Dirección línea 2')}</span><input name="address_line2" defaultValue={details?.address_line2??''}/></label><div className="row"><label className="field" style={{flex:1}}><span>{t('City','Ciudad')}</span><input name="city" defaultValue={details?.city??''}/></label><label className="field" style={{width:110}}><span>{t('State','Estado')}</span><input name="state" defaultValue={details?.state??''}/></label><label className="field" style={{width:140}}><span>ZIP</span><input name="postal_code" defaultValue={details?.postal_code??''}/></label></div><div className="row"><label className="field" style={{flex:1}}><span>{t('Birthday','Cumpleaños')}</span><input name="birthday" type="date" defaultValue={details?.birthday??''}/></label><label className="field" style={{flex:1}}><span>{t('Marriage anniversary','Aniversario de bodas')}</span><input name="marriage_anniversary" type="date" defaultValue={details?.marriage_anniversary??''}/></label></div><div className="notice"><strong>{t('Login email','Correo de acceso')}:</strong> {details?.email??'—'}<div className="small muted">{t('Change this under Login & Security, not here.','Cámbialo en Inicio de sesión y seguridad, no aquí.')}</div></div></div></details>

      <button className="btn" style={{marginTop:18}}>{t('Save my profile','Guardar mi perfil')}</button>
    </form>

    <section style={{marginTop:22}}><div className="pill" style={{marginBottom:12}}>{t('MY RECORDS & ACCOUNT','MIS REGISTROS Y CUENTA')}</div><div style={{display:'grid',gap:12}}>
      <details className="card" style={{padding:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Roles & church connections','Roles y conexiones de iglesia')}</summary><div style={{marginTop:14}}><p className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {titleCase(role)}</p>{groupRoles.map((g:any)=><p className="small" key={`${g.id}-${g.role}`}><strong>{g.name}</strong> — {titleCase(g.role)}</p>)}{isAdmin&&<Link className="ghost" href="/church/roles">{t('Manage roles & permissions','Administrar roles y permisos')}</Link>}</div></details>

      <details className="card" style={{padding:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Credentials & learning trophies','Credenciales y trofeos de aprendizaje')}</summary><div style={{marginTop:14}}><div className="badge-shelf">{credentials.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} key={`${b.name}-${row.earned_at}`}/>:null})}{!credentials.length&&<div className="badge-empty">{t('Verified credentials will appear here as you complete approved pathways.','Las credenciales verificadas aparecerán aquí cuando completes rutas aprobadas.')}</div>}</div><div className="badge-shelf" style={{marginTop:14}}>{trophies.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} compact key={`${b.name}-${row.earned_at}`}/>:null})}</div></div></details>

      <details className="card" style={{padding:18}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('Privacy, security & my data','Privacidad, seguridad y mis datos')}</summary><div className="row" style={{marginTop:14,flexWrap:'wrap'}}><Link className="ghost" href="/account/privacy">{t('Privacy','Privacidad')}</Link><Link className="ghost" href="/account/security">{t('Login & security','Acceso y seguridad')}</Link><Link className="ghost" href="/account/notifications">{t('Notifications','Notificaciones')}</Link><Link className="ghost" href="/account/data">{t('My data','Mis datos')}</Link></div></details>
    </div></section>

    <section className="card" style={{padding:18,marginTop:22}}><div className="row" style={{justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{t('Looking for your spiritual milestones?','¿Buscas tus hitos espirituales?')}</strong><div className="small muted">{t('They now live in My Journey so this page stays focused on your profile.','Ahora están en Mi Camino para que esta página se enfoque en tu perfil.')}</div></div><Link className="btn secondary" href={`/journey${suffix}`}>{t('Open My Journey','Abrir Mi Camino')}</Link></div></section>
  </main>
}
