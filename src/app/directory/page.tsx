import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mail,MessageSquareWarning,Search,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import './directory.css'

export default async function DirectoryPage({searchParams}:{searchParams:Promise<{q?:string;lang?:string}>}){
  const params=await searchParams,es=params.lang==='es',t=(en:string,sp:string)=>es?sp:en,l=(path:string)=>es?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const q=String(params.q??'').trim().toLowerCase()
  const roleLabel=(v:string)=>v==='pastor'?t('Pastor','Pastor'):v==='church_admin'?t('Church Admin','Administrador de Iglesia'):v==='minister'?t('Minister','Ministro'):v==='ministry_leader'?t('Ministry Leader','Líder de Ministerio'):v==='group_leader'?t('Group Leader','Líder de Grupo'):t('Member','Miembro')
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:directoryRows}=await supabase.rpc('church_directory_members',{p_church_id:membership.church_id})
  const rows=(directoryRows??[]).map((r:any)=>{const name=r.display_name||[r.first_name,r.last_name].filter(Boolean).join(' ')||t('Church member','Miembro de la iglesia');return {id:r.user_id,role:r.role,name,bio:r.bio??'',contactEmail:r.contact_email}}).filter((r:any)=>!q||`${r.name} ${r.role} ${r.bio}`.toLowerCase().includes(q)).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches,isAdmin=['pastor','church_admin'].includes(membership.role)

  return <main className="shell">
    <header className="topbar"><div><Link href={l('/')} className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??t('Your Church','Tu Iglesia')} • {t('Directory','Directorio')}</div></div><div className="row"><Link className="ghost" href="/directory?lang=en">English</Link><Link className="ghost" href="/directory?lang=es">Español</Link>{isAdmin&&<Link className="ghost" href={l('/church')}>{t('Admin','Admin')}</Link>}<Link className="ghost" href={l('/feedback')}><MessageSquareWarning size={14}/> {t('Feedback','Comentarios')}</Link><Link className="ghost" href={l('/profile')}>{t('My Profile','Mi Perfil')}</Link><Link className="ghost" href={l('/')}>← {t('Home','Inicio')}</Link></div></header>

    <section className="directory-hero card"><div><div className="pill">{t('CHURCH DIRECTORY','DIRECTORIO DE LA IGLESIA')}</div><h1>{t('Find your church family.','Encuentra a tu familia de iglesia.')}</h1><p className="muted">{t('Search the member-approved information people have chosen to share.','Busca la información que los miembros han elegido compartir.')}</p></div><div className="admin-badge"><Users size={22}/><div><strong>{rows.length}</strong><span>{rows.length===1?t('member shown','miembro mostrado'):t('members shown','miembros mostrados')}</span></div></div></section>

    <section className="card directory-search"><form method="get"><input type="hidden" name="lang" value={es?'es':'en'}/><input name="q" defaultValue={params.q??''} placeholder={t('Search by name, role or bio','Buscar por nombre, rol o biografía')} aria-label={t('Search church directory','Buscar en el directorio')}/><button className="btn"><Search size={13}/> {t('Search','Buscar')}</button>{q&&<Link className="ghost" href={l('/directory')}>{t('Clear','Limpiar')}</Link>}</form></section>

    <section className="directory-grid">{rows.map((r:any)=><article className="card person-card" key={r.id}><div className="person-top"><div className="person-avatar">{r.name.slice(0,1).toUpperCase()}</div><div><h3>{r.name}</h3><div className="person-role">{roleLabel(r.role)}</div></div></div><p className="person-bio">{r.bio||t('No bio added yet.','Todavía no hay biografía.')}</p><div className="person-contact">{r.contactEmail?<a href={`mailto:${r.contactEmail}`}><Mail size={12}/> {r.contactEmail}</a>:<span className="small muted">{t('Contact email not shared','Correo de contacto no compartido')}</span>}</div><Link className="record-link" href={l(`/directory/${r.id}`)}>{t('View profile →','Ver perfil →')}</Link></article>)}{!rows.length&&<div className="card empty"><h3>{t('No matching members.','No encontramos miembros.')}</h3><p className="muted">{t('Try a different search. Members can also choose not to appear in the Directory.','Prueba otra búsqueda. Los miembros también pueden elegir no aparecer en el Directorio.')}</p></div>}</section>

    <details className="card privacy-note"><summary style={{fontWeight:800,cursor:'pointer'}}>{t('About Directory privacy','Acerca de la privacidad del Directorio')}</summary><div style={{marginTop:12}}><p className="muted"><ShieldCheck size={13}/> {t('Login email, phone, home address, birthday and other private details are never returned by the Directory. Members control whether they appear and whether contact email, credentials and learning trophies are visible.','El correo de acceso, teléfono, dirección, cumpleaños y otros datos privados nunca aparecen en el Directorio. Cada miembro controla si aparece y si muestra correo de contacto, credenciales y trofeos de aprendizaje.')}</p><Link className="ghost" href={l('/account/privacy')}>{t('Manage my privacy →','Administrar mi privacidad →')}</Link></div></details>
  </main>
}