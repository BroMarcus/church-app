'use client'

import {useFormStatus} from 'react-dom'

type Props={
  label:string
  pendingLabel:string
  className?:string
}

export default function HelpSubmitButton({label,pendingLabel,className='btn'}:Props){
  const {pending}=useFormStatus()
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending}>
    <span aria-live="polite">{pending?pendingLabel:label}</span>
  </button>
}
