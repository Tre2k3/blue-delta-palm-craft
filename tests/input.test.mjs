import test from "node:test";
import assert from "node:assert/strict";
import { InputManager } from "../src/game/input.ts";
globalThis.window = new EventTarget();
globalThis.document = Object.assign(new EventTarget(),{hidden:false,pointerLockElement:null});
globalThis.HTMLElement = class {};
globalThis.HTMLCanvasElement = class {};
let pads=[];
Object.defineProperty(globalThis,"navigator",{value:{getGamepads:()=>pads},configurable:true});
function key(type,code,repeat=false){window.dispatchEvent(Object.assign(new Event(type),{code,repeat}));}

test("shoot press and release are single edges, repeats cannot reset the meter", () => {
  const input=new InputManager();input.bind();
  key("keydown","Space");assert.equal(input.poll().shootPressed,true);assert.equal(input.poll().shootPressed,false);
  key("keydown","Space",true);assert.equal(input.poll().shootPressed,false);
  key("keyup","Space");assert.equal(input.poll().shootReleased,true);assert.equal(input.poll().shootReleased,false);
  input.unbind();
});
test("blur releases movement and touch, binding twice doesn't leak listeners", () => {
  const input=new InputManager();input.bind();input.bind();key("keydown","KeyW");input.touch.shoot=true;
  assert.equal(input.poll().my,-1);window.dispatchEvent(new Event("blur"));
  const state=input.poll();assert.equal(state.my,0);assert.equal(state.shoot,false);
  input.unbind();key("keydown","KeyW");assert.equal(input.poll().my,0);
});
test("controller camera fires once per press and recovers from disconnect", () => {
  const input=new InputManager();const pad={axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
  pads=[pad];pad.buttons[11].pressed=true;
  assert.equal(input.poll().viewPressed,true);assert.equal(input.poll().viewPressed,false);
  pads=[];input.poll();pads=[pad];assert.equal(input.poll().viewPressed,true);
  pad.buttons[3].pressed=true;assert.equal(input.poll().run,true);
  pad.axes[0]=.3;assert.ok(input.poll().mx>0 && input.poll().mx<.3);
  pads=[];
});
