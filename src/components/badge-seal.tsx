import { Award,BadgeCheck,BookOpen,ClipboardCheck,Compass,Gamepad2,Layers,Map,Send,ShieldCheck,Star,Trophy } from 'lucide-react'
import styles from './badge-seal.module.css'

type Badge={name:string;description?:string|null;category?:string|null;icon_key?:string|null;badge_kind?:string|null;visual_tier?:string|null}
const icon=(key?:string|null)=>{const p={size:19};switch(key){case'layers':return <Layers {...p}/>;case'send':return <Send {...p}/>;case'book_open':return <BookOpen {...p}/>;case'shield':return <ShieldCheck {...p}/>;case'compass':return <Compass {...p}/>;case'badge_check':return <BadgeCheck {...p}/>;case'trophy':return <Trophy {...p}/>;case'clipboard_check':return <ClipboardCheck {...p}/>;case'map':return <Map {...p}/>;case'star':return <Star {...p}/>;case'gamepad_2':return <Gamepad2 {...p}/>;default:return <Award {...p}/>}}

export function BadgeSeal({badge,earnedAt,compact=false}:{badge:Badge;earnedAt?:string|null;compact?:boolean}){
  const kind=badge.badge_kind==='learning_trophy'?'trophy':'credential'
  const tier=['bronze','silver','gold','platinum'].includes(String(badge.visual_tier))?String(badge.visual_tier):'bronze'
  return <div className={`${styles.badge} ${styles[kind]} ${styles[tier]} ${compact?styles.compact:''}`}>
    <div className={styles.mark}>{icon(badge.icon_key)}</div>
    <div className={styles.copy}><span className={styles.type}>{kind==='credential'?'Verified credential':'Learning trophy'}</span><strong className={styles.name}>{badge.name}</strong>{badge.description&&<p className={styles.description}>{badge.description}</p>}{earnedAt&&<span className={styles.date}>Earned {new Date(earnedAt).toLocaleDateString()}</span>}</div>
    <span className={styles.tier}>{tier}</span>
  </div>
}
