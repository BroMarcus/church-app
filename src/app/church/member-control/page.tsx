import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AdminControlPanels } from './control-panels'
import '../church.css'
import './member-control.css'

const roleLabel=(v:string)=>v.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const tabs=['overview','journey','classes','groups','ministry','schedule','documents','business','leadership'] as const
type Tab=(typeof tabs)[number]
const tabLabels={
  en:{overview:'Overview',journey:'Journey',classes:'Classes',groups:'Groups',ministry:'Ministry',schedule:'Schedule',documents:'Documents',business:'Business',leadership:'Leadership'},
  es:{overview:'Resumen',journey:'Camino',classes:'Clases',groups:'Grupos',ministry:'Ministerio',schedule:'Horario',documents:'Documentos',business:'Negocio',leadership:'Liderazgo'}
} as const

export default async function MemberControlCenter({searchParams}:{searchParams:Promise<{member?:string;tab?:string;lang?:string;error?:string;access?:string;profile?:string;course?:string;service?:string;business?:string}>}){
  const params=await searchParams,lang:'en'|'es'=params.lang==='es'?'es':'en',es=lang==='es'
  const activeTab:Tab=tabs.includes(params.tab as Tab)?params.tab as Tab:'overview'
  const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const actorId=claims?.claims?.sub
  if(!actorId)redirect(es?'/login?lang=es':'/login')
  const {data:actor}=await supabase.from('church_memberships').select('church_id,role,status,churches(name)').eq('user_id',actorId).eq('status','active').limit(1).single()
  if(!actor?.church_id||!['pastor','church_admin'].includes(actor.role))redirect('/')
  const churchId=actor.church_id,church:any=Array.isArray(actor.churches)?actor.churches[0]:actor.churches
  const {data:memberships}=await supabase.from('church_memberships').select('id,user_id,role,status,joined_at,created_at').eq('church_id',churchId).order('created_at')
  const ids=(memberships??[]).map((m:any)=>m.user_id);let profiles:any[]=[];if(ids.length){const p=await supabase.from('profiles').select('id,first_name,last_name,display_name').in('id',ids);profiles=p.data??[]}
  const pm=new Map(profiles.map((p:any)=>[p.id,p])),rows=(memberships??[]).map((m:any)=>{const p=pm.get(m.user_id);return{...m,name:p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||(es?'Miembro sin nombre':'Unnamed member')}}).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  const selectedId=params.member&&rows.some((r:any)=>r.user_id===params.member)?params.member:null
  let selected:any=null,profile:any=null,details:any=null
  if(selectedId){selected=rows.find((r:any)=>r.user_id===selectedId);const [p,d]=await Promise.all([supabase.from('profiles').select('first_name,last_name,display_name,bio').eq('id',selectedId).single(),supabase.from('member_private_details').select('email,phone,address_line1,address_line2,city,state,postal_code,birthday,marriage_anniversary').eq('user_id',selectedId).maybeSingle()]);profile=p.data;details=d.data}
  const l=(p:string)=>lang==='es'?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  const recordUrl=(tab:Tab,language=lang)=>selectedId?`/church/member-control?member=${selectedId}&tab=${tab}&lang=${language}`:`/church/member-control?tab=${tab}&lang=${language}`
  const saved=Boolean(params.access||params.profile||params.course||params.service||params.business)
  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'Registro 360° del Miembro':'360° Member Record'}</div></div><div className="row"><Link className="ghost" href={recordUrl(activeTab,'en')}>English</Link><Link className="ghost" href={recordUrl(activeTab,'es')}>Español</Link><Link className="ghost" href={l('/church')}>← {es?'Administración':'Church Admin'}</Link></div></header>
  <section className="hero card"><div><div className="pill">{es?'SOLO LIDERAZGO':'LEADERSHIP ONLY'}</div><h1>{es?'Una persona. Un registro completo.':'One person. One complete record.'}</h1><p>{es?'Perfil, discipulado, clases, grupos, ministerio, horario, documentos, negocio y liderazgo en un solo lugar.':'Profile, discipleship, classes, groups, ministry, schedule, documents, business and leadership in one place.'}</p></div><div className="hero-stat"><ShieldCheck size={24}/><strong>{rows.length}</strong><span>{es?'personas en la iglesia':'people in church'}</span></div></section>
  <section className="card" style={{padding:18,marginBottom:16,borderColor:'#57377d'}}><div className="row" style={{alignItems:'flex-start',gap:12}}><ShieldCheck size={20}/><div><strong>{es?'Privado para Pastor y Administrador de Iglesia.':'Private to Pastor and Church Admin.'}</strong><div className="small muted" style={{marginTop:4}}>{es?'Los miembros usan sus propias pantallas personales. Los datos verificados y los controles administrativos permanecen separados.':'Members use their own personal screens. Verified records and administrative controls stay separate.'}</div></div></div></section>
  {params.error&&<div className="notice error">{params.error}</div>}{saved&&<div className="notice success">{es?'Cambio guardado en el registro del miembro.':'Member record change saved.'}</div>}
  <section className="card" style={{padding:18,marginBottom:18}}><div className="pill">{es?'SELECCIONAR MIEMBRO':'SELECT MEMBER'}</div><form action="/church/member-control" method="get" style={{display:'grid',gridTemplateColumns:'minmax(220px,1fr) auto',gap:10,marginTop:10}}><input type="hidden" name="lang" value={lang}/><input type="hidden" name="tab" value="overview"/><select name="member" defaultValue={selectedId??''} required><option value="" disabled>{es?'Elige una persona':'Choose a person'}</option>{rows.map((r:any)=><option value={r.user_id} key={r.user_id}>{r.name} — {roleLabel(r.role)} — {r.status}</option>)}</select><button className="btn"><Users size={14}/> {es?'Abrir registro':'Open record'}</button></form></section>
  {!selected&&<section className="card" style={{padding:20}}><h2>{es?'Elige un miembro arriba.':'Choose a member above.'}</h2><p className="muted">{es?'Después podrás recorrer todo su registro sin cambiar de persona.':'Then you can move through their complete record without changing people.'}</p><div style={{display:'grid',gap:8,marginTop:14}}>{rows.map((r:any)=><Link key={r.user_id} className="card" style={{padding:12,textDecoration:'none'}} href={`/church/member-control?member=${r.user_id}&tab=overview&lang=${lang}`}><strong>{r.name}</strong><div className="small muted">{roleLabel(r.role)} • {r.status}</div></Link>)}</div></section>}
  {selected&&<><section className="record-hero card"><div className="member-main"><div className="avatar record-avatar">{selected.name.slice(0,1).toUpperCase()}</div><div><div className="pill">{es?'REGISTRO 360°':'360° MEMBER RECORD'}</div><h1>{selected.name}</h1><p className="muted">{roleLabel(selected.role)} • {selected.status}</p></div></div><div className="member-record-actions"><Link className="ghost" href={`/church/members/${selected.user_id}?lang=${lang}`}>{es?'Registro verificado →':'Verified record →'}</Link><Link className="ghost" href={`/teams?member=${selected.user_id}`}>Teams →</Link></div></section>
  <nav className="card member-record-tabs" aria-label={es?'Secciones del registro':'Member record sections'}>{tabs.map(tab=><Link key={tab} className={`member-record-tab ${activeTab===tab?'active':''}`} href={recordUrl(tab)}>{tabLabels[lang][tab]}</Link>)}</nav>
  <AdminControlPanels churchId={churchId} userId={selected.user_id} actorRole={actor.role} membership={selected} profile={profile} details={details} lang={lang} tab={activeTab}/></>}
  </main>
}
