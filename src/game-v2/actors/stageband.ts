import * as THREE from "three";
import { BAND } from "../assets/cast";
import { damp } from "../core/util";
import { Card } from "./card";

/**
 * Where each of the six stands, as shares of the stage: across it as the crowd sees it (-1 the
 * left wing, 1 the right) and from the back wall (-1) to the lip (1). The organ is drawn from
 * the side, facing left, so it goes on the right and looks in at the rest of them.
 */
const SPOTS: Record<string, [number, number]> = {
  singer: [-0.06, 0.62],
  guitar: [-0.46, 0.3],
  sax: [0.42, 0.34],
  bass: [-0.8, -0.3],
  keys: [0.8, -0.12],
  drums: [0.16, -0.5],
};

/** Whose drawing moves when this voice has the tune. */
const TAKES: Record<string, string> = { guitar: "guitar", slide: "guitar", sax: "sax", synth: "keys", harp: "singer", none: "singer" };

type Player = { id: string; card: Card; x: number; z: number; out: number };

const WHITE = new THREE.Color(1, 1, 1);
const _lit = new THREE.Color();

/**
 * The house band on a stage. Each player has two drawings and goes from one to the other in
 * time with the tune: the drummer and the bass on every beat, the others in longer phrases.
 * Whoever has the lead steps up to the lip of the stage and works twice as hard.
 */
export class StageBand {
  private players: Player[] = [];
  private fx: number;
  private fz: number;

  /**
   * `x`, `z` the middle of the stage, `heading` the way it faces, `top` the height of its
   * boards, `w` and `d` how wide and deep it is.
   */
  constructor(
    parent: THREE.Group,
    x: number,
    z: number,
    readonly heading: number,
    private top: number,
    w: number,
    d: number,
    /** Out of doors, seen across a square, they are drawn a little larger than life. */
    scale = 1,
  ) {
    this.fx = Math.sin(heading);
    this.fz = Math.cos(heading);
    // The crowd's right as they look at the stage.
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    for (const b of BAND) {
      const [across, depth] = SPOTS[b.id] ?? [0, 0];
      const card = new Card({ front: b.frames[0], poses: { b: b.frames[1] }, scale: { [b.frames[1]]: b.heights[1] / b.heights[0] } }, b.heights[0] * scale);
      card.heading = heading;
      parent.add(card.group);
      this.players.push({ id: b.id, card, x: x + rx * across * (w / 2) + this.fx * depth * (d / 2), z: z + rz * across * (w / 2) + this.fz * depth * (d / 2), out: 0 });
    }
  }

  /** Who is at the front right now, for a caption or a test. */
  lead(soloist: string) {
    return TAKES[soloist] ?? "singer";
  }

  /** `beat` is beats into the tune; `soloist` whichever voice has the lead in it. */
  update(dt: number, camera: THREE.Vector3, tint: THREE.Color, beat: number, soloist: string, visible = true) {
    const front = this.lead(soloist);
    // Under the stage lights they never go as dark as the street does.
    _lit.copy(tint).lerp(WHITE, 0.5);
    const whole = Math.floor(beat);
    const twos = Math.floor(beat / 2);
    for (const p of this.players) {
      const c = p.card;
      c.visible = visible;
      if (!visible) {
        c.group.visible = false;
        continue;
      }
      const mine = p.id === front;
      let second: boolean;
      if (p.id === "drums") second = whole % 2 === 1;
      else if (p.id === "bass") second = twos % 2 === 1;
      else if (p.id === "keys") second = mine ? whole % 2 === 1 : Math.floor((beat + 1) / 2) % 4 === 3;
      // Leaning into it for most of a solo, standing back up to breathe.
      else if (p.id === "guitar") second = mine ? twos % 4 !== 3 : Math.floor(beat / 4) % 4 === 3;
      else if (p.id === "sax") second = mine ? whole % 2 === 1 : Math.floor(beat / 4) % 2 === 1;
      // The singer: arm up while the song is hers, in close on the microphone while somebody else takes it.
      else second = mine ? twos % 2 === 1 : Math.floor(beat / 4) % 4 !== 3;
      c.pose = second ? "b" : null;
      c.groove = beat / 1.58 + (p.id === "drums" ? 0.25 : 0);
      const step = mine && p.id !== "drums" && p.id !== "keys" && p.id !== "singer" ? 0.7 : 0;
      p.out += (step - p.out) * damp(2.4, dt);
      c.place(p.x + this.fx * p.out, p.z + this.fz * p.out);
      c.update(dt, camera, _lit, this.top);
    }
  }
}
