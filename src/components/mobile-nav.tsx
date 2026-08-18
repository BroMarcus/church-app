'use client'

import Link from 'next/link'
import { useEffect,useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell,BookOpen,BriefcaseBusiness,CalendarDays,Church,FileText,Globe2,GraduationCap,HandHeart,HeartHandshake,Home,Menu,Megaphone,MessageSquareText,UserRound,Users,X } from 'lucide-react'
import styles from './mobile-nav.module.css'

const main=[['/','Home',Home],['/learning','Learn',GraduationCap],['/groups','Groups',Users],['/calendar','Calendar',CalendarDays]] as const
const more=[
  ['/serve','Serve',HandHeart],['/outreach','Outreach',Megaphone],['/teams','Teams',BriefcaseBusiness],['/fundraising','Fundraising',HeartHandshake],['/network','Network',Globe2],['/documents','Documents',FileText],['/directory','Directory',Church],['/updates','Updates',MessageSquareText],['/help','Care',HandHeart],['/resources','Resources',BookOpen],['/notifications','Alerts',Bell],['/profile','Profile',UserRound]
] as const

export function MobileNav(){
  const pathname=usePathname()
  const [open,setOpen]=useState(false)
  useEffect(()=>setOpen(false),[pathname])
  if(pathname.startsWith('/login')||pathname.startsWith('/auth'))return null
  const active=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(href+'/')
  const moreActive=more.some(([href])=>active(href))
  return <><nav className={styles.nav} aria-label="Primary mobile navigation">{main.map(([href,label,Icon])=><Link className={`${styles.item} ${active(href)?styles.active:''}`} href={href} key={href}><Icon/><span>{label}</span></Link>)}<button className={`${styles.item} ${styles.more} ${moreActive||open?styles.active:''}`} onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="More Kingdom Network sections"><Menu/><span>More</span></button></nav><div className={`${styles.backdrop} ${open?styles.open:''}`} onClick={()=>setOpen(false)}>{open&&<div className={styles.sheet} onClick={e=>e.stopPropagation()}><div className={styles.sheetHead}><strong>Kingdom Network</strong><button className={styles.close} onClick={()=>setOpen(false)} aria-label="Close menu"><X size={17}/></button></div><div className={styles.grid}>{more.map(([href,label,Icon])=><Link className={`${styles.link} ${active(href)?styles.active:''}`} href={href} key={href}><Icon/><span>{label}</span></Link>)}</div></div>}</div><div className={styles.safeSpace}/></>
}
