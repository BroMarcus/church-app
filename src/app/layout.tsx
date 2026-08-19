import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileNav } from '@/components/mobile-nav'
import { PageGuide } from '@/components/page-guide'
import './globals.css'

export const metadata:Metadata={title:'Kingdom Network',description:'Church community, discipleship and ministry platform'}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<Suspense fallback={null}><PageGuide/></Suspense><MobileNav/></body></html>}
