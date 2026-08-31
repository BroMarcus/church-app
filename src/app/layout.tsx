import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MobileNavShell } from '@/components/mobile-nav-shell'
import { PageGuide } from '@/components/page-guide'
import './globals.css'

export const metadata:Metadata={
  title:{default:'One Kingdom OS',template:'%s | One Kingdom'},
  description:'Know every person. Clarify every next step. Let nobody be forgotten.',
  applicationName:'One Kingdom OS',
}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body>{children}<Suspense fallback={null}><PageGuide/></Suspense><MobileNavShell/></body></html>
}
