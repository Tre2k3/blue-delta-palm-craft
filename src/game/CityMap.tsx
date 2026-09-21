import { useEffect, useRef } from "react";
import { MapPin, Navigation } from "lucide-react";
import { POIS, WORLD_PX_H, WORLD_PX_W } from "./data";
import { roadRects } from "./worldTopology";
import type { HudSnapshot, LocationId } from "./types";
export function CityMap({ hud, onWaypoint }: { hud: HudSnapshot; onWaypoint: (id: LocationId | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c=ref.current?.getContext("2d"); if(!c)return;
    const sx=768/WORLD_PX_W,sy=576/WORLD_PX_H;
    c.fillStyle="#1c2922";c.fillRect(0,0,768,576);c.strokeStyle="#26372c";c.lineWidth=1;
    for(let x=0;x<768;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,576);c.stroke();}
    for(let y=0;y<576;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(768,y);c.stroke();}
    c.fillStyle="#536151";for(const r of roadRects())c.fillRect(r.x*sx,r.y*sy,r.w*sx,r.h*sy);
    for(const p of POIS){c.fillStyle=hud.waypoint===p.id?"#d4af37":p.id==="river"?"#365963":"#1db954";c.fillRect(p.x*sx,p.y*sy,p.w*sx,p.h*sy);c.fillStyle="#efe8de";c.font="bold 12px sans-serif";c.textAlign="center";c.fillText(p.label,(p.x+p.w/2)*sx,p.y*sy-8);}
    if(hud.objective){c.strokeStyle="#d4af37";c.lineWidth=2;c.setLineDash([5,6]);c.beginPath();c.moveTo(hud.position.x*sx,hud.position.y*sy);c.lineTo(hud.objective.x*sx,hud.objective.y*sy);c.stroke();c.setLineDash([]);}
    c.save();c.translate(hud.position.x*sx,hud.position.y*sy);c.rotate(-hud.position.yaw);c.fillStyle="#fff7e8";c.strokeStyle="#101c17";c.lineWidth=2;c.beginPath();c.moveTo(0,-11);c.lineTo(-7,8);c.lineTo(0,4);c.lineTo(7,8);c.closePath();c.fill();c.stroke();c.restore();
  },[hud.position,hud.objective,hud.waypoint]);
  return <section><p className="eyebrow">CITY MAP · {hud.visited.length}/{POIS.length} DISCOVERED</p><h2 className="font-display text-4xl">MEMPHIS 901</h2><p className="mt-2 text-sm text-muted">Pick a destination. The dashed line shows its direction.</p><canvas ref={ref} width={768} height={576} className="city-map mt-4 w-full rounded-xl border border-border" aria-label="Memphis streets, destinations and your position" /><p className="mt-3 flex items-center gap-2 text-xs text-muted"><Navigation size={14}/> You · <MapPin size={14}/> Destination</p><button className="secondary-button mt-4 w-full" onClick={()=>onWaypoint(null)}>Follow story objective</button><div className="mt-3 grid gap-2 sm:grid-cols-2">{POIS.map(p=><button key={p.id} aria-pressed={hud.waypoint===p.id} onClick={()=>onWaypoint(p.id)} className={`map-destination ${hud.waypoint===p.id?"selected":""}`}><MapPin size={16}/><span><span className="block text-sm font-semibold">{p.name}</span><span className="block text-xs text-muted">{p.district} · {hud.visited.includes(p.id)?"Visited":"Explore"}</span></span></button>)}</div></section>;
}
