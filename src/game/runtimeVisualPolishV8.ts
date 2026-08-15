// @ts-nocheck
import * as THREE from "three";

/** Visual polish that never changes mission/economy/collision state. */
const done = new WeakSet();

function signTexture(lines, first = "#d4af37", second = "#f4efe5", bg = "#11100f") {
  const c = document.createElement("canvas"); c.width = 1400; c.height = 520;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.fillRect(0,0,c.width,c.height);
  g.strokeStyle = "#d4af37"; g.lineWidth = 16; g.strokeRect(12,12,c.width-24,c.height-24);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = first; g.font = "900 135px Arial Black,Impact,sans-serif"; g.fillText(lines[0], c.width/2, 185);
  if (lines[1]) { g.fillStyle = second; g.font = "900 82px Arial Black,Impact,sans-serif"; g.fillText(lines[1], c.width/2, 345); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; return tex;
}

function skylineTexture() {
  const c=document.createElement("canvas"); c.width=1000;c.height=420; const g=c.getContext("2d");
  const grad=g.createLinearGradient(0,0,0,c.height);grad.addColorStop(0,"#7d412b");grad.addColorStop(.55,"#df8b4e");grad.addColorStop(1,"#251814");g.fillStyle=grad;g.fillRect(0,0,c.width,c.height);
  g.fillStyle="#171515";
  const heights=[170,230,145,305,215,355,190,270,155,320,220,180,290,205];
  let x=0;for(let i=0;i<heights.length;i++){const w=55+(i%3)*18;g.fillRect(x,c.height-heights[i],w,heights[i]);g.fillStyle="#d6a85a";for(let yy=c.height-heights[i]+24;yy<c.height-18;yy+=36)for(let xx=x+12;xx<x+w-8;xx+=26)g.fillRect(xx,yy,8,13);g.fillStyle="#171515";x+=w+14;}
  g.fillStyle="#111";g.beginPath();g.moveTo(760,405);g.lineTo(840,90);g.lineTo(920,405);g.closePath();g.fill();
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}

function addApartment(group) {
  if (!group || group.userData.polishV8) return; group.userData.polishV8=true;
  const gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.45,roughness:.35});
  const green=new THREE.MeshStandardMaterial({color:0x176b3a,roughness:.72});
  const cream=new THREE.MeshStandardMaterial({color:0xd9d0c4,roughness:.88});
  const dark=new THREE.MeshStandardMaterial({color:0x12110f,roughness:.72});
  const box=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;group.add(m);return m;};
  // Rug / coffee table / desk / shoe wall.
  box(5.4,.04,3.1,0,.09,1.0,new THREE.MeshStandardMaterial({color:0x153d27,roughness:.96}));
  box(2.6,.34,1.2,1.6,.3,.8,dark); box(2.75,.06,1.3,1.6,.5,.8,gold);
  box(3.8,.12,.55,-4.8,.9,2.0,dark); box(3.8,.12,.55,-4.8,1.55,2.0,dark); box(3.8,.12,.55,-4.8,2.2,2.0,dark);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)box(.55,.16,.26,-5.9+col*.72,1.05+row*.65,1.78,(row+col)%2?cream:green);
  const win=new THREE.Mesh(new THREE.PlaneGeometry(6.4,2.65),new THREE.MeshBasicMaterial({map:skylineTexture(),toneMapped:false}));win.position.set(0,1.9,-5.25);group.add(win);
  const frame=new THREE.Mesh(new THREE.BoxGeometry(6.7,.08,.08),gold);frame.position.set(0,3.25,-5.15);group.add(frame);const frame2=frame.clone();frame2.position.y=.55;group.add(frame2);
  const poster=new THREE.Mesh(new THREE.PlaneGeometry(4.2,1.65),new THREE.MeshBasicMaterial({map:signTexture(["$ackReligious","KLOTHING"],"#1db954","#d4af37"),toneMapped:false}));poster.position.set(-5.8,2.1,-1.8);poster.rotation.y=Math.PI/2;group.add(poster);
  for(const p of [[-4,2.85,0],[0,2.85,0],[4,2.85,0]]){const l=new THREE.PointLight(0xffc47a,2.4,8,2);l.position.set(...p);group.add(l);}
}

function jerseyTexture(num="11", name="FRESH") {
  const c=document.createElement("canvas");c.width=420;c.height=600;const g=c.getContext("2d");
  g.fillStyle="#050505";g.fillRect(0,0,420,600);g.strokeStyle="#d4af37";g.lineWidth=18;g.strokeRect(30,25,360,550);g.fillStyle="#eee8dc";g.textAlign="center";g.font="900 70px Arial Black";g.fillText("SACKROW",210,120);g.fillText("BALLERS",210,195);g.fillStyle="#d4af37";g.font="900 170px Arial Black";g.fillText(num,210,395);g.font="900 54px Arial Black";g.fillText(name,210,505);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function addHQ(group) {
  if (!group || group.userData.polishV8) return; group.userData.polishV8=true;
  const gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.65,roughness:.28});const black=new THREE.MeshStandardMaterial({color:0x0e0d0c,roughness:.5});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(9.4,2.45),new THREE.MeshBasicMaterial({map:signTexture(["$ackReligious","KLOTHING"],"#d4af37","#f4efe5"),toneMapped:false}));sign.position.set(0,4.5,-6.45);group.add(sign);
  const trust=new THREE.Mesh(new THREE.PlaneGeometry(3.7,1.35),new THREE.MeshBasicMaterial({map:signTexture(["IN THE $ACK","WE TRUST"],"#f4efe5","#1db954"),toneMapped:false}));trust.position.set(6.9,2.1,-6.42);group.add(trust);
  for(const x of [-5.7,-2.1,1.5]){const j=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.35),new THREE.MeshBasicMaterial({map:jerseyTexture(x===-5.7?"11":x===-2.1?"22":"901"),transparent:true}));j.position.set(x,2.25,-6.35);group.add(j);}
  // Gold floor guide strips + checkout pedestal.
  for(const x of [-7.4,7.4]){const strip=new THREE.Mesh(new THREE.BoxGeometry(.05,.03,10.5),gold);strip.position.set(x,.09,-.4);group.add(strip);}
  const pedestal=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.05,1.25),black);pedestal.position.set(-3.1,.55,-1.4);group.add(pedestal);const top=new THREE.Mesh(new THREE.BoxGeometry(1.3,.06,1.3),gold);top.position.set(-3.1,1.1,-1.4);group.add(top);
  for(const x of [-6,-2,2,6]){const l=new THREE.PointLight(0xffc36d,2.8,9,2);l.position.set(x,4.7,-.4);group.add(l);}
  const green=new THREE.PointLight(0x1db954,2.3,9,2);green.position.set(-6,2.3,2.6);group.add(green);
}

function addGym(group) {
  if (!group || group.userData.polishV8) return; group.userData.polishV8=true;
  const gold=new THREE.MeshStandardMaterial({color:0xd4af37,metalness:.48,roughness:.34});const black=new THREE.MeshStandardMaterial({color:0x11100f,roughness:.64});
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(9.8,3.0),new THREE.MeshBasicMaterial({map:signTexture(["SACKROW","BALLERS"],"#f5efe3","#d4af37"),toneMapped:false}));brand.position.set(0,4.8,-9.55);group.add(brand);
  // Baseline wordmarks.
  for(const z of [-8.3,8.3]){const t=new THREE.Mesh(new THREE.PlaneGeometry(7.4,1.05),new THREE.MeshBasicMaterial({map:signTexture(["SACKROW BALLERS"],"#d4af37",undefined,"#181410"),transparent:true}));t.rotation.x=-Math.PI/2;t.position.set(0,.16,z);group.add(t);}
  // Team benches and scorer's table.
  for(const side of [-1,1]){const bench=new THREE.Mesh(new THREE.BoxGeometry(.65,.55,8.5),black);bench.position.set(side*10.7,.32,0);group.add(bench);const trim=new THREE.Mesh(new THREE.BoxGeometry(.7,.06,8.55),gold);trim.position.set(side*10.7,.62,0);group.add(trim);}
  const table=new THREE.Mesh(new THREE.BoxGeometry(5.3,.9,.8),black);table.position.set(0,.48,9.6);group.add(table);const tableSign=new THREE.Mesh(new THREE.PlaneGeometry(4.7,.65),new THREE.MeshBasicMaterial({map:signTexture(["$ACKROW BALLERS"],"#d4af37"),toneMapped:false}));tableSign.position.set(0,.55,9.17);tableSign.rotation.y=Math.PI;group.add(tableSign);
  // Warm arena pools + gold rim lights.
  for(const x of [-8,-4,0,4,8]){const l=new THREE.PointLight(0xffd6a0,3.6,13,2);l.position.set(x,6.7,0);group.add(l);}
}

function addStreetLights(world) {
  const root=new THREE.Group();root.name="V8_STREET_POLISH";
  const postMat=new THREE.MeshStandardMaterial({color:0x171717,metalness:.55,roughness:.38});const bulb=new THREE.MeshBasicMaterial({color:0xffd08a});
  const points=[[18,10],[33,14],[48,18],[66,12],[82,22],[100,16],[116,26],[132,14]];
  for(const [x,z] of points){const p=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,2.6,8),postMat);p.position.set(x,.0,z);p.geometry.translate(0,1.3,0);root.add(p);const b=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),bulb);b.position.set(x,2.55,z);root.add(b);const l=new THREE.PointLight(0xffc776,1.4,5.3,2);l.position.set(x,2.45,z);root.add(l);}
  world.scene.add(root);
}

function install(World3D) {
  const p=World3D?.prototype;if(!p||p.__visualPolishV8Installed)return;p.__visualPolishV8Installed=true;
  const oldBuild=p.buildCity;p.buildCity=function(...args){const out=oldBuild.apply(this,args);if(!done.has(this)){done.add(this);addStreetLights(this);}return out;};
  const oldSync=p.sync;p.sync=function visualPolishSync(frame){oldSync.call(this,frame);addApartment(this.scene.getObjectByName("V8_APARTMENT"));addHQ(this.scene.getObjectByName("V8_HQ"));addGym(this.scene.getObjectByName("V8_SACKROW_GYM"));if(this.scene.fog&&"density" in this.scene.fog)this.scene.fog.density=frame.mode==="world"?.0045:.002;};
}
setTimeout(async()=>{try{const {World3D}=await import("./world3d");install(World3D);}catch(err){console.error("Visual Polish V8 failed",err);}},1000);
