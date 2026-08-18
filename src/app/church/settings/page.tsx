import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2,Globe2,MapPin,Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LogoUploader } from './logo-uploader'
import { updateChurchSettings } from './actions'
import './settings.css'

export default async function ChurchSettingsPage({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
  const query=await searchParams
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  const {data:church}=await supabase.from('churches').select('id,district_id,organization_id,name,slug,city,state,timezone,logo_path,brand_color,website_url,contact_email,contact_phone,address_line1,address_line2,postal_code,welcome_message').eq('id',membership.church_id).single()
  if(!church)redirect('/church')
  const [{data:org},{data:district}]=await Promise.all([
    church.organization_id?supabase.from('organizations').select('name').eq('id',church.organization_id).maybeSingle():Promise.resolve({data:null}),
    church.district_id?supabase.from('districts').select('name').eq('id',church.district_id).maybeSingle():Promise.resolve({data:null})
  ])
  const logoUrl=church.logo_path?supabase.storage.from('church-branding').getPublicUrl(church.logo_path).data.publicUrl:null
  const color=church.brand_color||'#7B50A0'

  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Church Settings • {church.name}</div></div><div className="row"><Link className="ghost" href="/church">← Church Admin</Link><Link className="ghost" href="/">Home</Link></div></header>
    <section className="settings-hero card"><div><div className="pill">CHURCH SETTINGS</div><h1>Identity, contact & branding.</h1><p className="muted">Keep your local church information accurate while Kingdom Network protects organization-level structure.</p></div><div className="hero-stat"><Palette size={22}/><span>Pastor / church-admin only</span></div></section>
    {query.saved&&<div className="notice success">Church settings saved.</div>}{query.error&&<div className="notice error">{query.error}</div>}

    <div className="settings-layout"><section className="card settings-card"><div className="pill">PUBLIC CHURCH PROFILE</div><h2>Church information</h2><form action={updateChurchSettings} className="settings-grid"><input type="hidden" name="church_id" value={church.id}/><label className="wide"><span>Church name</span><input name="name" required defaultValue={church.name}/></label><label><span>Address</span><input name="address_line1" defaultValue={church.address_line1??''}/></label><label><span>Suite / unit</span><input name="address_line2" defaultValue={church.address_line2??''}/></label><label><span>City</span><input name="city" defaultValue={church.city??''}/></label><label><span>State / region</span><input name="state" defaultValue={church.state??''}/></label><label><span>Postal code</span><input name="postal_code" defaultValue={church.postal_code??''}/></label><label><span>Timezone</span><input name="timezone" list="timezones" defaultValue={church.timezone}/><datalist id="timezones"><option value="America/Los_Angeles"/><option value="America/Denver"/><option value="America/Phoenix"/><option value="America/Chicago"/><option value="America/New_York"/><option value="America/Anchorage"/><option value="Pacific/Honolulu"/></datalist></label><label><span>Public contact email</span><input name="contact_email" type="email" defaultValue={church.contact_email??''}/></label><label><span>Public phone</span><input name="contact_phone" type="tel" defaultValue={church.contact_phone??''}/></label><label className="wide"><span>Website</span><input name="website_url" type="url" defaultValue={church.website_url??''} placeholder="https://..."/></label><label><span>Brand accent color</span><input name="brand_color" type="color" defaultValue={color}/></label><label className="wide"><span>Welcome message</span><textarea name="welcome_message" rows={5} defaultValue={church.welcome_message??''} placeholder="A short welcome message for members and future church profile pages."/></label><button className="btn wide">Save church settings</button></form><div className="settings-note">Timezone is used for Calendar, Teams, Outreach follow-ups and other church-local scheduling. Structural fields such as district, organization and church slug cannot be changed from this screen.</div></section>

    <aside className="card brand-preview" style={{'--preview':color} as React.CSSProperties}><div className="pill">BRAND PREVIEW</div><div className="brand-mark">{logoUrl?<img src={logoUrl} alt={`${church.name} logo`}/>:<div className="fallback" style={{color}}>{church.name.slice(0,1).toUpperCase()}</div>}</div><h2>{church.name}</h2><p className="small muted">{church.city||'City'}{church.state?`, ${church.state}`:''}</p><div className="brand-line"/><LogoUploader churchId={church.id} currentPath={church.logo_path}/><div className="identity"><div className="identity-row"><span><Building2 size={12}/> Organization</span><strong>{org?.name??'Not assigned'}</strong></div><div className="identity-row"><span><MapPin size={12}/> District</span><strong>{district?.name??'Not assigned'}</strong></div><div className="identity-row"><span><Globe2 size={12}/> Slug</span><strong>{church.slug}</strong></div></div><div className="settings-note">The local logo and accent color personalize the church experience without replacing the Kingdom Network product identity.</div></aside></div>
  </main>
}
