import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import '@/app/notifications/notifications.css'

export async function NotificationBell({userId}:{userId:string}){
  const supabase=await createClient()
  const {count}=await supabase.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null)
  const unread=count??0
  return <Link className="ghost bell-link" href="/notifications" aria-label={`${unread} unread notifications`}><Bell size={15}/><span>Notifications</span>{unread>0&&<span className="bell-count">{unread>99?'99+':unread}</span>}</Link>
}
