import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BadgeSeal } from '@/components/badge-seal'
import { AvatarUploader } from './avatar-uploader'
import { updateProfile } from './actions'
import './badges.css'

const label=(v?:string|null)=>v?v.replaceAll('_',' '):'not recorded'
const yesNo=(v?:boolean|null)=>v===true?'Yes':v===false?'No':'Not recorded'
const titleCase=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())

export default async function ProfilePage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  if(!userId)redirect('/login')

  const [profileResult,detailsResult,membershipResult,groupMembershipResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).single(),
    supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single(),
    supabase.from('group_memberships').select('role,groups(id,name,group_type,active)').eq('user_id',userId)
  ])
  const profile:any=profileResult.data
  const details:any=detailsResult.data
  const membership:any=membershipResult.data
  const groupMemberships:any[]=groupMembershipResult.data??[]

  let milestones:any=null
  let badges:any[]=[]
  if(membership?.church_id){
    const [milestoneResult,badgeResult]=await Promise.all([
      supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,salt_series_status,soul_winning_status,bible_study_teacher_status,timothys_status,school_pastors_status,covenant_current').eq('church_id',membership.church_id).eq('user_id',userId).single(),
      supabase.from('member_badges').select('earned_at,badges(name,description,category,icon_key,badge_kind,visual_tier,display_order)').eq('user_id',userId).order('earned_at',{ascending:false})
    ])
    milestones=milestoneResult.data as any
    badges=badgeResult.data??[]
  }
  const church:any=Array.isArray(membership?.churches)?membership.churches[0]:membership?.churches
  const role=String(membership?.role??'member')
  const isAdmin=role==='pastor'||role==='church_admin'
  const credentials=badges.filter((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?.badge_kind!=='learning_trophy'})
  const trophies=badges.filter((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?.badge_kind==='learning_trophy'})
  const groupRoles=groupMemberships.flatMap((row:any)=>{const group=Array.isArray(row.groups)?row.groups[0]:row.groups;if(!group?.active)return[];return[{id:group.id,name:group.name,type:group.group_type,role:String(row.role??'member')}]})

  return <main className="shell">
    <div className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • My Profile</div></div><div className="row"><Link className="ghost" href="/journey">My Journey</Link><Link className="ghost" href="/account/privacy">Privacy</Link><Link className="ghost" href="/">← Home</Link></div></div>
    {params.saved&&<div className="notice success">Profile and contact information saved.</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <AvatarUploader userId={userId} currentPath={profile?.avatar_path}/>
    <div className="content-grid">
      <section className="card" style={{padding:24}}><div className="pill">MY PROFILE</div><h1 style={{marginBottom:6}}>Make it yours.</h1><p className="muted" style={{marginTop:0}}>Keep your information current so your church can stay connected with you.</p>
        <form action={updateProfile}>
          <h3 style={{marginTop:26}}>Member profile</h3>
          <div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" defaultValue={profile?.first_name??''}/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name" defaultValue={profile?.last_name??''}/></label></div>
          <label className="field"><span>Display name</span><input name="display_name" defaultValue={profile?.display_name??''}/></label>
          <label className="field"><span>Bio</span><textarea name="bio" defaultValue={profile?.bio??''} rows={4}/></label>

          <h3 style={{marginTop:28}}>Contact me</h3><p className="small muted">This email is separate from the email you use to sign in. Use the address you want other permitted church members to contact you at.</p>
          <label className="field"><span>Contact email</span><input name="contact_email" type="email" defaultValue={profile?.contact_email??''} placeholder="name@example.com"/></label>
          <label className="row" style={{alignItems:'flex-start',margin:'8px 0 18px'}}><input name="show_contact_email" type="checkbox" defaultChecked={profile?.show_contact_email!==false} style={{marginTop:3}}/><span className="small">Show my contact email on member-facing profile and directory views.</span></label>

          <h3 style={{marginTop:28}}>Private account & contact information</h3><p className="small muted">Visible to you and authorized church leadership—not the public community feed.</p>
          <label className="field"><span>Login email</span><input defaultValue={details?.email??''} disabled/><small className="muted">Used for sign-in and account confirmation. Changing your contact email does not change this. Use Account Security to change your login email.</small></label>
          <label className="field"><span>Phone</span><input name="phone" type="tel" defaultValue={details?.phone??''}/></label>
          <label className="field"><span>Address</span><input name="address_line1" defaultValue={details?.address_line1??''}/></label>
          <label className="field"><span>Address line 2</span><input name="address_line2" defaultValue={details?.address_line2??''}/></label>
          <div className="row"><label className="field" style={{flex:1}}><span>City</span><input name="city" defaultValue={details?.city??''}/></label><label className="field" style={{width:110}}><span>State</span><input name="state" defaultValue={details?.state??''}/></label><label className="field" style={{width:140}}><span>ZIP</span><input name="postal_code" defaultValue={details?.postal_code??''}/></label></div>
          <div className="row"><label className="field" style={{flex:1}}><span>Birthday</span><input name="birthday" type="date" defaultValue={details?.birthday??''}/></label><label className="field" style={{flex:1}}><span>Marriage anniversary</span><input name="marriage_anniversary" type="date" defaultValue={details?.marriage_anniversary??''}/></label></div>
          <button className="btn" style={{marginTop:8}}>Save my profile</button>
        </form>
      </section>
      <aside>
        <div className="card side"><div className="pill">MY JOURNEY</div><h3>Verified milestones</h3><p className="small muted">These records are verified by church leadership. You can view them here, but cannot change them yourself.</p><ul><li>Holy Ghost: <strong>{yesNo(milestones?.holy_ghost_received)}</strong></li><li>Baptism: <strong>{yesNo(milestones?.baptized)}</strong></li><li>First Steps: <strong>{label(milestones?.first_steps_status)}</strong></li><li>Salt Series: <strong>{label(milestones?.salt_series_status)}</strong></li><li>Soul Winning: <strong>{label(milestones?.soul_winning_status)}</strong></li><li>Bible Study Teacher: <strong>{label(milestones?.bible_study_teacher_status)}</strong></li></ul><Link className="ghost" href="/journey">Open full Journey →</Link></div>
        <div className="card side"><div className="pill">ROLES & SERVICE</div><h3>One member. More than one hat.</h3><p className="small muted">Membership, app access and service assignments are tracked separately so one role never has to erase another.</p><div style={{display:'grid',gap:8}}><div><span className="pill">MEMBER</span><p className="small muted" style={{margin:'5px 0 0'}}>{church?.name??'Your Church'}</p></div><div><span className="pill">ACCESS</span><p className="small" style={{margin:'5px 0 0'}}><strong>{titleCase(role)}</strong></p></div>{groupRoles.map((g:any)=><div key={`${g.id}-${g.role}`}><span className="pill">{g.type==='friendship'?'FRIENDSHIP GROUP':'GROUP'}</span><p className="small" style={{margin:'5px 0 0'}}><strong>{g.role==='leader'?'Leader':titleCase(g.role)}</strong> — {g.name}</p></div>)}</div><p className="small muted" style={{marginBottom:0}}>Verified ministry titles such as Minister, Pastor or Bishop can live in a separate title layer, while actual access continues to come from permission roles.</p>{isAdmin&&<Link className="btn" href="/church/roles" style={{display:'inline-block',marginTop:10}}>Manage roles & permissions</Link>}</div>
        <div className="card side"><div className="pill">VERIFIED CREDENTIALS</div><h3>Qualifications & completed pathways</h3><p className="small muted">Seal-style credentials come from leadership-verified records and approved qualifications.</p><div className="badge-shelf">{credentials.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} key={`${b.name}-${row.earned_at}`}/>:null})}{!credentials.length&&<div className="badge-empty">Verified training and ministry credentials will appear here as you complete approved pathways.</div>}</div></div>
        <div className="card side"><div className="pill">LEARNING TROPHIES</div><h3>Study achievements</h3><p className="small muted">These celebrate learning, quizzes and games—not spiritual rank.</p><div className="badge-shelf">{trophies.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} compact key={`${b.name}-${row.earned_at}`}/>:null})}{!trophies.length&&<div className="badge-empty">Complete lessons, quizzes and games to begin filling your trophy case.</div>}</div></div>
        <div className="card side"><div className="pill">ACCOUNT & PRIVACY</div><h3>Your controls.</h3><p className="muted">Manage what church members can see, how Kingdom Network alerts you, your login security and your own stored data.</p><div style={{display:'grid',gap:8}}><Link className="ghost" href="/account/privacy">Privacy settings</Link><Link className="ghost" href="/account/security">Login & security</Link><Link className="ghost" href="/account/notifications">Notification preferences</Link><Link className="ghost" href="/account/data">My data & download</Link></div></div>
      </aside>
    </div>
  </main>
}
