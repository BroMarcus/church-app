import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileNavShell } from '@/components/mobile-nav-shell'
import { PageGuide } from '@/components/page-guide'
import { InstallPromptCapture } from '@/components/install-prompt-capture'
import './globals.css'

export const metadata:Metadata={title:'Kingdom Network',description:'Church community, discipleship and ministry platform'}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><InstallPromptCapture/>{children}<Suspense fallback={null}><PageGuide/></Suspense><MobileNavShell/></body></html>}
