'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function DocumentLanguage(){
  const searchParams=useSearchParams()

  useEffect(()=>{
    const selected=searchParams.get('lang')
    if(selected==='en'||selected==='es')document.documentElement.lang=selected
  },[searchParams])

  return null
}
