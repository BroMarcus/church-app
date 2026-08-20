'use client'

import { useFormStatus } from 'react-dom'

export function PendingSubmit({label,pendingLabel}:{label:string;pendingLabel:string}){
  const status=useFormStatus()
  return <button className="btn" type="submit" disabled={status.pending}>{status.pending?pendingLabel:label}</button>
}
