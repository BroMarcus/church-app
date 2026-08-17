import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateProfile } from './actions'

const label=(value?:string|null)=>value?value.replaceAll('_',' '):'not recorded'
const yesNo=(value?:boolean|null)=>value===true?'Yes':value===false?'No':'Not recorded'

export default async function ProfilePage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const params=await searchParams
  const supabase=await createClient()
  const {data}=await supabase.auth.getClaims()
  const userId=data?.claims?.sub
  if(!userId)redirect('/login')

  const [{data:profile},{data:details},{data:membership}]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).single(),
    supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',userId).single(),
    supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  ])
  let milestones:any=null
  if(membership?.church_id){const result=await supabase.from('member_milestones').select('holy_ghost_received,baptized,first_steps_status,salt_series_status,soul_winning_status,bible_study_teacher_status,timothys_status,school_pastors_status,covenant_current').eq('church_id',membership.church_id).eq('user_id',userId).single();milestones=result.data}
  const church=Array.isArray(membership?.churches)?membership?.churches[0]:membership?.churches as {name?:string}|null

  return <main className="shell">
    <div className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • My Profile</div></div><Link className="ghost" href="/">← Home</Link></div>
    {params.saved&&<div className="notice success">Profile and contact information saved.</div>}{params.error&&<div className="notice error">{params.error}</div>}
    <div className="content-grid">
      <section className="card" style={{padding:24}}><div className="pill">MY PROFILE</div><h1 style={{marginBottom:6}}>Make it yours.</h1><p className="muted" style={{marginTop:0}}>Keep your information current so your church can stay connected with you.</p>
        <form action={updateProfile}>
          <h3 style={{marginTop:26}}>Public profile</h3>
          <div className="row"><label className="field" style={{flex:1}}><span>First name</span><input name="first_name" defaultValue={profile?.first_name??''}/></label><label className="field" style={{flex:1}}><span>Last name</span><input name="last_name" defaultValue={profile?.last_name??''}/></label></div>
          <label className="field"><span>Display name</span><input name="display_name" defaultValue={profile?.display_name??''}/></label>
          <label className="field"><span>Bio</span><textarea name="bio" defaultValue={profile?.bio??''} rows={4}/></label>
          <h3 style={{marginTop:28}}>Private contact information</h3><p className="small muted">Visible to you and authorized church leadership—not the public community feed.</p>
          <label className="field"><span>Email</span><input value={details?.email??''} disabled/></label>
          <label className="field"><span>Phone</span><input name="phone" type="tel" defaultValue={details?.phone??''}/></label>
          <label className="field"><span>Address</span><input name="address_line1" defaultValue={details?.address_line1??''}/></label>
          <label className="field"><span>Address line 2</span><input name="address_line2" defaultValue={details?.address_line2??''}/></label>
          <div className="row"><label className="field" style={{flex:1}}><span>City</span><input name="city" defaultValue={details?.city??''}/></label><label className="field" style={{width:110}}><span>State</span><input name="state" defaultValue={details?.state??''}/></label><label className="field" style={{width:140}}><span>ZIP</span><input name="postal_code" defaultValue={details?.postal_code??''}/></label></div>
          <div className="row"><label className="field" style={{flex:1}}><span>Birthday</span><input name="birthday" type="date" defaultValue={details?.birthday??''}/></label><label className="field" style={{flex:1}}><span>Marriage anniversary</span><input name="marriage_anniversary" type="date" defaultValue={details?.marriage_anniversary??''}/></label></div>
          <button className="btn" style={{marginTop:8}}>Save my profile</button>
        </form>
      </section>
      <aside>
        <div className="card side"><div className="pill">MY JOURNEY</div><h3>Verified milestones</h3><p className="small muted">These are leadership-verified records. You can see them here, but you cannot edit them yourself.</p><ul><li>Holy Ghost: <strong>{yesNo(milestones?.holy_ghost_received)}</strong></li><li>Baptism: <strong>{yesNo(milestones?.baptized)}</strong></li><li>First Steps: <strong>{label(milestones?.first_steps_status)}</strong></li><li>Salt Series: <strong>{label(milestones?.salt_series_status)}</strong></li><li>Soul Winning: <strong>{label(milestones?.soul_winning_status)}</strong></li><li>Bible Study Teacher: <strong>{label(milestones?.bible_study_teacher_status)}</strong></li></ul></div>
        <div className="card side"><div className="pill">CHURCH ACCESS</div><h3>{church?.name??'Your Church'}</h3><p className="muted">Current role: <strong>{membership?.role?.replaceAll('_',' ')??'member'}</strong></p>{['pastor','church_admin'].includes(membership?.role??'')&&<Link className="btn" href="/church" style={{display:'inline-block'}}>Open Church Admin</Link>}</div>
        <div className="card side"><div className="pill">PRIVACY</div><h3>Two kinds of information</h3><p className="muted">You maintain your personal/contact information. Leadership verifies discipleship, qualification and training records separately.</p></div>
      </aside>
    </div>
  </main>
}
