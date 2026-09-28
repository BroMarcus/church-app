'use client'

import {useFormStatus} from 'react-dom'

export function SecuritySubmitButton({label,pendingLabel,className='btn'}:{label:string;pendingLabel:string;className?:string}){
  const {pending}=useFormStatus()
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>{pending?pendingLabel:label}</button>
}
