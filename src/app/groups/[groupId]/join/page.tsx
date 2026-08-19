import Link from 'next/link'
import { redirect } from 'next/navigation'
import { QrCode,ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JoinQr } from '@/app/church/join-center/join-qr'
import { CopyJoinLink } from '@/app/church/join-center/copy-join-link'

const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://kingdom-network.vercel.app').replace(/\/$/,'')

export default async function GroupJoinQrPage({params,searchParams}:{params:Promise<{groupId:string}>;searchParams:Promise<{lang?:string}>}){
  const [{groupId},query]=await Promise.all([params,searchParams])
  const es=query.lang==='es'
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect(l('/login'))
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name,slug)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const {data:group}=await supabase.from('groups').select('id,name,leader_id,active').eq('id',groupId).eq('church_id',membership.church_id).maybeSingle()
  if(!group?.id||!group.active)redirect(l('/groups'))
  const {data:groupMembership}=await supabase.from('group_memberships').select('role').eq('group_id',groupId).eq('user_id',userId).maybeSingle()
  const allowed=group.leader_id===userId||['leader','assistant'].includes(groupMembership?.role||'')||['pastor','church_admin'].includes(membership.role)
  if(!allowed)redirect(l(`/groups/${groupId}`))
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  if(!church?.slug)redirect(l('/groups'))
  const joinUrl=`${siteUrl}/join/${church.slug}/group/${group.id}`
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {group.name} • {es?'QR de Ingreso':'Join QR'}</div></div><div className="row"><Link className="ghost" href={`/groups/${groupId}/join?lang=en`}>English</Link><Link className="ghost" href={`/groups/${groupId}/join?lang=es`}>Español</Link><Link className="ghost" href={l(`/groups/${groupId}`)}>{es?'← Grupo':'← Group'}</Link></div></header>
    <section className="card" style={{padding:24,marginBottom:16}}><div className="pill"><QrCode size={11}/> {es?'QR DEL GRUPO DE AMISTAD':'FRIENDSHIP GROUP QR'}</div><h1>{group.name}</h1><p className="muted">{es?'Muestra este código en la reunión, una cena, picnic o Matthew party. La persona crea su cuenta normal de New Life, pero Kingdom Network recuerda que llegó por medio de este grupo y dirige el seguimiento al líder del grupo.':'Show this code at the meeting, dinner, picnic or Matthew party. The person creates the normal New Life account, but Kingdom Network remembers that they came through this group and routes follow-up to the group leader.'}</p></section>
    <section className="card" style={{padding:24,display:'grid',justifyItems:'center',gap:18}}><JoinQr url={joinUrl} label={es?`Escanea para unirte por medio de ${group.name}.`:`Scan to join through ${group.name}.`}/><div className="small muted" style={{wordBreak:'break-all',textAlign:'center'}}>{joinUrl}</div><div className="row" style={{gap:8,flexWrap:'wrap',justifyContent:'center'}}><CopyJoinLink url={joinUrl} label={es?'Copiar enlace del grupo':'Copy group join link'}/><Link className="ghost" href={joinUrl} target="_blank">{es?'Vista previa pública':'Public preview'}</Link></div></section>
    <section className="card" style={{padding:18,marginTop:16}}><div className="row" style={{gap:10,alignItems:'flex-start'}}><ShieldCheck size={18}/><div><strong>{es?'Mismo sistema, mejor contexto.':'Same system, better context.'}</strong><p className="small muted" style={{margin:'5px 0 0'}}>{es?'No crea una base de datos separada. El invitado entra al mismo Evangelismo, seguimiento, Mi Jornada y proceso de discipulado de la iglesia.':'This does not create a separate database. The guest enters the same Evangelism, follow-up, My Journey and discipleship process as the rest of the church.'}</p></div></div></section>
  </main>
}