'use client'

import Link from 'next/link'
import { useEffect,useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell,BookOpen,BriefcaseBusiness,CalendarDays,Church,FileText,GraduationCap,HandHeart,Home,Menu,MessageCircle,Megaphone,MessageSquareText,Sparkles,UserRound,Users,X } from 'lucide-react'
import styles from './mobile-nav.module.css'

const main=[['/','Home',Home],['/learning','Learn',GraduationCap],['/groups','Groups',Users],['/calendar','Calendar',CalendarDays]] as const
const memberMore=[
  ['/journey','My Journey',Sparkles],['/guide','Kingdom Guide',BookOpen],['/prayer','Prayer & Testimony',HandHeart],['/messages','Messages',MessageCircle],['/serve','Serve',HandHeart],['/documents','Documents',FileText],['/directory','Directory',Church],['/updates','Updates',MessageSquareText],['/help','Private Care',HandHeart],['/resources','Resources',BookOpen],['/notifications','Alerts',Bell],['/profile','Profile',UserRound]
] as const
const groupLeaderMore=[['/outreach','Outreach',Megaphone]] as const
const churchLeaderMore=[['/teams','Teams',BriefcaseBusiness]] as const

type MobileNavProps={authenticated?:boolean;churchRole?:string|null;isGroupLeader?:boolean}

export function MobileNav({authenticated=false,churchRole=null,isGroupLeader=false}:MobileNavProps={}){
  const pathname=usePathname()
  const [open,setOpen]=useState(false)
  useEffect(()=>setOpen(false),[pathname])
  if(!authenticated||pathname.startsWith('/login')||pathname.startsWith('/auth'))return null
  const isChurchLeader=['minister','pastor','church_admin'].includes(churchRole??'')
  const more=isChurchLeader?[...memberMore,...groupLeaderMore,...churchLeaderMore]:isGroupLeader?[...memberMore,...groupLeaderMore]:memberMore
  const active=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(href+'/')
  const moreActive=more.some(([href])=>active(href))
  return <><nav className={styles.nav} aria-label="Primary mobile navigation">{main.map(([href,label,Icon])=><Link className={`${styles.item} ${active(href)?styles.active:''}`} href={href} key={href}><Icon/><span>{label}</span></Link>)}<button className={`${styles.item} ${styles.more} ${moreActive||open?styles.active:''}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="More Kingdom Network sections"><Menu/><span>More</span></button></nav><div className={`${styles.backdrop} ${open?styles.open:''}`} onClick={()=>setOpen(false)}>{open&&<div className={styles.sheet} onClick={e=>e.stopPropagation()}><div className={styles.sheetHead}><strong>Kingdom Network</strong><button className={styles.close} onClick={()=>setOpen(false)} aria-label="Close menu"><X size={17}/></button></div><div className={styles.grid}>{more.map(([href,label,Icon])=><Link className={`${styles.link} ${active(href)?styles.active:''}`} href={href} key={href}><Icon/><span>{label}</span></Link>)}</div></div>}</div><div className={styles.safeSpace}/></>
}
