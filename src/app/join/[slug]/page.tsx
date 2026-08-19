import Link from 'next/link'
import { Church,Languages,ShieldCheck,UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const copy={
  en:{pill:'JOIN YOUR CHURCH',title:(name:string)=>`Join ${name} on Kingdom Network`,body:'Create one account to connect with your church, see classes and events, join your Friendship Group, track your journey, and find ways to serve.',step1:'1. Create your account',step2:'2. Confirm your email',step3:'3. Follow Start Here',button:'Create my account',login:'I already have an account',secure:'Your account will be connected to this church only after Kingdom Network verifies that public signup is open.',closed:'Public signup for this church is not open right now.',closedBody:'If you are supposed to have access, ask a church leader for a personal invitation link.',english:'English',spanish:'Español'},
  es:{pill:'ÚNETE A TU IGLESIA',title:(name:string)=>`Únete a ${name} en Kingdom Network`,body:'Crea una sola cuenta para conectarte con tu iglesia, ver clases y eventos, unirte a tu Grupo de Amistad, seguir tu jornada y encontrar maneras de servir.',step1:'1. Crea tu cuenta',step2:'2. Confirma tu correo',step3:'3. Sigue Empieza Aquí',button:'Crear mi cuenta',login:'Ya tengo una cuenta',secure:'Tu cuenta se conectará con esta iglesia solamente después de que Kingdom Network confirme que el registro público está abierto.',closed:'El registro público para esta iglesia no está abierto ahora.',closedBody:'Si debes tener acceso, pide a un líder de la iglesia un enlace de invitación personal.',english:'English',spanish:'Español'}
} as const

export default async function ChurchJoinPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{lang?:string}>}){
  const [{slug},query]=await Promise.all([params,searchParams])
  const lang=query.lang==='es'?'es':'en',t=copy[lang]
  const supabase=await createClient()
  const {data}=await supabase.rpc('get_public_signup_status_for_church',{p_church_slug:slug})
  const status:any=Array.isArray(data)?data[0]:data
  const churchName=status?.church_name||slug.replaceAll('-',' ')
  const loginHref=`/login?church=${encodeURIComponent(slug)}&lang=${lang}`
  return <main className="login-wrap"><div className="login card" style={{maxWidth:640}}><div className="row" style={{justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div className="pill"><Church size={12}/> {t.pill}</div><div className="row" style={{gap:6}}><Languages size={14}/><Link className="ghost" href={`/join/${encodeURIComponent(slug)}?lang=en`}>{t.english}</Link><Link className="ghost" href={`/join/${encodeURIComponent(slug)}?lang=es`}>{t.spanish}</Link></div></div>
    {status?.open?<><h1>{t.title(churchName)}</h1><p className="muted">{t.body}</p><div className="card" style={{padding:16,margin:'18px 0',background:'rgba(255,255,255,.025)'}}><div style={{display:'grid',gap:8}}><strong>{t.step1}</strong><span>{t.step2}</span><span>{t.step3}</span></div></div><Link className="btn" style={{width:'100%',justifyContent:'center'}} href={loginHref}><UserPlus size={15}/> {t.button}</Link><Link className="ghost" style={{width:'100%',justifyContent:'center',marginTop:10}} href={`/login?lang=${lang}`}>{t.login}</Link><div className="notice" style={{marginTop:18,display:'flex',gap:9,alignItems:'flex-start'}}><ShieldCheck size={17}/><span>{t.secure}</span></div></>:<><h1>{t.closed}</h1><p className="muted">{t.closedBody}</p><Link className="ghost" href={`/login?lang=${lang}`}>{t.login}</Link></>}
  </div></main>
}
