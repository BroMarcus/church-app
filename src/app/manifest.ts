import type {MetadataRoute} from 'next'

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'One Kingdom OS',
    short_name:'One Kingdom',
    description:'Know every person. Clarify every next step. Let nobody be forgotten.',
    start_url:'/',
    display:'standalone',
    background_color:'#f5f7fb',
    theme_color:'#1e5bff',
    orientation:'portrait-primary',
    icons:[
      {src:'/kingdom-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
      {src:'/kingdom-icon-maskable.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
    ]
  }
}
