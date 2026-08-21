'use client'

import { useFormStatus } from 'react-dom'

export function ReportSubmitButton(){
  const {pending}=useFormStatus()
  return <button className="btn" disabled={pending} aria-disabled={pending}>{pending?'Submitting report…':'Submit report'}</button>
}
