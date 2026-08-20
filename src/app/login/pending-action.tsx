'use client'

import { useFormStatus } from 'react-dom'

export function PendingAction({label,pendingLabel,action}:{label:string;pendingLabel:string;action:(formData:FormData)=>void}){
  const status=useFormStatus()
  return <button className="btn secondary" type="submit" formAction={action} disabled={status.pending}>{status.pending?pendingLabel:label}</button>
}
