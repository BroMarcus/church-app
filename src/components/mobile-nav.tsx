'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname,useSearchParams } from 'next/navigation'
import { Bell,BookOpen,BriefcaseBusiness,CalendarDays,Church,ClipboardList,FileText,GraduationCap,HandHeart,Home,Menu,MessageCircle,Megaphone,MessageSquareText,Settings2,Sparkles,UserRound,Users,X } from 'lucide-react'
import styles from './mobile-nav.module.css'

export type MobileNavAccess={
  canLeadGroups:boolean
  canManageTeams:boolean
  canManageLearning:boolean
  canManageOutreach:boolean
  canManageCalendar:boolean
  canViewLeadership:boolean
  canManageChurch:boolean
  hasForms:boolean
  disabledFeatures:string[]
}

type Entry=readonly [href:string,label:string,Icon:typeof Home,feature?:string]
type Section={label:string;items:Entry[]}

const personal:Entry[]=[['/start','Start Here',Sparkles],['/journey','My Journey',Sparkles],['/profile','Profile',UserRound],['/documents','Documents',FileText,'documents'],['/notifications','Alerts',Bell]]
const church:Entry[]=[['/guide','Kingdom Guide',BookOpen],['/prayer','Prayer & Testimony',HandHeart,'prayer'],['/messages','Messages',MessageCircle,'messages'],['/serve','Serve',HandHeart,'serve'],['/teams','My Teams',BriefcaseBusiness,'serve'],['/directory','Directory',Church,'directory'],['/updates','Official Updates',MessageSquareText,'updates'],['/help','Private Care',HandHeart,'private_care'],['/library','Library',BookOpen,'library']]
const support:Entry[]=[['/feedback','Help & Feedback',MessageSquareText]]
const settings:Entry[]=[['/account/notifications','Alert Settings',Bell],['/account/privacy','Privacy',UserRound],['/account/security','Security',UserRound],['/account/data','My Data',FileText]]

const es:Record<string,string>={
  Home:'Inicio',Groups:'Grupos','My Journey':'Mi Camino','Leader Hub':'Centro del Líder',Calendar:'Calendario',More:'Más',
  Me:'Yo',Church:'Iglesia',Leadership:'Liderazgo',Help:'Ayuda',Language:'Idioma',Settings:'Ajustes','Start Here':'Empieza Aquí',Profile:'Perfil',Documents:'Documentos',Alerts:'Alertas',
  'Kingdom Guide':'Guía Kingdom','Prayer & Testimony':'Oración y Testimonio',Messages:'Mensajes',Serve:'Servir','My Teams':'Mis Equipos',Directory:'Directorio',
  'Official Updates':'Avisos Oficiales','Private Care':'Atención Privada',Library:'Biblioteca','Help & Feedback':'Ayuda y Comentarios',Forms:'Formularios','Shared Schedules':'Horarios Compartidos',
  'Leadership Home':'Inicio de Liderazgo','Church Admin':'Administrar Iglesia','Leader Rosters':'Listas de Líderes','Class Builder':'Constructor de Clases','Content Studio':'Estudio de Contenido',Outreach:'Evangelismo','Work Inbox':'Bandeja de Trabajo',
  'Church Features':'Funciones de la Iglesia','Alert Settings':'Ajustes de Alertas',Privacy:'Privacidad',Security:'Seguridad','My Data':'Mis Datos'
}

export function MobileNav({access}:{access:MobileNavAccess}){
  const pathname=usePathname(),searchParams=useSearchParams(),[openPath,setOpenPath]=useState<string|null>(null),open=openPath===pathname
  if(pathname.startsWith('/login')||pathname.startsWith('/auth')||pathname.startsWith('/join'))return null
  const lang=searchParams.get('lang')==='es'?'es':'en',label=(value:string)=>lang==='es'?(es[value]??value):value
  const href=(path:string)=>lang==='es'?`${path}${path.includes('?')?'&':'?'}lang=es`:path
  const languageHref=(next:'en'|'es')=>{const params=new URLSearchParams(searchParams.toString());if(next==='es')params.set('lang','es');else params.delete('lang');const query=params.toString();return `${pathname}${query?`?${query}`:''}`}
  const disabled=new Set(access.disabledFeatures)
  const main:Entry[]=[['/','Home',Home],['/groups','Groups',Users],['/journey','My Journey',Sparkles],...(access.canLeadGroups?[['/groups','Leader Hub',ClipboardList] as Entry]:[['/calendar','Calendar',CalendarDays] as Entry])]
  const available=(entry:Entry)=>!entry[3]||!disabled.has(entry[3])
  const leadership:Entry[]=[]
  if(access.canViewLeadership)leadership.push(['/church/leadership','Leadership Home',ClipboardList])
  if(access.canManageCalendar||access.canManageTeams||access.canLeadGroups)leadership.push(['/calendar/shared','Shared Schedules',CalendarDays])
  if(access.canLeadGroups||access.canManageTeams)leadership.push(['/rosters','Leader Rosters',ClipboardList])
  if(access.canManageLearning)leadership.push(['/learning/admin/course-builder','Class Builder',GraduationCap])
  if(access.canManageLearning||access.canManageCalendar)leadership.push(['/content','Content Studio',FileText])
  if(access.canManageOutreach&&!disabled.has('outreach'))leadership.push(['/outreach','Outreach',Megaphone,'outreach'])
  if(access.canManageChurch){leadership.push(['/church','Church Admin',Church]);leadership.push(['/church/inbox','Work Inbox',ClipboardList]);leadership.push(['/church/features','Church Features',Settings2])}
  const churchItems=church.filter(available);if(access.hasForms)churchItems.push(['/forms','Forms',ClipboardList])
  const sections:Section[]=[{label:'Me',items:personal.filter(available)},{label:'Church',items:churchItems},...(leadership.length?[{label:'Leadership',items:leadership.filter(available)}]:[]),{label:'Help',items:support},{label:'Settings',items:settings}]
  const active=(path:string)=>path==='/'?pathname==='/':path==='/calendar'?pathname==='/calendar'||pathname==='/calendar/my':pathname===path||pathname.startsWith(path+'/')
  const moreActive=sections.some(section=>section.items.some(([path])=>active(path))),close=()=>setOpenPath(null)
  return <><nav className={styles.nav} aria-label={lang==='es'?'Navegación principal':'Primary mobile navigation'}>{main.map(([path,text,Icon])=><Link className={`${styles.item} ${active(path)?styles.active:''}`} href={href(path)} key={`${path}-${text}`}><Icon/><span>{label(text)}</span></Link>)}<button className={`${styles.item} ${styles.more} ${moreActive||open?styles.active:''}`} onClick={()=>setOpenPath(open?null:pathname)} aria-expanded={open} aria-label={lang==='es'?'Más secciones de Kingdom Network':'More Kingdom Network sections'}><Menu/><span>{label('More')}</span></button></nav><div className={`${styles.backdrop} ${open?styles.open:''}`} onClick={close}>{open&&<div className={styles.sheet} onClick={event=>event.stopPropagation()}><div className={styles.sheetHead}><strong>Kingdom Network</strong><button className={styles.close} onClick={close} aria-label={lang==='es'?'Cerrar menú':'Close menu'}><X size={17}/></button></div><div className={styles.sections}><section className={styles.section}><div className={styles.sectionTitle}>{label('Language')}</div><div className={styles.grid}><Link className={`${styles.link} ${lang==='en'?styles.active:''}`} href={languageHref('en')} onClick={close}><span aria-hidden="true">EN</span><span>English</span></Link><Link className={`${styles.link} ${lang==='es'?styles.active:''}`} href={languageHref('es')} onClick={close}><span aria-hidden="true">ES</span><span>Español</span></Link></div></section>{sections.map(section=><section className={styles.section} key={section.label}><div className={styles.sectionTitle}>{label(section.label)}</div><div className={styles.grid}>{section.items.map(([path,text,Icon])=><Link className={`${styles.link} ${active(path)?styles.active:''}`} href={href(path)} key={path} onClick={close}><Icon/><span>{label(text)}</span></Link>)}</div></section>)}</div></div>}</div><div className={styles.safeSpace}/></>
}
