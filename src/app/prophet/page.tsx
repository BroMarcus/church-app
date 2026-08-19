import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen,CalendarDays,HandHeart,Megaphone,Sparkles,Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProphetCommandBox } from '../guide/prophet-command-box'

export default async function ProphetPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const query=await searchParams
  const lang: 'en'|'es'=query.lang==='es'?'es':'en',es=lang==='es'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect(es?'/login?lang=es':'/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const links=[
    [es?'Mi Horario':'My Schedule',es?'Mis asignaciones, clases y grupo.':'Assignments, classes and group.', '/calendar/my',CalendarDays],
    [es?'Reporte de Grupo':'Group Report',es?'Abrir mi Grupo de Amistad y reportar la reunión.':'Open Friendship Groups and report the meeting.','/groups',Users],
    [es?'Evangelismo':'Evangelism',es?'Agregar visita o dar seguimiento.':'Add a guest or follow up.','/outreach',Megaphone],
    [es?'Aprendizaje':'Learning',es?'Continuar una clase o ver el siguiente paso.':'Continue a course or see the next step.','/learning',BookOpen],
    [es?'Oración y Cuidado':'Prayer & Care',es?'Guardar una necesidad de oración o pedir ayuda.':'Record a prayer need or request help.','/help',HandHeart]
  ] as const
  const l=(p:string)=>es?`${p}${p.includes('?')?'&':'?'}lang=es`:p
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Church'} • {es?'El Profeta':'The Prophet'} • Beta</div></div><div className="row"><Link className="ghost" href="/prophet?lang=en">English</Link><Link className="ghost" href="/prophet?lang=es">Español</Link><Link className="ghost" href="/guide">{es?'Recursos confiables':'Trusted Resources'}</Link><Link className="ghost" href="/">{es?'Inicio':'Home'}</Link></div></header>
    <section className="hero card"><div><div className="pill">{es?'EL PROFETA • MENTOR IA':'THE PROPHET • AI MENTOR'}</div><h1>{es?'Habla. Escribe. Sigue avanzando.':'Speak. Type. Keep moving forward.'}</h1><p>{es?'Un mentor de Kingdom Network para ayudarte a navegar, aprender, servir y mantenerte conectado. No pretende recibir revelación de Dios; usa la Palabra, recursos aprobados y datos que tienes permiso de ver.':'A Kingdom Network mentor to help you navigate, learn, serve and stay connected. It does not claim revelation from God; it uses Scripture, approved resources and data you are permitted to see.'}</p></div><div className="hero-stat"><Sparkles size={22}/><span>{es?'Piloto de voz + texto':'Voice + text pilot'}</span></div></section>
    <ProphetCommandBox lang={lang}/>
    <section className="card" style={{padding:18}}><div className="pill">{es?'ACCIONES RÁPIDAS':'QUICK ACTIONS'}</div><h2>{es?'También puedes tocar una acción.':'You can also tap an action.'}</h2><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:10,marginTop:12}}>{links.map(([title,body,href,Icon])=><Link key={href} href={l(href)} className="card" style={{padding:14,textDecoration:'none'}}><Icon size={18}/><strong style={{display:'block',marginTop:8}}>{title}</strong><span className="small muted">{body}</span></Link>)}</div></section>
  </main>
}
