'use client'

import {useState} from 'react'
import {Eye,EyeOff} from 'lucide-react'

type Props={
  name:string
  label:string
  minLength?:number
  autoComplete?:string
  required?:boolean
  defaultValue?:string
  showLabel?:string
  hideLabel?:string
}

export function PasswordField({name,label,minLength,autoComplete,required=true,defaultValue,showLabel='Show password',hideLabel='Hide password'}:Props){
  const [visible,setVisible]=useState(false)
  return <label className="field"><span>{label}</span><div style={{position:'relative'}}><input name={name} type={visible?'text':'password'} minLength={minLength} autoComplete={autoComplete} required={required} defaultValue={defaultValue} style={{width:'100%',paddingRight:44}}/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?hideLabel:showLabel} aria-pressed={visible} title={visible?hideLabel:showLabel} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',display:'grid',placeItems:'center',width:32,height:32,border:0,background:'transparent',cursor:'pointer'}}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
}
