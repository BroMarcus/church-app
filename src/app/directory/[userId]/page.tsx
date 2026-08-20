import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Droplets,Mail,MessageCircle,MessageSquareWarning,ShieldCheck,Sparkles,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BadgeSeal } from '@/components/badge-seal'
import { startConversation } from '@/app/messages/actions'

export default async function DirectoryMemberPage({params,searchParams}:{params:Promise<{userId:string}>;searchParams:Promise<{lang?:string}>}){
  const [{userId:targetUserId},query]=await Promise.all([params,searchParams]),es=query.lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const roleLabel=(v:string)=>v==='pastor'?t('Pastor','Pastor'):v==='church_admin'?t('Church Admin','Administrador de Iglesia'):v==='minister'?t('Minister','Ministro'):v==='ministry_leader'?t('Ministry Leader','Líder de Ministerio'):v==='group_leader'?t('Group Leader','Líder de Grupo'):t('Member','Miembro')
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const viewerId=claims?.claims?.sub
  if(!viewerId)redirect(l('/login'))
  const {data:viewer}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',viewerId).eq('status','active').limit(1).single()
  if(!viewer?.church_id)redirect('/')
  const {data:directoryMember}=await supabase.rpc('church_directory_member',{p_church_id:viewer.church_id,p_user_id:targetUserId})
  const profile:any=directoryMember?.[0]
  if(!profile)redirect(l('/directory'))

  const isSelf=targetUserId===viewerId
  const [targetComparisonResult,viewerComparisonResult,baptismResult]=await Promise.all([
    supabase.rpc('member_journey_comparison',{p_church_id:viewer.church_id,p_target_user_id:targetUserId}),
    isSelf?Promise.resolve({data:[] as any[]}):supabase.rpc('member_journey_comparison',{p_church_id:viewer.church_id,p_target_user_id:viewerId}),
    supabase.rpc('member_public_baptism',{p_church_id:viewer.church_id,p_user_id:targetUserId})
  ])
  const targetComparison:any=targetComparisonResult.data?.[0]??null,viewerComparison:any=(viewerComparisonResult as any).data?.[0]??null,baptism:any=baptismResult.data?.[0]??null
  const canCompare=!isSelf&&Boolean(profile.show_journey_comparison)&&Boolean(targetComparison)&&Boolean(viewerComparison)
  const canShowCredentials=Boolean(profile.show_verified_credentials),canShowTrophies=Boolean(profile.show_learning_trophies)
  let badgeRows:any[]=[]
  if(canShowCredentials||canShowTrophies){const {data:memberBadges}=await supabase.from('member_badges').select('badge_id,earned_at').eq('user_id',targetUserId).order('earned_at',{ascending:false});const badgeIds=(memberBadges??[]).map((b:any)=>b.badge_id);if(badgeIds.length){const {data}=await supabase.from('badges').select('id,name,description,category,icon_key,badge_kind,visual_tier,display_order').in('id',badgeIds).eq('active',true);const map=new Map((data??[]).map((b:any)=>[b.id,b]));badgeRows=(memberBadges??[]).map((m:any)=>({badge:map.get(m.badge_id),earned_at:m.earned_at})).filter((r:any)=>r.badge).sort((a:any,b:any)=>(a.badge.display_order??999)-(b.badge.display_order??999))}}
  const name=profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia')
  const church:any=Array.isArray(viewer.churches)?viewer.churches[0]:viewer.churches
  const credentials=canShowCredentials?badgeRows.filter((r:any)=>r.badge.badge_kind!=='learning_trophy'):[],trophies=canShowTrophies?badgeRows.filter((r:any)=>r.badge.badge_kind==='learning_trophy'):[]
  const avatarUrl=profile.avatar_path?supabase.storage.from('member-avatars').getPublicUrl(profile.avatar_path).data.publicUrl:null
  const fmtDate=(v?:string|null)=>v?new Date(`${v}T12:00:00`).toLocaleDateString(es?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}):''
  const comparisonRows=canCompare?[
    [t('Verified journey milestones','Hitos verificados'),Number(targetComparison.verified_milestones||0),Number(viewerComparison.verified_milestones||0)],
    [t('Courses completed','Cursos completados'),Number(targetComparison.courses_completed||0),Number(viewerComparison.courses_completed||0)],
    [t('Courses in progress','Cursos en progreso'),Number(targetComparison.courses_in_progress||0),Number(viewerComparison.courses_in_progress||0)]
  ]:[]

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Member Profile','Perfil de Miembro')}</div></div><div className="row"><Link className="ghost" href={`/directory/${targetUserId}?lang=en`}>English</Link><Link className="ghost" href={`/directory/${targetUserId}?lang=es`}>Español</Link><Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/directory')}>← {t('Directory','Directorio')}</Link><Link className="ghost" href={l('/')}>{t('Home','Inicio')}</Link></div></header>

    <section className="card" style={{padding:24,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div style={{display:'flex',alignItems:'center',gap:14}}>{avatarUrl?<img src={avatarUrl} alt={name} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--line)'}}/>:<div className="avatar" style={{width:64,height:64,fontSize:22}}>{name.slice(0,1).toUpperCase()}</div>}<div><div className="pill">{t('CHURCH PROFILE','PERFIL DE IGLESIA')}</div><h1 style={{margin:'8px 0 3px'}}>{name}</h1><div className="muted">{roleLabel(profile.role)}</div></div></div><div className="row">{!isSelf&&<form action={startConversation}><input type="hidden" name="target_user_id" value={targetUserId}/><input type="hidden" name="lang" value={es?'es':'en'}/><button className="btn"><MessageCircle size={14}/> {t('Message','Mensaje')}</button></form>}<UserRound size={28}/></div></section>

    <section style={{display:'grid',gap:15}}><article className="card" style={{padding:19}}><div className="pill">{t('ABOUT','SOBRE MÍ')}</div><p style={{lineHeight:1.65,whiteSpace:'pre-wrap'}}>{profile.bio||t('No bio has been shared yet.','Todavía no se ha compartido una biografía.')}</p>{profile.contact_email?<a className="ghost" href={`mailto:${profile.contact_email}`}><Mail size={13}/> {profile.contact_email}</a>:<p className="small muted">{t('This member has not shared a contact email.','Este miembro no ha compartido un correo de contacto.')}</p>}</article>

    {baptism&&<article className="card" style={{padding:19}}><div className="pill">{t('BAPTISM','BAUTISMO')}</div><h2><Droplets size={18} style={{verticalAlign:'middle'}}/> {t('Baptism information','Información de bautismo')}</h2><div style={{display:'grid',gap:7}}><div><strong>{baptism.baptized?t('Baptized','Bautizado'):t('Not recorded as baptized','No registrado como bautizado')}</strong>{baptism.baptism_date&&<span className="muted"> • {fmtDate(baptism.baptism_date)}</span>}</div>{baptism.officiant_name&&<div className="small"><strong>{t('Baptized by','Bautizado por')}:</strong> {baptism.officiant_name}</div>}{baptism.church_name&&<div className="small"><strong>{t('Church','Iglesia')}:</strong> {baptism.church_name}</div>}{baptism.pastor_name&&<div className="small"><strong>{t('Pastor at the time','Pastor en ese tiempo')}:</strong> {baptism.pastor_name}</div>}</div></article>}

    {canCompare&&<article className="card" style={{padding:19}}><div className="pill">{t('JOURNEY COMPARISON','COMPARACIÓN DE CAMINO')}</div><h2><Sparkles size={18} style={{verticalAlign:'middle'}}/> {t('Grow together—not compete','Crecer juntos, no competir')}</h2><p className="small muted">{t('This member chose to share only these broad progress totals. Private prayer, attendance, care notes, dates, scores and private Journey entries are never included.','Este miembro eligió compartir solo estos totales generales. Oración privada, asistencia, notas de cuidado, fechas, puntajes y entradas privadas de Mi Camino nunca se incluyen.')}</p><div style={{display:'grid',gap:10}}>{comparisonRows.map(([label,theirs,mine]:any)=><div className="card" style={{padding:12,background:'rgba(255,255,255,.025)'}} key={label}><strong>{label}</strong><div className="row" style={{justifyContent:'space-between',marginTop:5}}><span>{name}: <strong>{theirs}</strong></span><span>{t('You','Tú')}: <strong>{mine}</strong></span></div></div>)}</div></article>}

    {!isSelf&&!profile.show_journey_comparison&&<article className="card" style={{padding:19}}><div className="pill">{t('JOURNEY PRIVACY','PRIVACIDAD DEL CAMINO')}</div><p className="small muted" style={{margin:0}}><ShieldCheck size={13}/> {t('This member has not chosen to share Journey comparison information.','Este miembro no ha elegido compartir información para comparar Mi Camino.')}</p></article>}

    {credentials.length>0&&<article className="card" style={{padding:19}}><div className="pill">{t('VERIFIED CREDENTIALS','CREDENCIALES VERIFICADAS')}</div><h2>{t('Church-recognized preparation','Preparación reconocida por la iglesia')}</h2><div style={{display:'grid',gap:9}}>{credentials.map((r:any)=><BadgeSeal key={r.badge.id} badge={r.badge} earnedAt={r.earned_at}/>)}</div></article>}{trophies.length>0&&<article className="card" style={{padding:19}}><div className="pill">{t('LEARNING TROPHIES','TROFEOS DE APRENDIZAJE')}</div><h2>{t('Learning achievements','Logros de aprendizaje')}</h2><div style={{display:'grid',gap:9}}>{trophies.map((r:any)=><BadgeSeal key={r.badge.id} badge={r.badge} earnedAt={r.earned_at} compact/>)}</div></article>}</section>

    <details className="card" style={{padding:18,marginTop:16}}><summary style={{fontWeight:800,cursor:'pointer'}}>{t('About profile privacy','Acerca de la privacidad del perfil')}</summary><div style={{marginTop:12}}><p className="small muted" style={{lineHeight:1.55}}><ShieldCheck size={13}/> {t('This page uses only information this member has chosen to share. Login email, phone, address, birthday, private prayer, Friendship Group attendance, pastoral-care requests, private Journey entries, private documents and leadership-only records are not exposed here.','Esta página usa solo información que este miembro eligió compartir. Correo de acceso, teléfono, dirección, cumpleaños, oración privada, asistencia al Grupo de Amistad, solicitudes pastorales, entradas privadas de Mi Camino, documentos privados y registros exclusivos de liderazgo no aparecen aquí.')}</p>{isSelf&&<div className="row" style={{flexWrap:'wrap'}}><Link className="btn" href={l('/profile')}>{t('Edit my profile','Editar mi perfil')}</Link><Link className="ghost" href={l('/account/privacy')}>{t('Privacy settings','Configuración de privacidad')}</Link></div>}</div></details>
  </main>
}
