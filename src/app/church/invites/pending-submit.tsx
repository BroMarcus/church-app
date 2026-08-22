'use client'

import { useFormStatus } from 'react-dom'

export function InvitePendingSubmit({label,pendingLabel,className='btn'}:{label:string;pendingLabel:string;className?:string}){
  const {pending}=useFormStatus()
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending} aria-busy={pending}>{pending?pendingLabel:label}</button>
}
