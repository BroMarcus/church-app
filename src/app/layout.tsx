import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileNavShell } from '@/components/mobile-nav-shell'
import { PageGuide } from '@/components/page-guide'
import './globals.css'
import './theme.css'

export const metadata:Metadata={title:'Kingdom Network',description:'Church community, discipleship and ministry platform'}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<Suspense fallback={null}><PageGuide/></Suspense><MobileNavShell/></body></html>}
