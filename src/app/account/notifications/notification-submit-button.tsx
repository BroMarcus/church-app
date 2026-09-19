'use client'

import {useFormStatus} from 'react-dom'

export function NotificationSubmitButton({label,pendingLabel}:{label:string;pendingLabel:string}){
  const {pending}=useFormStatus()
  return <button className="btn" style={{marginTop:4}} type="submit" disabled={pending} aria-disabled={pending}>{pending?pendingLabel:label}</button>
}
