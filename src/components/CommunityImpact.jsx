import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from '../lib/design'

const ITEMS=[['completed_deals','🤝','tratos cerrados'],['gifts','🎁','regalos entregados'],['resolved_help','🙌','ayudas resueltas'],['resolved_alerts','✓','alertas cerradas']]
export default function CommunityImpact(){
 const [impact,setImpact]=useState(null)
 useEffect(()=>{supabase.rpc('get_neighborhood_impact').then(({data})=>setImpact(data||null))},[])
 if(!impact||!ITEMS.some(([key])=>Number(impact[key])>0))return null
 return <section style={s.wrap}><header style={s.header}><div><small style={s.kicker}>LO QUE LOGRAMOS JUNTOS</small><h2 style={s.title}>Tu barrio está funcionando</h2></div><span style={s.neighbors}>{Number(impact.neighbors||0)} vecinos</span></header><div style={s.grid}>{ITEMS.map(([key,icon,label])=><div key={key} style={s.item}><span style={s.icon}>{icon}</span><strong style={s.value}>{Number(impact[key]||0)}</strong><small style={s.label}>{label}</small></div>)}</div></section>
}
const s={wrap:{margin:'13px 14px 8px',padding:14,border:'1px solid #cfe8dc',borderRadius:17,background:'linear-gradient(145deg,#f4fbf7,#eaf7f1)'},header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10},kicker:{color:C.verde,fontSize:7.5,fontWeight:800,letterSpacing:'.05em'},title:{margin:'3px 0 0',fontSize:14.5,lineHeight:1.2},neighbors:{padding:'5px 8px',borderRadius:99,background:'#fff',color:C.verde,fontSize:8,fontWeight:800},grid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,marginTop:13},item:{minWidth:0,textAlign:'center'},icon:{height:25,display:'grid',placeItems:'center',fontSize:16},value:{display:'block',fontSize:17,color:'#174b39'},label:{display:'block',marginTop:2,color:'#617269',fontSize:7.5,lineHeight:1.25}}
