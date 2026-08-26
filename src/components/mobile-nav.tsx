'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell,BookOpen,BriefcaseBusiness,CalendarDays,Church,ClipboardList,FileText,GraduationCap,HandHeart,Home,Menu,MessageCircle,Megaphone,MessageSquareText,Settings2,Sparkles,UserPlus,UserRound,Users,X } from 'lucide-react'
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

const main:Entry[]=[['/','Home',Home],['/learning','Learn',GraduationCap],['/groups','Groups',Users],['/calendar','Calendar',CalendarDays]]
const personal:Entry[]=[['/journey','My Journey',Sparkles],['/profile','Profile',UserRound],['/documents','Documents',FileText,'documents'],['/notifications','Alerts',Bell]]
const church:Entry[]=[['/guide','Kingdom Guide',BookOpen],['/connect','Invite / Connect',UserPlus],['/prayer','Prayer & Testimony',HandHeart,'prayer'],['/messages','Messages',MessageCircle,'messages'],['/serve','Serve',HandHeart,'serve'],['/teams','My Teams',BriefcaseBusiness,'serve'],['/directory','Directory',Church,'directory'],['/updates','Official Updates',MessageSquareText,'updates'],['/help','Private Care',HandHeart,'private_care'],['/library','Library',BookOpen,'library']]
const settings:Entry[]=[['/account/notifications','Alert Settings',Bell],['/account/privacy','Privacy',UserRound],['/account/security','Security',UserRound],['/account/data','My Data',FileText]]

export function MobileNav({access}:{access:MobileNavAccess}){
  const pathname=usePathname(),[openPath,setOpenPath]=useState<string|null>(null),open=openPath===pathname
  if(pathname.startsWith('/login')||pathname.startsWith('/auth')||pathname.startsWith('/join'))return null
  const disabled=new Set(access.disabledFeatures)
  const available=(entry:Entry)=>!entry[3]||!disabled.has(entry[3])
  const leadership:Entry[]=[]
  if(access.canManageCalendar||access.canManageTeams||access.canLeadGroups)leadership.push(['/calendar/shared','Shared Schedules',CalendarDays])
  if(access.canLeadGroups||access.canManageTeams)leadership.push(['/rosters','Leader Rosters',ClipboardList])
  if(access.canManageLearning)leadership.push(['/learning/admin/course-builder','Class Builder',GraduationCap])
  if(access.canManageLearning||access.canManageCalendar)leadership.push(['/content','Content Studio',FileText])
  if(access.canManageOutreach&&!disabled.has('outreach')){leadership.push(['/outreach','Outreach',Megaphone,'outreach']);leadership.push(['/outreach/reviews','Connection Review',UserPlus,'outreach'])}
  if(access.canManageChurch){leadership.push(['/church/inbox','Work Inbox',ClipboardList]);leadership.push(['/church/features','Church Features',Settings2])}
  const churchItems=church.filter(available);if(access.hasForms)churchItems.push(['/forms','Forms',ClipboardList])
  const sections:Section[]=[{label:'Me',items:personal.filter(available)},{label:'Church',items:churchItems},...(leadership.length?[{label:'Leadership',items:leadership.filter(available)}]:[]),{label:'Settings',items:settings}]
  const active=(href:string)=>href==='/'?pathname==='/':href==='/calendar'?pathname==='/calendar'||pathname==='/calendar/my':pathname===href||pathname.startsWith(href+'/')
  const moreActive=sections.some(section=>section.items.some(([href])=>active(href))),close=()=>setOpenPath(null)
  return <><nav className={styles.nav} aria-label="Primary mobile navigation">{main.map(([href,label,Icon])=><Link className={`${styles.item} ${active(href)?styles.active:''}`} href={href} key={href}><Icon/><span>{label}</span></Link>)}<button className={`${styles.item} ${styles.more} ${moreActive||open?styles.active:''}`} onClick={()=>setOpenPath(open?null:pathname)} aria-expanded={open} aria-label="More Kingdom Network sections"><Menu/><span>More</span></button></nav><div className={`${styles.backdrop} ${open?styles.open:''}`} onClick={close}>{open&&<div className={styles.sheet} onClick={event=>event.stopPropagation()}><div className={styles.sheetHead}><strong>Kingdom Network</strong><button className={styles.close} onClick={close} aria-label="Close menu"><X size={17}/></button></div><div className={styles.sections}>{sections.map(section=><section className={styles.section} key={section.label}><div className={styles.sectionTitle}>{section.label}</div><div className={styles.grid}>{section.items.map(([href,label,Icon])=><Link className={`${styles.link} ${active(href)?styles.active:''}`} href={href} key={href} onClick={close}><Icon/><span>{label}</span></Link>)}</div></section>)}</div></div>}</div><div className={styles.safeSpace}/></>
}
