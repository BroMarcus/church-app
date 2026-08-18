import type { Metadata } from 'next'
import { MobileNav } from '@/components/mobile-nav'
import './globals.css'

export const metadata:Metadata={title:'Kingdom Network',description:'Church community, discipleship and ministry platform'}

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<MobileNav/></body></html>}
