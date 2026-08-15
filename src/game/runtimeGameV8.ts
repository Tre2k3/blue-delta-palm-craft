// @ts-nocheck
import * as THREE from "three";
import { APPAREL, NPCS, PAL, PLAYER_RUN, PLAYER_SPEED, POIS } from "./data";

/**
 * $ackReligious KLOTHING — Runtime V8
 *
 * This is the single high-level runtime layer for characters, interiors,
 * basketball and presentation. It intentionally replaces the old V3/V4/V5/
 * V6/V7 stack, whose competing prototype wrappers caused invisible actors,
 * reversed facing and camera occlusion.
 *
 * World collision/traffic remains owned by runtimeFixesV2. V8 is installed
 * once, after that foundation, and does not import any of the retired layers.
 */

const S = 1 / 16;
const APARTMENT = { cx: -3200, cy: -3200, halfW: 112, halfD: 86, doorW: 36 };
const HQ = { cx: -3700, cy: -3200, halfW: 142, halfD: 105, doorW: 38 };
const GYM = { cx: -4300, cy: -3200, halfW: 188, halfD: 150 };

const ASSETS = {
  benjiWalk: "/game/sprites/benji_walk_4dir.webp",
  benjiRun: "/game/sprites/benji_run_4dir.webp",
  benjiBasketball: "/game/sprites/benji_basketball_actions.webp",
  kBlanco: "/game/sprites/k_blanco_walk_4dir.webp",
  npc: "/game/sprites/memphis_npc_walk_4dir.webp",
  courtOg: "/game/sprites/court_og_walk_4dir.webp",
};

const DIR_ROW = { down: 0, up: 1, right: 2, left: 3 };
const imageCache = new Map();
const atlasCache = new Map();
const worldState = new WeakMap();
const engineState = new WeakMap();

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function d2(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function wx(v) { return v * S; }
function wz(v) { return v * S; }

function loadImage(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`V8 asset failed: ${url}`));
    img.src = url;
  });
  imageCache.set(url, p);
  return p;
}

function dominantCornerColor(data, w, h) {
  const pts = [[1,1],[w-2,1],[1,h-2],[w-2,h-2]];
  let r=0,g=0,b=0,a=0,n=0;
  for (const [x,y] of pts) {
    const i=(y*w+x)*4;
    if (data[i+3] < 16) continue;
    r+=data[i]; g+=data[i+1]; b+=data[i+2]; a+=data[i+3]; n++;
  }
  return n ? [r/n,g/n,b/n,a/n] : [255,255,255,0];
}

function cleanCell(img, sx, sy, sw, sh, outfitColor = null) {
  const raw = document.createElement("canvas");
  raw.width = Math.max(2, Math.round(sw));
  raw.height = Math.max(2, Math.round(sh));
  const rc = raw.getContext("2d", { willReadFrequently: true });
  rc.clearRect(0,0,raw.width,raw.height);
  rc.drawImage(img, sx, sy, sw, sh, 0, 0, raw.width, raw.height);

  let id;
  try { id = rc.getImageData(0,0,raw.width,raw.height); } catch { id = null; }
  if (id) {
    const bg = dominantCornerColor(id.data, raw.width, raw.height);
    const uniformOpaqueBg = bg[3] > 220;
    let minX=raw.width, minY=raw.height, maxX=-1, maxY=-1;
    for (let y=0;y<raw.height;y++) for (let x=0;x<raw.width;x++) {
      const i=(y*raw.width+x)*4;
      let a=id.data[i+3];
      if (uniformOpaqueBg && a > 20) {
        const dr=id.data[i]-bg[0], dg=id.data[i+1]-bg[1], db=id.data[i+2]-bg[2];
        const delta=Math.sqrt(dr*dr+dg*dg+db*db);
        if (delta < 32) a=0;
        else if (delta < 52) a=Math.round(255*(delta-32)/20);
        id.data[i+3]=a;
      }

      // Visible wardrobe swap: recolor saturated Sack green fabric while
      // preserving skin, denim, jewelry, outlines and highlights.
      if (outfitColor && a > 20) {
        const r=id.data[i], g=id.data[i+1], b=id.data[i+2];
        const greenish = g > r*1.12 && g > b*1.08 && g > 55;
        if (greenish) {
          const tr=(outfitColor>>16)&255, tg=(outfitColor>>8)&255, tb=outfitColor&255;
          const lum=clamp((r+g+b)/(255*3),0.24,1.0);
          id.data[i]=Math.round(tr*(0.55+lum*0.55));
          id.data[i+1]=Math.round(tg*(0.55+lum*0.55));
          id.data[i+2]=Math.round(tb*(0.55+lum*0.55));
        }
      }
      if (a > 18) {
        minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      }
    }
    rc.putImageData(id,0,0);

    if (maxX >= minX && maxY >= minY) {
      const pad=3;
      minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
      maxX=Math.min(raw.width-1,maxX+pad); maxY=Math.min(raw.height-1,maxY+pad);
      const bw=maxX-minX+1, bh=maxY-minY+1;
      const out=document.createElement("canvas");
      out.width=192; out.height=240;
      const oc=out.getContext("2d");
      const scale=Math.min(178/bw,224/bh);
      const dw=bw*scale, dh=bh*scale;
      oc.drawImage(raw,minX,minY,bw,bh,(out.width-dw)/2,out.height-dh-5,dw,dh);
      return out;
    }
  }
  return raw;
}

async function makeAtlas(url, cols, rows, options = {}) {
  const key=`${url}|${cols}|${rows}|${options.outfitColor ?? "base"}`;
  if (atlasCache.has(key)) return atlasCache.get(key);
  const p=(async()=>{
    const img=await loadImage(url);
    const sw=img.naturalWidth/cols, sh=img.naturalHeight/rows;
    const frames=[];
    for (let row=0;row<rows;row++) {
      const r=[];
      for (let col=0;col<cols;col++) {
        const c=cleanCell(img,col*sw,row*sh,sw,sh,options.outfitColor ?? null);
        const tex=new THREE.CanvasTexture(c);
        tex.colorSpace=THREE.SRGBColorSpace;
        tex.magFilter=THREE.LinearFilter;
        tex.minFilter=THREE.LinearFilter;
        tex.generateMipmaps=false;
        const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:0.002});
        r.push(mat);
      }
      frames.push(r);
    }
    return {frames,cols,rows,image:img};
  })();
  atlasCache.set(key,p);
  return p;
}

function staticSpriteMaterial(img, key, cache) {
  if (!img) return null;
  if (cache.has(key)) return cache.get(key);
  const tex=new THREE.Texture(img); tex.needsUpdate=true; tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,alphaTest:0.002});
  cache.set(key,mat); return mat;
}

function textTexture(lines, opts={}) {
  const c=document.createElement("canvas"); c.width=1024; c.height=512;
  const g=c.getContext("2d");
  g.fillStyle=opts.bg ?? "#12100f"; g.fillRect(0,0,c.width,c.height);
  if (opts.border !== false) { g.strokeStyle=opts.gold ?? "#d4af37"; g.lineWidth=18; g.strokeRect(12,12,1000,488); }
  g.textAlign="center"; g.textBaseline="middle";
  const ys=lines.length===1?[256]:lines.length===2?[200,330]:[150,260,370];
  lines.forEach((line,i)=>{
    g.fillStyle=i===0?(opts.first ?? "#f5efe3"):(opts.gold ?? "#d4af37");
    g.font=i===0?"900 118px Arial Black, sans-serif":"900 82px Arial Black, sans-serif";
    g.fillText(line,c.width/2,ys[i]);
  });
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}

function makeFallbackPerson(index=0, role="npc") {
  const skins=[0x6f402c,0x925a3d,0x593526,0xa46a49,0x75452f,0x8d573c];
  const shirts=[0x1f6b3d,0x181818,0xe8e1d6,0x223a5a,0x5b472d,0x334f37];
  const g=new THREE.Group();
  const skin=new THREE.MeshStandardMaterial({color:role==="k"?0x9f6546:skins[index%skins.length],roughness:.72});
  const shirt=new THREE.MeshStandardMaterial({color:role==="k"?0x171412:shirts[index%shirts.length],roughness:.82});
  const pants=new THREE.MeshStandardMaterial({color:0x242931,roughness:.88});
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.48,4,8),shirt); torso.position.y=.93; g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),skin); head.position.y=1.48; g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8,0,Math.PI*2,0,Math.PI*.48),new THREE.MeshStandardMaterial({color:role==="k"?0xf5ead9:0x151311,roughness:.9})); hair.position.y=1.56; g.add(hair);
  for (const sx of [-1,1]) {
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.48,7),skin); arm.position.set(sx*.25,.98,0); g.add(arm);
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.55,7),pants); leg.position.set(sx*.1,.39,0); g.add(leg);
  }
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.27,14),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.24,depthWrite:false})); shadow.rotation.x=-Math.PI/2; shadow.position.y=.01; g.add(shadow);
  return g;
}

function ensureState(world) {
  let s=worldState.get(world);
  if (s) return s;
  s={
    built:false, staticMats:new Map(), atlas:{}, atlasReady:{},
    pedSprites:[], named:new Map(), namedFallback:new Map(),
    interior:null, hq:null, gym:null, gymActors:[], crowd:[], scoreboard:null,
    playerAtlasKey:null, lastOutfit:null,
  };
  worldState.set(world,s);
  return s;
}

function outfitColor(engine, mode) {
  if (mode === "basketball") return 0x181818;
  const item=APPAREL.find(a=>a.id===engine?.equipped);
  if (!item || !["top","set"].includes(item.category)) return null;
  const raw=String(item.color||"").replace("#","");
  return Number.parseInt(raw,16) || null;
}

function preloadAtlases(s) {
  if (s.__preloading) return;
  s.__preloading=true;
  const jobs=[
    ["benjiWalk",ASSETS.benjiWalk,5,4],
    ["benjiRun",ASSETS.benjiRun,5,4],
    ["k",ASSETS.kBlanco,6,4],
    ["npc",ASSETS.npc,6,4],
    ["courtOg",ASSETS.courtOg,6,4],
  ];
  for (const [key,url,cols,rows] of jobs) {
    makeAtlas(url,cols,rows).then(a=>{s.atlas[key]=a;s.atlasReady[key]=true;}).catch(err=>{s.atlasReady[key]=false;console.warn(`V8 atlas fallback ${key}`,err);});
  }
}

function buildApartment(world,s) {
  const g=new THREE.Group(); g.name="V8_APARTMENT";
  const cx=wx(APARTMENT.cx), cz=wz(APARTMENT.cy), w=wx(APARTMENT.halfW*2), d=wz(APARTMENT.halfD*2);
  const wall=world.mats?.hqBrick?new THREE.MeshStandardMaterial({map:world.mats.hqBrick,roughness:.86}):new THREE.MeshStandardMaterial({color:0x211a16,roughness:.9});
  const floorMat=world.mats?.wood?new THREE.MeshStandardMaterial({map:world.mats.wood,roughness:.68}):new THREE.MeshStandardMaterial({color:0x30251e});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),floorMat); floor.position.set(cx,.02,cz); floor.receiveShadow=true; g.add(floor);
  const addWall=(bw,bh,bd,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),wall);m.position.set(x,y,z);m.castShadow=true;g.add(m);};
  addWall(w,3.3,.18,cx,1.65,cz-d/2); addWall(.18,3.3,d,cx-w/2,1.65,cz); addWall(.18,3.3,d,cx+w/2,1.65,cz);
  const doorW=wx(APARTMENT.doorW), sideW=(w-doorW)/2;
  addWall(sideW,3.3,.18,cx-doorW/2-sideW/2,1.65,cz+d/2); addWall(sideW,3.3,.18,cx+doorW/2+sideW/2,1.65,cz+d/2);
  const header=new THREE.Mesh(new THREE.BoxGeometry(doorW,.5,.2),new THREE.MeshStandardMaterial({color:0x154c2d})); header.position.set(cx,3.05,cz+d/2);g.add(header);

  const bed=new THREE.Mesh(new THREE.BoxGeometry(4.1,.42,2.5),new THREE.MeshStandardMaterial({color:0x151515,roughness:.85}));bed.position.set(cx-4.25,.27,cz-3.1);g.add(bed);
  const blanket=new THREE.Mesh(new THREE.BoxGeometry(3.9,.18,2.3),new THREE.MeshStandardMaterial({color:0x176b3a,roughness:.92}));blanket.position.set(cx-4.25,.58,cz-3.1);g.add(blanket);
  const dresser=new THREE.Mesh(new THREE.BoxGeometry(2.4,.9,1.05),new THREE.MeshStandardMaterial({color:0x4a3427,roughness:.75}));dresser.position.set(cx+4.45,.48,cz-3.45);g.add(dresser);
  const rack=new THREE.Group();
  for(let i=0;i<5;i++){const tee=new THREE.Mesh(new THREE.BoxGeometry(.5,.65,.08),new THREE.MeshStandardMaterial({color:i%2?0x171717:0x166534,roughness:.9}));tee.position.set(cx+3.2+i*.5,1.45,cz+.5);rack.add(tee);}g.add(rack);
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(5.8,2.1),new THREE.MeshBasicMaterial({map:textTexture(["$ackReligious","KLOTHING"],{first:"#1db954"}),toneMapped:false}));poster.position.set(cx,1.85,cz-d/2+.1);g.add(poster);
  const light=new THREE.PointLight(0xffbd72,4.2,14,2);light.position.set(cx,2.75,cz);g.add(light);
  const exit=new THREE.Mesh(new THREE.RingGeometry(.35,.5,28),new THREE.MeshBasicMaterial({color:0x1db954,transparent:true,opacity:.72,side:THREE.DoubleSide}));exit.rotation.x=-Math.PI/2;exit.position.set(cx,.08,cz+d/2-.55);g.add(exit);
  world.scene.add(g); s.interior=g;
}

function buildHQ(world,s) {
  const g=new THREE.Group(); g.name="V8_HQ";
  const cx=wx(HQ.cx), cz=wz(HQ.cy), w=wx(HQ.halfW*2), d=wz(HQ.halfD*2);
  const floorMat=world.mats?.concrete?new THREE.MeshStandardMaterial({map:world.mats.concrete,roughness:.58}):new THREE.MeshStandardMaterial({color:0x4a4037,roughness:.6});
  const brick=world.mats?.hqBrick?new THREE.MeshStandardMaterial({map:world.mats.hqBrick,roughness:.82}):new THREE.MeshStandardMaterial({color:0x191615});
  const gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.55,roughness:.32});
  const black=new THREE.MeshStandardMaterial({color:0x12110f,metalness:.08,roughness:.45});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),floorMat);floor.position.set(cx,.02,cz);floor.receiveShadow=true;g.add(floor);
  const wall=(bw,bh,bd,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),brick);m.position.set(x,y,z);m.castShadow=true;g.add(m);};
  wall(w,5.8,.22,cx,2.9,cz-d/2);wall(.22,5.8,d,cx-w/2,2.9,cz);wall(.22,5.8,d,cx+w/2,2.9,cz);
  const doorW=wx(HQ.doorW), sideW=(w-doorW)/2;wall(sideW,5.8,.22,cx-doorW/2-sideW/2,2.9,cz+d/2);wall(sideW,5.8,.22,cx+doorW/2+sideW/2,2.9,cz+d/2);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(8.8,2.4),new THREE.MeshBasicMaterial({map:textTexture(["$ackReligious","KLOTHING"],{first:"#d4af37"}),toneMapped:false}));sign.position.set(cx,4.2,cz-d/2+.12);g.add(sign);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(5.4,1.35,1.25),black);counter.position.set(cx+2.7,.72,cz-2.7);g.add(counter);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(5.45,.08,1.3),gold);trim.position.set(cx+2.7,1.38,cz-2.7);g.add(trim);
  for(const side of [-1,1]) for(let row=0;row<4;row++){
    const shelf=new THREE.Mesh(new THREE.BoxGeometry(4.2,.12,.58),new THREE.MeshStandardMaterial({color:0x50392a,roughness:.58}));
    shelf.position.set(cx+side*6.3,1.0+row*.95,cz-3.2);shelf.rotation.y=Math.PI/2;g.add(shelf);
    for(let j=0;j<5;j++){const tee=new THREE.Mesh(new THREE.BoxGeometry(.42,.12,.48),new THREE.MeshStandardMaterial({color:(j+row)%3===0?0x1b6b3a:(j+row)%3===1?0x161616:0xd9d2c5,roughness:.9}));tee.position.set(cx+side*6.1,1.15+row*.95,cz-4.0+j*.75);g.add(tee);}
  }
  const jerseyWall=new THREE.Mesh(new THREE.PlaneGeometry(4.2,3.4),new THREE.MeshBasicMaterial({map:textTexture(["SACKROW","BALLERS"],{first:"#d4af37"}),toneMapped:false}));jerseyWall.position.set(cx-5.8,2.5,cz-d/2+.14);g.add(jerseyWall);
  const warm=new THREE.PointLight(0xffbd72,5.8,18,2);warm.position.set(cx,4.8,cz-1);g.add(warm);
  const green=new THREE.PointLight(0x1db954,2.2,10,2);green.position.set(cx-5,2.2,cz-2);g.add(green);
  const exit=new THREE.Mesh(new THREE.RingGeometry(.36,.5,28),new THREE.MeshBasicMaterial({color:0x1db954,transparent:true,opacity:.72,side:THREE.DoubleSide}));exit.rotation.x=-Math.PI/2;exit.position.set(cx,.08,cz+d/2-.6);g.add(exit);
  world.scene.add(g);s.hq=g;
}

function buildGym(world,s) {
  const g=new THREE.Group();g.name="V8_SACKROW_GYM";
  const cx=wx(GYM.cx),cz=wz(GYM.cy),w=wx(GYM.halfW*2),d=wz(GYM.halfD*2);
  const floorTex=world.mats?.court?.clone(); if(floorTex){floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(6,9);floorTex.needsUpdate=true;}
  const floorMat=new THREE.MeshStandardMaterial({map:floorTex,color:0x6d402b,roughness:.58});
  const dark=new THREE.MeshStandardMaterial({color:0x141210,roughness:.66});
  const gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.42,roughness:.36});
  const line=new THREE.MeshBasicMaterial({color:0xeadfcb});
  const floor=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),floorMat);floor.position.set(cx,.02,cz);floor.receiveShadow=true;g.add(floor);
  const wall=(bw,bh,bd,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),dark);m.position.set(x,y,z);g.add(m);};
  wall(w+3,8,.3,cx,4,cz-d/2-.4);wall(.3,8,d+2,cx-w/2-1,4,cz);wall(.3,8,d+2,cx+w/2+1,4,cz);
  const addLine=(bw,bd,x,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(bw,.018,bd),line);m.position.set(x,.14,z);g.add(m);};
  addLine(w*.92,.06,cx,cz-d*.45);addLine(w*.92,.06,cx,cz+d*.45);addLine(.06,d*.9,cx-w*.46,cz);addLine(.06,d*.9,cx+w*.46,cz);addLine(w*.92,.06,cx,cz);
  const circle=new THREE.Mesh(new THREE.RingGeometry(1.8,1.86,48),line);circle.rotation.x=-Math.PI/2;circle.position.set(cx,.15,cz);g.add(circle);
  const logo=new THREE.Mesh(new THREE.CircleGeometry(2.4,48),new THREE.MeshBasicMaterial({map:textTexture(["SACKROW","BALLERS"],{first:"#f5efe3",gold:"#d4af37"}),side:THREE.DoubleSide}));logo.rotation.x=-Math.PI/2;logo.position.set(cx,.145,cz);g.add(logo);
  const addHoop=(z,flip,name)=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.11,3.2,10),new THREE.MeshStandardMaterial({color:0x2b2927,metalness:.65,roughness:.3}));pole.position.set(cx,1.6,z+flip*.72);g.add(pole);
    const board=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.1,.08),new THREE.MeshStandardMaterial({color:0xf3eee4,roughness:.28}));board.position.set(cx,3.15,z+flip*.43);g.add(board);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.23,.028,10,28),new THREE.MeshStandardMaterial({color:0xea580c,metalness:.5,roughness:.25}));rim.rotation.x=Math.PI/2;rim.position.set(cx,2.72,z);rim.name=name;g.add(rim);
    const net=new THREE.Mesh(new THREE.CylinderGeometry(.22,.14,.42,12,4,true),new THREE.MeshBasicMaterial({color:0xe8e2d6,transparent:true,opacity:.56,wireframe:true}));net.position.set(cx,2.48,z);g.add(net);
  };
  addHoop(cz-d*.40,1,"V8_ACTIVE_HOOP");addHoop(cz+d*.40,-1,"V8_OTHER_HOOP");
  for(const side of [-1,1]) for(let row=0;row<4;row++){const bl=new THREE.Mesh(new THREE.BoxGeometry(2.1,.26,d*.76-row*.5),dark);bl.position.set(cx+side*(w*.45+1.0+row*.32),.18+row*.34,cz);g.add(bl);}
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(8.6,2.4),new THREE.MeshBasicMaterial({map:textTexture(["$ackReligious","SACKROW BALLERS"],{first:"#d4af37"}),toneMapped:false}));brand.position.set(cx,5.1,cz-d/2-.22);g.add(brand);
  const scoreCanvas=document.createElement("canvas");scoreCanvas.width=1024;scoreCanvas.height=300;const scoreTex=new THREE.CanvasTexture(scoreCanvas);scoreTex.colorSpace=THREE.SRGBColorSpace;
  const board=new THREE.Mesh(new THREE.PlaneGeometry(6.2,1.82),new THREE.MeshBasicMaterial({map:scoreTex,toneMapped:false}));board.position.set(cx,6.4,cz-d/2-.2);g.add(board);s.scoreboard={canvas:scoreCanvas,tex:scoreTex};
  for(const xoff of [-7,-2.4,2.4,7]){const l=new THREE.PointLight(0xffddb0,5.2,18,2);l.position.set(cx+xoff,7.1,cz);g.add(l);const panel=new THREE.Mesh(new THREE.BoxGeometry(2.2,.08,.62),new THREE.MeshBasicMaterial({color:0xffe7c2}));panel.position.set(cx+xoff,7.35,cz);g.add(panel);}
  world.scene.add(g);s.gym=g;
}

function updateScoreboard(s,engine) {
  if(!s.scoreboard) return;
  const {canvas,tex}=s.scoreboard,g=canvas.getContext("2d");
  g.fillStyle="#100f0e";g.fillRect(0,0,canvas.width,canvas.height);g.strokeStyle="#d4af37";g.lineWidth=14;g.strokeRect(8,8,1008,284);
  g.fillStyle="#d4af37";g.textAlign="center";g.font="900 52px Arial Black";g.fillText("SACKROW BALLERS",512,58);
  g.fillStyle="#f3eee4";g.font="900 92px Arial Black";g.fillText(String(engine?.ball?.score??0).padStart(2,"0"),335,170);g.fillText(String(Math.max(0,Math.ceil(engine?.ball?.timeLeft??0))).padStart(2,"0"),690,170);
  g.fillStyle="#b9aa98";g.font="700 30px Arial";g.fillText("SCORE",335,225);g.fillText("SECONDS",690,225);tex.needsUpdate=true;
}

function buildWorldExtras(world) {
  const s=ensureState(world); if(s.built) return s; s.built=true; preloadAtlases(s);
  buildApartment(world,s);buildHQ(world,s);buildGym(world,s);
  return s;
}

function makeNamedActor(world,s,id,index=0) {
  if(s.named.has(id)) return s.named.get(id);
  const spr=new THREE.Sprite(new THREE.SpriteMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));spr.scale.set(1.1,1.85,1);spr.position.y=.94;spr.renderOrder=4;world.scene.add(spr);
  const fb=makeFallbackPerson(index,id==="k_blanco"?"k":"npc");fb.visible=false;world.scene.add(fb);
  const a={sprite:spr,fallback:fb,facing:"down",prevX:null,prevY:null};s.named.set(id,a);return a;
}

function actorSpec(id){if(id==="k_blanco")return["k",6];if(id==="court_coach")return["courtOg",6];return["npc",6];}

function syncCharacters(world,frame,engine) {
  const s=buildWorldExtras(world);
  // Benji: use atlas animation when available; keep the proven static sprite as
  // a guaranteed fallback so a bad optional asset can never make him invisible.
  const facing=frame.facing||"down";
  const row=DIR_ROW[facing]??0;
  const wantsRun=engine?.running && frame.moving;
  const outfit=outfitColor(engine,frame.mode);
  const atlasKey=`${wantsRun?"run":"walk"}|${outfit??"base"}`;
  let atlas=s.__playerAtlases?.[atlasKey];
  if(!s.__playerAtlases)s.__playerAtlases={};
  if(!atlas && !s.__playerPromises?.[atlasKey]){
    if(!s.__playerPromises)s.__playerPromises={};
    const url=wantsRun?ASSETS.benjiRun:ASSETS.benjiWalk;
    s.__playerPromises[atlasKey]=makeAtlas(url,5,4,{outfitColor:outfit}).then(a=>{s.__playerAtlases[atlasKey]=a;}).catch(()=>{});
  }
  atlas=s.__playerAtlases[atlasKey];
  if(atlas){
    const idx=frame.moving?Math.floor((frame.clock||0)*(wantsRun?11:8))%5:0;
    world.sprite.material=atlas.frames[row]?.[idx]??atlas.frames[0][0];
  }else{
    const key=facing==="up"?"back":facing==="down"?"front":facing;
    const img=frame.images?.[key]??frame.images?.front;
    const mat=staticSpriteMaterial(img,`v8-${key}`,s.staticMats);if(mat)world.sprite.material=mat;
  }
  world.sprite.visible=frame.cameraView==="third";
  world.sprite.scale.set(1.18,1.92,1);world.sprite.position.y=.97+(frame.bob||0)*.012;

  // Hide primitive ambient rigs only after the 2.5D atlas is ready.
  const npcAtlas=s.atlas.npc;
  if(npcAtlas){
    while(s.pedSprites.length<frame.peds.length){const sp=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:0,depthWrite:false}));sp.scale.set(1.05,1.82,1);sp.position.y=.92;sp.renderOrder=3;world.scene.add(sp);s.pedSprites.push({sprite:sp,facing:"down"});}
    for(let i=0;i<s.pedSprites.length;i++){
      const a=s.pedSprites[i],p=frame.peds[i];if(!p||frame.mode!=="world"){a.sprite.visible=false;continue;}
      const ax=Math.abs(p.vx||0),ay=Math.abs(p.vy||0);if(ax>.05||ay>.05)a.facing=ax>ay?(p.vx<0?"left":"right"):(p.vy<0?"up":"down");
      const fr=Math.floor(((frame.clock||0)+(p.t||i)*.09)*7.5)%6;a.sprite.material=npcAtlas.frames[DIR_ROW[a.facing]][fr];a.sprite.position.set(wx(p.x),.92,wz(p.y));a.sprite.visible=true;
      if(world.peds?.[i])world.peds[i].visible=false;
    }
  }

  // Named characters: no white cards. Use K/Court OG/NPC atlas or a real 3D
  // fallback body while assets load.
  const seen=new Set();
  frame.npcs?.forEach((n,i)=>{
    seen.add(n.id);const a=makeNamedActor(world,s,n.id,i);const [key,cols]=actorSpec(n.id);const at=s.atlas[key];
    const showWorld=frame.mode==="world";
    if(!showWorld){a.sprite.visible=false;a.fallback.visible=false;return;}
    if(at){
      const dx=a.prevX==null?0:n.x-a.prevX,dy=a.prevY==null?0:n.y-a.prevY;if(Math.hypot(dx,dy)>.03)a.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?"left":"right"):(dy<0?"up":"down");
      const fr=Math.hypot(dx,dy)>.03?Math.floor((frame.clock||0)*7)%cols:0;a.sprite.material=at.frames[DIR_ROW[a.facing]][fr];a.sprite.position.set(wx(n.x),.94,wz(n.y));a.sprite.visible=true;a.fallback.visible=false;
    }else{a.fallback.position.set(wx(n.x),0,wz(n.y));a.fallback.visible=true;a.sprite.visible=false;}
    a.prevX=n.x;a.prevY=n.y;
    const legacy=world.npcSprites?.get?.(n.id);if(legacy)legacy.visible=false;
  });
  for(const [id,a] of s.named)if(!seen.has(id)){a.sprite.visible=false;a.fallback.visible=false;}
}

function syncInteriorActors(world,frame,engine) {
  const s=buildWorldExtras(world);
  if(frame.mode==="interior"&&engine?.__v8Interior==="hq"){
    const a=makeNamedActor(world,s,"__hq_k",99);const at=s.atlas.k;const x=wx(HQ.cx+42),z=wz(HQ.cy-32);
    if(at){a.sprite.material=at.frames[0][0];a.sprite.position.set(x,.94,z);a.sprite.visible=true;a.fallback.visible=false;}else{a.fallback.position.set(x,0,z);a.fallback.visible=true;a.sprite.visible=false;}
  }else{const a=s.named.get("__hq_k");if(a){a.sprite.visible=false;a.fallback.visible=false;}}
}

function syncGymActors(world,frame,engine) {
  const s=buildWorldExtras(world);if(frame.mode!=="basketball"){for(const a of s.gymActors){a.sprite.visible=false;a.fallback.visible=false;}return;}
  while(s.gymActors.length<6){const id=s.gymActors.length===0?"k_blanco":`gym_${s.gymActors.length}`;const a=makeNamedActor(world,s,`__${id}`,130+s.gymActors.length);s.gymActors.push(a);}
  const t=frame.clock||0,cx=GYM.cx,cy=GYM.cy;
  const positions=[
    [cx-72+Math.sin(t*.7)*18,cy-36+Math.cos(t*.6)*12,"k"],
    [cx+70+Math.sin(t*.55)*20,cy-20,"npc"],[cx-45,cy+30+Math.cos(t*.8)*20,"npc"],
    [cx+30+Math.cos(t*.65)*22,cy-48,"npc"],[cx+82,cy+38+Math.sin(t*.6)*18,"npc"],[cx-90+Math.cos(t*.5)*14,cy+52,"npc"],
  ];
  s.gymActors.forEach((a,i)=>{
    const [px,py,kind]=positions[i];const at=kind==="k"?s.atlas.k:s.atlas.npc;const fr=Math.floor(t*6+i)%6;
    if(at){a.sprite.material=at.frames[0][fr];a.sprite.position.set(wx(px),.94,wz(py));a.sprite.visible=true;a.fallback.visible=false;}else{a.fallback.position.set(wx(px),0,wz(py));a.fallback.visible=true;a.sprite.visible=false;}
  });
  updateScoreboard(s,engine);
}

function applySceneVisibility(world,frame,engine) {
  const s=buildWorldExtras(world);
  if(s.interior)s.interior.visible=frame.mode==="interior"&&engine?.__v8Interior==="apartment";
  if(s.hq)s.hq.visible=frame.mode==="interior"&&engine?.__v8Interior==="hq";
  if(s.gym)s.gym.visible=frame.mode==="basketball";
}

function installWorld(World3D) {
  const p=World3D?.prototype;if(!p||p.__v8Installed)return;p.__v8Installed=true;
  const oldBuild=p.buildCity;
  p.buildCity=function(...args){const out=oldBuild.apply(this,args);buildWorldExtras(this);return out;};
  const oldSync=p.sync;
  p.sync=function(frame){
    oldSync.call(this,frame);
    const engine=this.__v8Engine;
    buildWorldExtras(this);applySceneVisibility(this,frame,engine);syncCharacters(this,frame,engine);syncInteriorActors(this,frame,engine);syncGymActors(this,frame,engine);
    const x=wx(frame.px),z=wz(frame.py);
    if(frame.mode==="interior"&&frame.cameraView==="third"){
      this.camera.position.lerp(new THREE.Vector3(x,2.45,z+4.6),.28);this.camera.lookAt(x,1.15,z-.6);this.camera.fov=59;
    }else if(frame.mode==="basketball"&&frame.cameraView==="third"){
      this.camera.position.lerp(new THREE.Vector3(x,3.25,z+7.2),.24);this.camera.lookAt(x,1.05,z-2.2);this.camera.fov=60;
    }else if(frame.mode==="world"&&frame.cameraView==="third"){
      // Camera collision against solid meshes. Pull camera forward rather than
      // letting buildings/ground cover the player.
      if(!this.__v8Ray)this.__v8Ray=new THREE.Raycaster();
      const origin=new THREE.Vector3(x,1.25,z),dir=this.camera.position.clone().sub(origin),dist=dir.length();
      if(dist>1.2){dir.normalize();this.__v8Ray.set(origin,dir);this.__v8Ray.far=dist;const hits=this.__v8Ray.intersectObjects(this.scene.children,true).filter(h=>h.distance>.42&&h.object.visible&&!(h.object instanceof THREE.Sprite)&&!this.player.children.includes(h.object));const hit=hits[0];if(hit&&hit.distance<dist-.3){this.camera.position.copy(origin).addScaledVector(dir,Math.max(.9,hit.distance-.32));this.camera.lookAt(x,1.18,z);}}
    }
    this.camera.updateProjectionMatrix();
  };
}

function est(engine){let s=engineState.get(engine);if(!s){s={returnMode:null,returnInterior:null};engineState.set(engine,s);}return s;}

function enterApartment(engine){engine.mode="interior";engine.__v8Interior="apartment";engine.px=APARTMENT.cx;engine.py=APARTMENT.cy+18;engine.vx=engine.vy=0;engine.facing="up";engine.dir="up";engine.updateProximity?.();engine.emitHud?.();}
function enterHQ(engine){engine.mode="interior";engine.__v8Interior="hq";engine.px=HQ.cx;engine.py=HQ.cy+HQ.halfD-42;engine.vx=engine.vy=0;engine.facing="up";engine.dir="up";engine.updateProximity?.();engine.emitHud?.();}
function exitInterior(engine){
  const kind=engine.__v8Interior;engine.mode="world";engine.__v8Interior=null;const poi=POIS.find(p=>p.id===(kind==="hq"?"store":"apartment"));if(poi){engine.px=poi.x+poi.w/2;engine.py=poi.y+poi.h+150;}engine.vx=engine.vy=0;engine.yaw=0;engine.facing="down";engine.dir="down";
  if(kind==="apartment"){const step=engine.mission?.steps?.[engine.mission.activeStep];if(step?.id==="wake"&&!step.done)engine.completeStep("wake");engine.leftSpawn=true;}
  engine.updateProximity?.();engine.emitHud?.();
}

function interiorMove(engine,dt,mx,my,runHeld,room){
  const len=Math.hypot(mx,my);if(len>.01){mx/=len;my/=len;}const speed=runHeld?PLAYER_RUN*.72:PLAYER_SPEED*.72;engine.vx=mx*speed;engine.vy=my*speed;engine.moving=len>.01;
  if(engine.moving){if(Math.abs(mx)>Math.abs(my))engine.facing=mx<0?"left":"right";else engine.facing=my<0?"up":"down";engine.dir=engine.facing;}
  let nx=engine.px+engine.vx*dt,ny=engine.py+engine.vy*dt;nx=clamp(nx,room.cx-room.halfW+18,room.cx+room.halfW-18);ny=clamp(ny,room.cy-room.halfD+18,room.cy+room.halfD-14);
  engine.px=nx;engine.py=ny;engine.animT+=(dt*(engine.moving?9:2));engine.bob=engine.moving?Math.sin(engine.animT*2)*3.2:Math.sin(engine.animT)*.6;
}

function installEngine(GameEngine) {
  const p=GameEngine?.prototype;if(!p||p.__v8Installed)return;p.__v8Installed=true;

  const oldInit=p.init;p.init=async function(...args){const out=await oldInit.apply(this,args);if(this.world3d)this.world3d.__v8Engine=this;return out;};
  const oldStart=p.start;p.start=function(fresh=false){const out=oldStart.call(this,fresh);if(fresh||(!this.missionComplete&&!this.mission.steps?.[0]?.done))enterApartment(this);return out;};
  const oldReset=p.resetProgress;p.resetProgress=function(...args){const out=oldReset.apply(this,args);this.__v8Interior="apartment";return out;};

  const oldUpdatePlayer=p.updatePlayer;p.updatePlayer=function(dt,mx,my,runHeld){
    if(this.mode==="interior"&&this.__v8Interior==="apartment"){interiorMove(this,dt,mx,my,runHeld,APARTMENT);return;}
    if(this.mode==="interior"&&this.__v8Interior==="hq"){interiorMove(this,dt,mx,my,runHeld,HQ);return;}
    if(this.mode==="basketball"){
      interiorMove(this,dt,mx,my,runHeld,{...GYM,halfW:GYM.halfW-18,halfD:GYM.halfD-22});return;
    }
    const out=oldUpdatePlayer.call(this,dt,mx,my,runHeld);
    // Visual direction follows raw input rather than camera-rotated velocity.
    const ax=Math.abs(Number(mx)||0),ay=Math.abs(Number(my)||0);if(ax>.05||ay>.05){this.facing=ax>ay?(mx<0?"left":"right"):(my<0?"up":"down");this.dir=this.facing;}
    return out;
  };

  const oldProx=p.updateProximity;p.updateProximity=function(){
    if(this.mode==="interior"){
      this.nearPoi=null;this.nearNpc=null;this.interactHint=null;
      if(this.__v8Interior==="apartment"){
        if(this.py>APARTMENT.cy+APARTMENT.halfD-38)this.interactHint="Leave Benji's Apartment";else this.interactHint="Explore Benji's Apartment";
      }else if(this.__v8Interior==="hq"){
        if(this.py>HQ.cy+HQ.halfD-36)this.interactHint="Exit SackReligious HQ";
        else if(d2(this.px,this.py,HQ.cx+42,HQ.cy-32)<62){this.nearNpc="k_blanco";this.interactHint="Talk to K Blanco";}
        else if(d2(this.px,this.py,HQ.cx-72,HQ.cy-6)<72)this.interactHint="Browse the $ackReligious wall";
        else this.interactHint="Explore SackReligious KLOTHING";
      }
      return;
    }
    return oldProx.call(this);
  };

  const oldInteract=p.tryInteract;p.tryInteract=function(...args){
    if(this.mode==="interior"){
      if(this.__v8Interior==="apartment"){if(this.py>APARTMENT.cy+APARTMENT.halfD-42)exitInterior(this);return;}
      if(this.__v8Interior==="hq"){
        if(this.py>HQ.cy+HQ.halfD-42){exitInterior(this);return;}
        if(d2(this.px,this.py,HQ.cx+42,HQ.cy-32)<72){this.__v8DialogueReturn="hq";this.openDialogue("k_blanco");return;}
        if(d2(this.px,this.py,HQ.cx-72,HQ.cy-6)<82){this.__v8ShopReturn="hq";this.openShop();return;}
        return;
      }
    }
    if(this.mode==="world"&&this.nearPoi==="store"&&!this.nearNpc){enterHQ(this);return;}
    return oldInteract.apply(this,args);
  };

  const oldAdvance=p.advanceDialogue;p.advanceDialogue=function(...args){const ret=oldAdvance.apply(this,args);if(this.mode==="world"&&this.__v8DialogueReturn==="hq"){this.__v8DialogueReturn=null;this.mode="interior";this.__v8Interior="hq";this.px=HQ.cx+20;this.py=HQ.cy-2;this.updateProximity?.();this.emitHud?.();}return ret;};
  const oldCloseShop=p.closeShop;p.closeShop=function(...args){const ret=oldCloseShop.apply(this,args);if(this.__v8ShopReturn==="hq"){this.__v8ShopReturn=null;this.mode="interior";this.__v8Interior="hq";this.px=HQ.cx-48;this.py=HQ.cy;this.updateProximity?.();this.emitHud?.();}return ret;};

  const oldEnterBall=p.enterBasketball;p.enterBasketball=function(){
    // Replace the outdoor prototype with a stable indoor Sackrow session.
    this.mode="basketball";this.__v8Interior=null;this.px=GYM.cx;this.py=GYM.cy+GYM.halfD-50;this.yaw=0;this.pitch=.08;this.facing="up";this.dir="up";
    Object.assign(this.ball,{active:true,score:0,timeLeft:75,shots:0,power:0,charging:false,inFlight:false,held:true,made:false,flash:0,combo:0,best:0,shotDist:0,grade:"",ballX:this.px,ballY:this.py,ballZ:30,ballVx:0,ballVy:0,ballVz:0,__returnT:0,__scored:false});
    this.showToast?.("Sackrow Ballers · move · hold/release shoot");this.emitHud?.();
  };

  p.hoop=function(){return{x:GYM.cx,y:GYM.cy-GYM.halfD+42,z:86,court:{x:GYM.cx-GYM.halfW,y:GYM.cy-GYM.halfD,w:GYM.halfW*2,h:GYM.halfD*2}};};
  p.beginCharge=function(){if(this.mode!=="basketball"||!this.ball.held||this.ball.inFlight)return;this.ball.charging=true;if(this.ball.power<=0)this.ball.power=.02;};
  p.releaseShot=function(){
    if(this.mode!=="basketball"||this.ball.inFlight||!this.ball.held)return;
    let power=this.ball.charging?this.ball.power:.62;this.ball.charging=false;power=clamp(power,.05,1);this.ball.shots++;
    const hoop=this.hoop(),dx=hoop.x-this.px,dy=hoop.y-this.py,d=Math.hypot(dx,dy);const perfect=power>=.54&&power<=.76,good=power>=.40&&power<=.90;
    this.ball.grade=perfect?"PERFECT":good?"GOOD":"LATE";const nearestDef=[[-52,-34],[44,-56],[72,26]].reduce((best,o)=>Math.min(best,d2(this.px,this.py,GYM.cx+o[0],GYM.cy+o[1])),999);
    const pressure=clamp((70-nearestDef)/70,0,.42);const quality=(perfect?1:good?.78:.42)-pressure;const miss=(1-quality)*34;
    const targetX=hoop.x+(Math.random()-.5)*miss,targetY=hoop.y+(Math.random()-.5)*miss*.7;const t=clamp(.72+d/650,.72,1.18);const g=780;
    this.ball.ballX=this.px;this.ball.ballY=this.py-10;this.ball.ballZ=42;this.ball.ballVx=(targetX-this.ball.ballX)/t;this.ball.ballVy=(targetY-this.ball.ballY)/t;this.ball.ballVz=(hoop.z-this.ball.ballZ+.5*g*t*t)/t;
    this.ball.inFlight=true;this.ball.held=false;this.ball.power=0;this.ball.shotDist=d;this.ball.__scored=false;this.ball.__returnT=0;
  };

  p.updateBasketball=function(dt){
    if(this.mode!=="basketball")return;this.ball.timeLeft=Math.max(0,this.ball.timeLeft-dt);if(this.ball.flash>0)this.ball.flash=Math.max(0,this.ball.flash-dt);
    if(this.ball.timeLeft<=0){this.exitBasketball();return;}
    if(this.ball.charging&&this.ball.held){this.ball.power=Math.min(1,this.ball.power+dt*.82);if(this.ball.power>=.995)this.releaseShot();}
    if(this.ball.held){const side=this.facing==="left"?-9:this.facing==="right"?9:0;this.ball.ballX=this.px+side;this.ball.ballY=this.py-6;this.ball.ballZ=18+Math.abs(Math.sin(this.clock*7))*18+(this.ball.charging?this.ball.power*14:0);return;}
    if(this.ball.inFlight){
      const prevZ=this.ball.ballZ;this.ball.ballX+=this.ball.ballVx*dt;this.ball.ballY+=this.ball.ballVy*dt;this.ball.ballZ+=this.ball.ballVz*dt;this.ball.ballVz-=780*dt;
      const hoop=this.hoop(),planar=d2(this.ball.ballX,this.ball.ballY,hoop.x,hoop.y);
      if(!this.ball.__scored&&this.ball.ballVz<0&&prevZ>=hoop.z-5&&this.ball.ballZ<=hoop.z+5&&planar<14){
        const pts=this.ball.shotDist>165?3:2,bonus=this.ball.grade==="PERFECT"?1:0;this.ball.score+=pts+bonus;this.ball.combo++;this.ball.best=Math.max(this.ball.best,this.ball.combo);this.ball.flash=.5;this.ball.__scored=true;this.tryCreditBasketball?.();this.float?.(`SWISH +${pts+bonus}`,PAL.gold,hoop.x,hoop.y);this.burst?.(hoop.x,hoop.y,PAL.gold);
      }
      if(this.ball.ballZ<=8){this.ball.ballZ=8;if(Math.abs(this.ball.ballVz)>75){this.ball.ballVz=Math.abs(this.ball.ballVz)*.38;this.ball.ballVx*=.68;this.ball.ballVy*=.68;}else{this.ball.inFlight=false;this.ball.ballVz=0;this.ball.__returnT=.65;if(!this.ball.__scored)this.ball.combo=0;}}
    }else{
      this.ball.__returnT=Math.max(0,(this.ball.__returnT||0)-dt);if(this.ball.__returnT<=0){this.ball.held=true;this.ball.power=0;this.ball.charging=false;this.ball.ballX=this.px;this.ball.ballY=this.py;this.ball.ballZ=18;}
    }
  };

  const oldExitBall=p.exitBasketball;p.exitBasketball=function(){
    this.tryCreditBasketball?.();const pay=this.ball.score*5+Math.max(0,this.ball.combo)*4;if(pay>0){this.sackdollars+=pay;this.showToast?.(`Court payout: +$${pay} $ackdollars`);}
    this.mode="world";this.ball.active=false;this.ball.charging=false;this.ball.inFlight=false;this.ball.held=true;const court=POIS.find(x=>x.id==="court");if(court){this.px=court.x+court.w/2;this.py=court.y+court.h+80;}this.save?.();this.updateProximity?.();this.emitHud?.();
  };

  const oldDraw=p.draw;p.draw=function(...args){if(this.world3d)this.world3d.__v8Engine=this;return oldDraw.apply(this,args);};

  // QA hooks used by the smoke test and manual debugging.
  const oldWire=p.wireQa;p.wireQa=function(...args){oldWire.apply(this,args);if(typeof window!=="undefined")window.__SACK_V8__={version:8,engine:this,get mode(){return this.engine.mode;},get facing(){return this.engine.facing;},get interior(){return this.engine.__v8Interior||null;},get ball(){return{score:this.engine.ball.score,held:this.engine.ball.held,inFlight:this.engine.ball.inFlight,shots:this.engine.ball.shots,power:this.engine.ball.power};}};};
}

setTimeout(async()=>{
  try{
    const [{GameEngine},{World3D}]=await Promise.all([import("./engine"),import("./world3d")]);
    installEngine(GameEngine);installWorld(World3D);
    if(typeof window!=="undefined")window.__SACK_V8_BOOT__={installed:true,version:8};
  }catch(err){console.error("$ackReligious V8 boot failed",err);if(typeof window!=="undefined")window.__SACK_V8_BOOT__={installed:false,error:String(err)};}
},50);
