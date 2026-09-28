import type { ReactNode } from 'react'
import { Crown } from 'lucide-react'
import styles from './v2-brand-lockup.module.css'

export function V2BrandLockup({churchName,churchMark}:{churchName:string;churchMark?:ReactNode}){
  return <div className={styles.lockup} aria-label={`Kingdom Network · ${churchName}`}>
    <Crown className={styles.crown} size={20} strokeWidth={1.75} aria-hidden="true"/>
    <div className={styles.copy}>
      <span className={styles.brand}>KINGDOM NETWORK</span>
      <span className={styles.church}>{churchName}</span>
    </div>
    {churchMark?<span className={styles.optionalMark} aria-hidden="true">{churchMark}</span>:null}
  </div>
}
