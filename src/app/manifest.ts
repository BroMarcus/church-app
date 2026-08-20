import type {MetadataRoute} from 'next'

export default function manifest():MetadataRoute.Manifest{
  return {
    name:'Kingdom Network',
    short_name:'Kingdom',
    description:'Church community, discipleship and ministry platform',
    start_url:'/',
    display:'standalone',
    background_color:'#0b0810',
    theme_color:'#0b0810',
    orientation:'portrait-primary',
    icons:[
      {src:'/kingdom-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
      {src:'/kingdom-icon-maskable.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'}
    ]
  }
}