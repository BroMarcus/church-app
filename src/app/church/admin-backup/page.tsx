import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck,UserPlus,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { promoteBackupAdmin } from './actions'
import '../church.css'

const copy={
  en:{title:'Add a backup admin',subtitle:'Choose one trusted active member. They will be able to help manage Kingdom Network if the main admin is unavailable.',back:'← Church Builder',admin:'Church Admin',ready:'Backup admin is already covered',readyBody:'Your church already has at least two active pastor/admin accounts.',choose:'Choose a trusted person',chooseBody:'Only active formal members who are not already pastors or church admins are shown here.',make:'Make church admin',none:'No eligible active members yet.',noneBody:'Invite the trusted leader first. After they create, confirm their account, and are verified as a church member, come back here and promote them.',invite:'Invite a trusted leader →',saved:'Backup admin added successfully.',warning:'Church admins can manage members, settings, invitations and other sensitive church operations. Only choose someone you fully trust.',home:'Home'},
  es:{title:'Agrega un administrador de respaldo',subtitle:'Elige a un miembro activo de confianza. Podrá ayudar a administrar Kingdom Network si el administrador principal no está disponible.',back:'← Church Builder',admin:'Administración',ready:'El administrador de respaldo ya está cubierto',readyBody:'Tu iglesia ya tiene por lo menos dos cuentas activas de pastor/administrador.',choose:'Elige a una persona de confianza',chooseBody:'Aquí solo aparecen miembros formales activos que todavía no son pastores ni administradores de la iglesia.',make:'Hacer administrador de la iglesia',none:'Todavía no hay miembros activos elegibles.',noneBody:'Primero invita al líder de confianza. Después de que cree y confirme su cuenta y sea verificado como miembro de la iglesia, vuelve aquí para darle acceso administrativo.',invite:'Invitar a un líder de confianza →',saved:'Administrador de respaldo agregado correctamente.',warning:'Los administradores pueden manejar miembros, ajustes, invitaciones y otras operaciones sensibles de la iglesia. Elige solamente a alguien de plena confianza.',home:'Inicio'}
} as const

export default async function BackupAdminPage({searchParams}:{searchParams:Promise<{lang?:string;saved?:string;error?:string}>}){
  const params=await searchParams
  const lang:'en'|'es'=params.lang==='es'?'es':'en'
  const t=copy[lang]
  const l=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))

  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect(lang==='es'?'/?lang=es':'/')
  const churchId=actor.church_id
  const church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches

  const [{data:memberships},{count:adminCount}]=await Promise.all([
    supabase.from('church_memberships').select('id,user_id,role,status,relationship_status').eq('church_id',churchId).eq('status','active').eq('relationship_status','member').not('user_id','eq',userId).not('role','in','("pastor","church_admin")').order('created_at',{ascending:true}),
    supabase.from('church_memberships').select('*',{count:'exact',head:true}).eq('church_id',churchId).eq('status','active').in('role',['pastor','church_admin'])
  ])

  const ids=(memberships??[]).map((m:any)=>m.user_id)
  let profiles:any[]=[]
  let details:any[]=[]
  if(ids.length){
    const [p,d]=await Promise.all([
      supabase.from('profiles').select('id,first_name,last_name,display_name').in('id',ids),
      supabase.from('member_private_details').select('user_id,email').in('user_id',ids)
    ])
    profiles=p.data??[]
    details=d.data??[]
  }
  const pm=new Map(profiles.map((p:any)=>[p.id,p]))
  const dm=new Map(details.map((d:any)=>[d.user_id,d]))
  const eligible=(memberships??[]).map((m:any)=>({membership:m,profile:pm.get(m.user_id),details:dm.get(m.user_id)}))
  const ready=(adminCount??0)>=2

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • {t.title}</div></div><div className="row"><Link className="ghost" href={l('/church/launch')}>{t.back}</Link><Link className="ghost" href={l('/church')}>{t.admin}</Link><Link className="ghost" href={lang==='es'?'/?lang=es':'/'}>{t.home}</Link></div></header>

    <section className="admin-hero card"><div><div className="pill">CHURCH BUILDER</div><h1>{t.title}</h1><p className="muted">{t.subtitle}</p></div><div className="admin-badge"><ShieldCheck size={22}/><div><strong>{adminCount??0}</strong><span>pastor/admin</span></div></div></section>
    {params.saved&&<div className="notice success" role="status">{t.saved}</div>}{params.error&&<div className="notice error" role="alert">{params.error}</div>}

    {ready?<section className="card admin-note"><div className="pill">READY</div><h2>{t.ready}</h2><p className="muted">{t.readyBody}</p><Link className="btn" href={l('/church/launch')}>{t.back}</Link></section>:<>
      <section className="card admin-note"><div className="pill">IMPORTANT</div><p>{t.warning}</p></section>
      <div className="section-heading"><div><div className="pill">STEP 2</div><h2>{t.choose}</h2></div><span className="small muted">{t.chooseBody}</span></div>
      <section className="member-list">{eligible.map(({membership,profile,details}:any)=>{const name=profile?.display_name||[profile?.first_name,profile?.last_name].filter(Boolean).join(' ')||details?.email||'Member';return <article className="card member-admin-card" key={membership.id}><div className="member-main"><div className="avatar large">{name.slice(0,1).toUpperCase()}</div><div className="member-copy"><div className="member-name"><strong>{name}</strong></div><span>{details?.email??''}</span><small>{String(membership.role).replaceAll('_',' ')}</small></div></div><form action={promoteBackupAdmin} className="member-controls"><input type="hidden" name="membership_id" value={membership.id}/><input type="hidden" name="lang" value={lang}/><button className="btn" type="submit"><UserPlus size={15}/> {t.make}</button></form></article>})}{!eligible.length&&<div className="card empty"><Users size={28}/><h3>{t.none}</h3><p className="muted">{t.noneBody}</p><Link className="btn" href={l('/church/invites')}>{t.invite}</Link></div>}</section>
    </>}
  </main>
}
