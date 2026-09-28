'use client'

import type { ComponentType } from 'react'
import { GraduationCap,HandHeart,Home,Menu,UsersRound } from 'lucide-react'
import styles from './v2-bottom-nav.module.css'

export type V2Lang='en'|'es'
export type V2TabId='home'|'my-group'|'learn'|'serve'|'more'
export type V2NavTab={
  id:V2TabId|string
  label:{en:string;es:string}
  destination:string
  Icon:ComponentType<{size?:number;strokeWidth?:number;className?:string;'aria-hidden'?:boolean}>
}

export const DEFAULT_V2_TABS:V2NavTab[]=[
  {id:'home',label:{en:'Home',es:'Inicio'},destination:'/v2',Icon:Home},
  {id:'my-group',label:{en:'My Group',es:'Mi Grupo'},destination:'/v2/groups',Icon:UsersRound},
  {id:'learn',label:{en:'Learn',es:'Aprender'},destination:'/v2/learn',Icon:GraduationCap},
  {id:'serve',label:{en:'Serve',es:'Servir'},destination:'/v2/serve',Icon:HandHeart},
  {id:'more',label:{en:'More',es:'Más'},destination:'/v2/more',Icon:Menu}
]

export function V2BottomNav({lang,activeId='home',tabs=DEFAULT_V2_TABS,onSelect}:{lang:V2Lang;activeId?:string;tabs?:V2NavTab[];onSelect?:(tab:V2NavTab)=>void}){
  return <nav className={styles.nav} aria-label={lang==='es'?'Navegación principal de Kingdom Network V2':'Kingdom Network V2 primary navigation'}>
    <div className={styles.inner}>
      {tabs.slice(0,5).map(tab=>{
        const active=tab.id===activeId
        const label=tab.label[lang]
        return <button key={tab.id} type="button" className={`${styles.item} ${active?styles.active:''}`} onClick={()=>onSelect?.(tab)} aria-current={active?'page':undefined} aria-label={label}>
          <tab.Icon size={20} strokeWidth={1.75} aria-hidden={true}/>
          <span>{label}</span>
        </button>
      })}
    </div>
  </nav>
}
