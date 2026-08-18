import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Mail,MessageCircle,ShieldCheck,UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BadgeSeal } from '@/components/badge-seal'
import { startConversation } from '@/app/messages/actions'

const roleLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function DirectoryMemberPage({params}:{params:Promise<{userId:string}>}){
  const {userId:targetUserId}=await params
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const viewerId=claims?.claims?.sub
  if(!viewerId)redirect('/login')

  const {data:viewer}=await supabase.from('church_memberships').select('church_id,churches(name)').eq('user_id',viewerId).eq('status','active').limit(1).single()
  if(!viewer?.church_id)redirect('/')

  const {data:directoryMember}=await supabase.rpc('church_directory_member',{p_church_id:viewer.church_id,p_user_id:targetUserId})
  const profile:any=directoryMember?.[0]
  if(!profile)redirect('/directory')

  const canShowCredentials=Boolean(profile.show_verified_credentials)
  const canShowTrophies=Boolean(profile.show_learning_trophies)
  let badgeRows:any[]=[]
  if(canShowCredentials||canShowTrophies){
    const {data:memberBadges}=await supabase.from('member_badges').select('badge_id,earned_at').eq('user_id',targetUserId).order('earned_at',{ascending:false})
    const badgeIds=(memberBadges??[]).map((b:any)=>b.badge_id)
    if(badgeIds.length){
      const {data}=await supabase.from('badges').select('id,name,description,category,icon_key,badge_kind,visual_tier,display_order').in('id',badgeIds).eq('active',true)
      const map=new Map((data??[]).map((b:any)=>[b.id,b]))
      badgeRows=(memberBadges??[]).map((m:any)=>({badge:map.get(m.badge_id),earned_at:m.earned_at})).filter((r:any)=>r.badge).sort((a:any,b:any)=>(a.badge.display_order??999)-(b.badge.display_order??999))
    }
  }

  const name=profile.display_name||[profile.first_name,profile.last_name].filter(Boolean).join(' ')||'Church member'
  const church:any=Array.isArray(viewer.churches)?viewer.churches[0]:viewer.churches
  const credentials=canShowCredentials?badgeRows.filter((r:any)=>r.badge.badge_kind!=='learning_trophy'):[]
  const trophies=canShowTrophies?badgeRows.filter((r:any)=>r.badge.badge_kind==='learning_trophy'):[]
  const isSelf=targetUserId===viewerId

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Member Profile</div></div><div className="row"><Link className="ghost" href="/directory">← Directory</Link><Link className="ghost" href="/">Home</Link></div></header>

    <section className="card" style={{padding:24,marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:18,flexWrap:'wrap'}}><div style={{display:'flex',alignItems:'center',gap:14}}><div className="avatar" style={{width:64,height:64,fontSize:22}}>{name.slice(0,1).toUpperCase()}</div><div><div className="pill">CHURCH PROFILE</div><h1 style={{margin:'8px 0 3px'}}>{name}</h1><div className="muted">{roleLabel(profile.role)}</div></div></div><div className="row">{!isSelf&&<form action={startConversation}><input type="hidden" name="target_user_id" value={targetUserId}/><button className="btn"><MessageCircle size={14}/> Message</button></form>}<UserRound size={28}/></div></section>

    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(260px,.42fr)',gap:15,alignItems:'start'}}><section style={{display:'grid',gap:15}}><article className="card" style={{padding:19}}><div className="pill">ABOUT</div><p style={{lineHeight:1.65,whiteSpace:'pre-wrap'}}>{profile.bio||'No bio has been shared yet.'}</p>{profile.contact_email?<a className="ghost" href={`mailto:${profile.contact_email}`}><Mail size={13}/> {profile.contact_email}</a>:<p className="small muted">This member has not shared a contact email.</p>}</article>{credentials.length>0&&<article className="card" style={{padding:19}}><div className="pill">VERIFIED CREDENTIALS</div><h2>Church-recognized preparation</h2><div style={{display:'grid',gap:9}}>{credentials.map((r:any)=><BadgeSeal key={r.badge.id} badge={r.badge} earnedAt={r.earned_at}/>)}</div></article>}{trophies.length>0&&<article className="card" style={{padding:19}}><div className="pill">LEARNING TROPHIES</div><h2>Learning achievements</h2><div style={{display:'grid',gap:9}}>{trophies.map((r:any)=><BadgeSeal key={r.badge.id} badge={r.badge} earnedAt={r.earned_at} compact/>)}</div></article>}</section><aside className="card" style={{padding:18}}><div className="pill">PRIVACY</div><h3>Shared church profile only.</h3><p className="small muted" style={{lineHeight:1.55}}><ShieldCheck size={13}/> This page only uses the member-approved Directory profile. Login email, phone, home address, birthday, pastoral-care requests, private documents and leadership-only milestone details are not exposed here.</p>{isSelf&&<div style={{display:'grid',gap:8}}><Link className="btn" href="/profile">Edit my profile</Link><Link className="ghost" href="/account/privacy">Privacy settings</Link></div>}</aside></div>
  </main>
}
