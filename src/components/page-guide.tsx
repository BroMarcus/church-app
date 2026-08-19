'use client'

import { useEffect,useMemo,useState } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle,X } from 'lucide-react'
import styles from './page-guide.module.css'

type Guide={title:string;body:string;tips:string[]}

const guides:Record<string,Guide>={
  '/':{title:'Home',body:'This is your everyday starting point. See what matters now, your next step, upcoming events and church updates.',tips:['Start with My Today when you want a simple daily view.','Use My Next Step when you are not sure what to do next.']},
  '/learning':{title:'Learning Center',body:'Take church classes, continue courses you already started and track your progress.',tips:['Open a course to see lessons, sessions and assessments.','Your completed work connects back to My Journey.']},
  '/journey':{title:'My Journey',body:'See your spiritual milestones, discipleship progress and the next step in your walk with God.',tips:['This page shows where you are, not just what classes exist.','Use the recommended next step when you are unsure where to begin.']},
  '/today':{title:'My Today',body:'This is the simple daily screen for assignments, classes, alerts and what needs your attention now.',tips:['Start here when you only have a minute.','Items here should point you directly to the page where you can act.']},
  '/groups':{title:'Friendship Groups',body:'Find your Friendship Group, meeting information and the people you are growing with.',tips:['Open a group to see its details and current activity.','If you are not in a group yet, use this page to find the right one.']},
  '/calendar':{title:'Calendar',body:'See services, classes, meetings and church events in one place.',tips:['Use the calendar to see what is coming next.','Events connected to you should be the easiest to spot.']},
  '/guide':{title:'Kingdom Guide',body:'Ask for help finding something, understanding what to do next or locating trusted church resources.',tips:['Ask in plain language.','Use it whenever you are unsure which tab you need.']},
  '/prayer':{title:'Prayer & Testimony',body:'Share prayer needs, celebrate testimonies and encourage your church family.',tips:['Choose the appropriate privacy level before sharing.','Private pastoral-care needs belong in Private Care.']},
  '/messages':{title:'Messages',body:'Have private conversations with people you are connected to in Kingdom Network.',tips:['Use this for direct conversation, not official church announcements.','Report anything inappropriate instead of engaging with it.']},
  '/serve':{title:'Serve',body:'Explore ministries, see what each team does and learn what is required before you serve.',tips:['This is the place to discover where you can help.','Kingdom Network can show what training or steps you still need.']},
  '/teams':{title:'Teams',body:'See ministry teams you already belong to, upcoming assignments and team responsibilities.',tips:['Serve is for discovering ministries; Teams is for active team members.','Check assignments here before services and events.']},
  '/outreach':{title:'Outreach',body:'Keep track of guests, Bible studies, follow-up and evangelism connections.',tips:['Use follow-up dates so people do not get forgotten.','Keep sensitive notes limited to the people who need them.']},
  '/documents':{title:'Documents',body:'Keep important church certificates and verified records in your personal document vault.',tips:['Use this for certificates and official records.','Only you and properly authorized leaders should see private documents.']},
  '/directory':{title:'Directory',body:'Find people and approved directory information within your church community.',tips:['Only information a person has chosen to share should appear here.','Use Messages when you want to contact someone privately.']},
  '/updates':{title:'Official Updates',body:'Read official church and leadership announcements without mixing them into the member community feed.',tips:['Look here for information coming from church leadership.','Community conversation belongs on the Home feed.']},
  '/help':{title:'Private Care',body:'Send a private prayer, pastoral-care or support request to the appropriate church leaders.',tips:['Use this when the matter should not be public.','Explain what kind of help you need so it reaches the right person.']},
  '/resources':{title:'Resources',body:'Find reusable church materials, teaching resources and other helpful files.',tips:['Use search or categories when the library grows.','Save commonly used materials so they are easy to find again.']},
  '/profile':{title:'Profile',body:'Keep your basic information, photo and the information you choose to share with your church community up to date.',tips:['Start by checking your name and contact information.','Review privacy settings before sharing directory information.']}
}

export function PageGuide(){
  const pathname=usePathname()
  const guide=useMemo(()=>Object.entries(guides).filter(([path])=>path==='/'?pathname==='/':pathname===path||pathname.startsWith(path+'/')).sort((a,b)=>b[0].length-a[0].length)[0]?.[1],[pathname])
  const [open,setOpen]=useState(false)
  useEffect(()=>{
    if(!guide)return
    const key=`kingdom-network:page-guide:${pathname.split('/').slice(0,2).join('/')||'/'}`
    if(window.localStorage.getItem(key)!=='seen')setOpen(true)
  },[guide,pathname])
  if(!guide)return null
  const key=`kingdom-network:page-guide:${pathname.split('/').slice(0,2).join('/')||'/'}`
  const dismiss=()=>{window.localStorage.setItem(key,'seen');setOpen(false)}
  return <>
    {open&&<div className={styles.backdrop} onClick={dismiss}><section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="page-guide-title" onClick={e=>e.stopPropagation()}><div className={styles.head}><div><div className={styles.eyebrow}>FIRST-TIME GUIDE</div><h2 id="page-guide-title">{guide.title}</h2></div><button className={styles.close} onClick={dismiss} aria-label="Close page guide"><X size={18}/></button></div><p className={styles.body}>{guide.body}</p><div className={styles.tips}>{guide.tips.map((tip,index)=><div className={styles.tip} key={tip}><span>{index+1}</span><p>{tip}</p></div>)}</div><button className={styles.done} onClick={dismiss}>Got it — show me the page</button></section></div>}
    {!open&&<button className={styles.help} onClick={()=>setOpen(true)} aria-label={`How to use ${guide.title}`}><HelpCircle size={18}/><span>How this page works</span></button>}
  </>
}
