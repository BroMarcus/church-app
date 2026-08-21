import type { Metadata } from 'next'
import styles from './v2-foundation.module.css'

export const metadata:Metadata={
  title:'Kingdom Network V2 — Foundation',
  description:'Isolated Kingdom Network V2 development and review area'
}

export default function V2Layout({children}:Readonly<{children:React.ReactNode}>){
  return <div className={styles.root} data-kingdom-network-version="2">{children}</div>
}
