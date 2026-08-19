import type { Metadata } from 'next'
import { MobileNav } from '@/components/mobile-nav'
import { ProphetLauncher } from '@/components/prophet-launcher'
import { createClient } from '@/lib/supabase/server'
import './globals.css'

export const metadata:Metadata={title:'Kingdom Network',description:'Church community, discipleship and ministry platform'}

export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  const supabase=await createClient()
  const {data:claimsData}=await supabase.auth.getClaims()
  const userId=claimsData?.claims?.sub
  let churchRole:string|null=null
  let isGroupLeader=false

  if(userId){
    const [{data:membership},{data:groupLeadership}]=await Promise.all([
      supabase.from('church_memberships').select('role').eq('user_id',userId).eq('status','active').limit(1).maybeSingle(),
      supabase.from('group_memberships').select('id').eq('user_id',userId).eq('role','leader').limit(1).maybeSingle()
    ])
    churchRole=membership?.role??null
    isGroupLeader=Boolean(groupLeadership)
  }

  const authenticated=Boolean(userId)
  return <html lang="en"><body>{children}<ProphetLauncher authenticated={authenticated}/><MobileNav authenticated={authenticated} churchRole={churchRole} isGroupLeader={isGroupLeader}/></body></html>
}
