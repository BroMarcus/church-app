import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileNavShell } from '@/components/mobile-nav-shell'
import { PageGuide } from '@/components/page-guide'
import './globals.css'

export const metadata:Metadata={title:'Kingdom Network — Package 1 QA',description:'Isolated Package 1 phone verification environment'}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><div data-package1-qa="true" style={{position:'sticky',top:0,zIndex:9999,padding:'8px 12px',textAlign:'center',fontWeight:800,fontSize:'12px',letterSpacing:'.04em',background:'#f4c542',color:'#151515',borderBottom:'1px solid #8a6d00'}}>PACKAGE 1 PHONE QA • NOT PRODUCTION • PRUEBA QA — NO PRODUCCIÓN</div>{children}<Suspense fallback={null}><PageGuide/></Suspense><MobileNavShell/></body></html>}
