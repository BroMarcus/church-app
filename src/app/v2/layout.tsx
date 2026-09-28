import type { Metadata } from 'next'
import { Cormorant_Garamond,Work_Sans } from 'next/font/google'
import './v2-theme.css'
import styles from './v2-foundation.module.css'

const cormorant=Cormorant_Garamond({
  subsets:['latin'],
  weight:['600'],
  variable:'--kn-v2-cormorant',
  display:'swap',
  fallback:['Georgia','serif']
})

const workSans=Work_Sans({
  subsets:['latin'],
  weight:['400','500','600'],
  variable:'--kn-v2-work-sans',
  display:'swap',
  fallback:['system-ui','sans-serif']
})

export const metadata:Metadata={
  title:'Kingdom Network V2 — Foundation',
  description:'Isolated Kingdom Network V2 development and review area'
}

export default function V2Layout({children}:Readonly<{children:React.ReactNode}>){
  return <div className={`${styles.root} ${cormorant.variable} ${workSans.variable}`} data-kingdom-network-version="2">{children}</div>
}
