/**
 * The house band. Nothing here is a recording: drums, bass, chords and a lead are worked out
 * bar by bar and played on oscillators, so every place in the city can have its own tune and
 * none of it has to load.
 *
 * A tune is a key, a tempo, a feel (a shuffle counts twelve to the bar, straight time sixteen),
 * a round of chords, and who plays: which drum pattern, what the bass does, who comps and who
 * takes the lead. The lead makes up a phrase, leaves room, answers it, and starts a new idea
 * each time round, so a twelve-bar blues never comes out the same twice.
 */

type Feel = "shuffle" | "straight";
type Drums = "shuffle" | "slow" | "funk" | "boombap" | "four" | "drive" | "brush";
type Bass = "walk" | "boogie" | "funk" | "sub" | "eighths" | "two";
type Comp = "organ" | "piano" | "guitar" | "rhodes" | "horns" | "pad" | "none";
type Lead = "guitar" | "harp" | "sax" | "synth" | "slide" | "none";

export type Tune = {
  id: string;
  bpm: number;
  feel: Feel;
  /** Semitones above low E. */
  key: number;
  /** Root of each bar above the key, and whether that bar's chord is minor. */
  round: number[];
  minor: boolean[];
  drums: Drums;
  bass: Bass;
  comp: Comp;
  /** Who takes the lead, one after another, a time round the chords each. */
  leads: Lead[];
  /** How busy the lead is, 0 to 1, and how loud the whole tune sits. */
  busy: number;
  level: number;
};

const BLUES = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
const QUICK = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7];
const no = (n: number) => new Array<boolean>(n).fill(false);
const yes = (n: number) => new Array<boolean>(n).fill(true);

export const TUNES: Record<string, Tune> = {
  // Out in the city by day: an easy shuffle in E.
  "city-day": { id: "city-day", bpm: 92, feel: "shuffle", key: 0, round: BLUES, minor: no(12), drums: "shuffle", bass: "walk", comp: "guitar", leads: ["guitar", "none", "harp", "none"], busy: 0.45, level: 0.9 },
  // After dark: a slow minor blues in A with an electric piano.
  "city-night": { id: "city-night", bpm: 66, feel: "shuffle", key: 5, round: [0, 0, 0, 0, 5, 5, 0, 0, 8, 7, 0, 7], minor: [true, true, true, true, true, true, true, true, false, false, true, false], drums: "slow", bass: "two", comp: "rhodes", leads: ["sax", "none", "guitar", "none"], busy: 0.4, level: 0.85 },
  // Beale Street: the band on the stage, a jump blues in G with horns.
  beale: { id: "beale", bpm: 132, feel: "shuffle", key: 3, round: QUICK, minor: no(12), drums: "shuffle", bass: "boogie", comp: "horns", leads: ["guitar", "sax", "harp", "guitar"], busy: 0.8, level: 1.05 },
  // Inside the Memphian: a slow blues in C, organ under a crying guitar.
  club: { id: "club", bpm: 58, feel: "shuffle", key: 8, round: QUICK, minor: no(12), drums: "slow", bass: "walk", comp: "organ", leads: ["guitar", "guitar", "sax", "harp"], busy: 0.75, level: 1.05 },
  // What the house band at the Memphian will play if it is asked.
  "club-jump": { id: "club-jump", bpm: 146, feel: "shuffle", key: 6, round: QUICK, minor: no(12), drums: "shuffle", bass: "boogie", comp: "horns", leads: ["sax", "guitar", "harp", "sax"], busy: 0.85, level: 1.05 },
  "club-minor": { id: "club-minor", bpm: 74, feel: "shuffle", key: 10, round: [0, 0, 0, 0, 5, 5, 0, 0, 8, 7, 0, 7], minor: [true, true, true, true, true, true, true, true, false, false, true, false], drums: "slow", bass: "two", comp: "rhodes", leads: ["sax", "guitar", "sax", "none"], busy: 0.6, level: 1.05 },
  "club-soul": { id: "club-soul", bpm: 102, feel: "straight", key: 0, round: BLUES, minor: no(12), drums: "funk", bass: "funk", comp: "guitar", leads: ["guitar", "sax", "synth", "guitar"], busy: 0.7, level: 1.05 },
  // The river: a slide guitar taking its time.
  river: { id: "river", bpm: 72, feel: "shuffle", key: 0, round: BLUES, minor: no(12), drums: "brush", bass: "two", comp: "none", leads: ["slide", "slide", "none"], busy: 0.5, level: 0.8 },
  // The Fun House: bright and quick, straight out of a cabinet.
  funhouse: { id: "funhouse", bpm: 138, feel: "straight", key: 8, round: [0, 7, 9, 5], minor: [false, false, true, false], drums: "four", bass: "eighths", comp: "pad", leads: ["synth", "synth", "none"], busy: 0.7, level: 0.75 },
  // The bowling alley: a funk vamp.
  bowl: { id: "bowl", bpm: 104, feel: "straight", key: 5, round: [0, 0, 5, 0], minor: yes(4), drums: "funk", bass: "funk", comp: "guitar", leads: ["sax", "none", "synth", "none"], busy: 0.5, level: 0.85 },
  // The boutique: a head-nod beat with warm chords.
  hq: { id: "hq", bpm: 86, feel: "straight", key: 2, round: [0, 8, 10, 0], minor: [true, false, false, true], drums: "boombap", bass: "sub", comp: "rhodes", leads: ["none", "synth", "none", "sax"], busy: 0.3, level: 0.85 },
  // The court: drums and a bass line to play ball to.
  court: { id: "court", bpm: 96, feel: "straight", key: 7, round: [0, 0, 10, 8], minor: yes(4), drums: "boombap", bass: "sub", comp: "pad", leads: ["none", "synth"], busy: 0.35, level: 0.8 },
  // Behind the wheel, and on the strip.
  radio: { id: "radio", bpm: 112, feel: "straight", key: 0, round: [0, 0, 3, 5], minor: yes(4), drums: "drive", bass: "eighths", comp: "guitar", leads: ["guitar", "none"], busy: 0.5, level: 0.8 },
  race: { id: "race", bpm: 150, feel: "straight", key: 2, round: [0, 0, 8, 10], minor: yes(4), drums: "drive", bass: "eighths", comp: "pad", leads: ["synth", "guitar"], busy: 0.75, level: 0.85 },
  // The title card: the city's shuffle, a little prouder.
  title: { id: "title", bpm: 100, feel: "shuffle", key: 0, round: BLUES, minor: no(12), drums: "shuffle", bass: "boogie", comp: "organ", leads: ["harp", "guitar"], busy: 0.6, level: 0.95 },
};

/** The Memphian's set list, in the order the band goes through it. */
export const SONGS = [
  { id: "club", name: "Memphian Slow Drag" },
  { id: "club-jump", name: "Union Avenue Jump" },
  { id: "club-minor", name: "Midnight on the Bluff" },
  { id: "club-soul", name: "Sack Full of Soul" },
] as const;

const E2 = 82.41;
const hz = (semis: number) => E2 * Math.pow(2, semis / 12);
/** The blues scale, two octaves of it. */
const SCALE = [0, 3, 5, 6, 7, 10, 12, 15, 17, 18, 19, 22, 24];

/** Small repeatable dice, so a phrase can be played again exactly. */
function dice(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class Band {
  private tune: Tune = TUNES["city-day"]!;
  private next: Tune | null = null;
  /** When the next step is due, how many steps into the tune it is, and when the tune started. */
  private due = 0;
  private step = 0;
  private began = 0;
  private lead: BiquadFilterNode;
  private room: GainNode;
  private motif: { at: number; note: number; long: number }[] = [];
  private chorus = 0;

  constructor(
    private ctx: BaseAudioContext,
    private noise: AudioBuffer,
    private out: AudioNode,
  ) {
    // The lead goes through a filter to take the edge off it, and a little of everything comes back as the room.
    this.lead = ctx.createBiquadFilter();
    this.lead.type = "lowpass";
    this.lead.frequency.value = 2400;
    this.lead.Q.value = 0.8;
    this.lead.connect(out);
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.19;
    const back = ctx.createGain();
    back.gain.value = 0.22;
    this.room = ctx.createGain();
    this.room.gain.value = 0.16;
    this.lead.connect(this.room);
    this.room.connect(delay);
    delay.connect(back).connect(delay);
    delay.connect(out);
    this.due = this.began = ctx.currentTime + 0.15;
  }

  /** Steps in a bar and the length of one, for the tune that is playing. */
  private get grid() {
    const per = this.tune.feel === "shuffle" ? 12 : 16;
    return { per, len: (60 / this.tune.bpm) * (4 / per) };
  }

  /** Play this tune from the top of the next bar. */
  play(id: string) {
    const t = TUNES[id];
    if (!t || t === this.tune) {
      this.next = null;
      return;
    }
    this.next = t;
  }

  get playing() {
    return (this.next ?? this.tune).id;
  }

  /** The tune that is sounding, and who has the lead in it this time round. */
  get now() {
    return this.tune.id;
  }

  get soloist(): string {
    return this.tune.leads[this.chorus % this.tune.leads.length] ?? "none";
  }

  get tempo() {
    return this.tune.bpm;
  }

  /** Beats since the tune began, right now: what a dancer or a drummer's arm goes by. */
  beat() {
    return Math.max(0, ((this.ctx.currentTime - this.began) * this.tune.bpm) / 60);
  }

  /** Put down every note that falls before `until`. */
  pump(until: number) {
    // Asleep in a hidden tab the clock runs on: pick the tune up where it is, not in a burst.
    if (this.due < this.ctx.currentTime - 0.5) this.due = this.ctx.currentTime + 0.05;
    let guard = 0;
    while (this.due < until && guard++ < 400) {
      const { per, len } = this.grid;
      if (this.next && this.step % per === 0) {
        this.tune = this.next;
        this.next = null;
        this.step = 0;
        this.began = this.due;
        this.chorus = 0;
        this.motif = [];
      }
      this.bar(this.step, this.due);
      this.due += this.grid.len || len;
      this.step++;
    }
  }

  // ---------------------------------------------------------------- one step of the tune

  private bar(i: number, t: number) {
    const tune = this.tune;
    const { per, len } = this.grid;
    const pos = i % per;
    const bars = Math.floor(i / per);
    const n = tune.round.length;
    const bar = bars % n;
    const root = tune.key + tune.round[bar]!;
    const nextRoot = tune.key + tune.round[(bar + 1) % n]!;
    const minor = tune.minor[bar]!;
    const third = minor ? 3 : 4;
    const beat = per / 4;
    const L = tune.level;
    if (pos === 0 && bar === 0) {
      this.chorus = Math.floor(bars / n);
      this.motif = [];
    }
    this.drum(tune.drums, pos, per, bar, n, t, len, L);
    this.low(tune.bass, pos, beat, root, nextRoot, third, t, len, L, bars);
    this.chords(tune.comp, pos, per, beat, root, third, t, len, L, bar);
    const who = tune.leads[this.chorus % tune.leads.length]!;
    if (who !== "none") this.solo(who, pos, per, bar, n, bars, t, len, L);
  }

  // ---------------------------------------------------------------- drums

  private drum(kind: Drums, pos: number, per: number, bar: number, n: number, t: number, len: number, L: number) {
    const on = (list: number[]) => list.includes(pos);
    const fill = bar === n - 1 && pos >= per - per / 4;
    if (kind === "shuffle") {
      if (on([0, 6])) this.kick(t, 0.5 * L);
      if (on([3, 9])) this.snare(t, 0.3 * L);
      if (pos % 3 !== 1) this.hat(t, (pos % 3 === 0 ? 0.07 : 0.11) * L, 0.045);
      if (fill) this.snare(t, 0.18 * L);
    } else if (kind === "slow") {
      // Twelve to the bar on the ride, the backbeat laid right back.
      if (on([0, 5, 6])) this.kick(t, (pos === 5 ? 0.25 : 0.5) * L);
      if (on([3, 9])) this.snare(t + 0.012, 0.3 * L);
      this.hat(t, (pos % 3 === 0 ? 0.1 : 0.05) * L, 0.07);
      if (fill && pos % 2 === 1) this.tom(t, 0.22 * L, 150 - (pos - 9) * 18);
    } else if (kind === "brush") {
      if (on([0, 6])) this.kick(t, 0.28 * L);
      if (on([3, 9])) this.hiss(t, 0.1 * L, 0.02, 0.16, 2600, 0.6);
      if (pos % 3 !== 1) this.hiss(t, 0.035 * L, 0.01, 0.09, 4200, 0.5);
    } else if (kind === "funk") {
      if (on([0, 6, 10])) this.kick(t, 0.52 * L);
      if (on([4, 12])) this.snare(t, 0.32 * L);
      if (on([7, 9, 15])) this.snare(t, 0.07 * L);
      if (pos % 2 === 0) this.hat(t, 0.09 * L, pos === 14 ? 0.16 : 0.035);
      else this.hat(t, 0.04 * L, 0.03);
    } else if (kind === "boombap") {
      if (on([0, 7, 10])) this.kick(t, 0.6 * L);
      if (on([4, 12])) this.snare(t, 0.36 * L);
      if (pos % 2 === 0) this.hat(t + (pos % 4 === 2 ? len * 0.18 : 0), 0.08 * L, 0.04);
    } else if (kind === "four") {
      if (pos % 4 === 0) this.kick(t, 0.5 * L);
      if (on([4, 12])) this.snare(t, 0.22 * L);
      if (pos % 4 === 2) this.hat(t, 0.1 * L, 0.06);
    } else {
      if (on([0, 8, 10])) this.kick(t, 0.55 * L);
      if (on([4, 12])) this.snare(t, 0.36 * L);
      if (pos % 2 === 0) this.hat(t, 0.09 * L, 0.04);
      if (fill) this.tom(t, 0.2 * L, 190 - (pos - 12) * 22);
    }
  }

  // ---------------------------------------------------------------- bass

  private low(kind: Bass, pos: number, beat: number, root: number, nextRoot: number, third: number, t: number, len: number, L: number, bars: number) {
    const on = pos % beat === 0;
    const b = pos / beat;
    const note = (semis: number, peak: number, long: number) => this.bassNote(hz(semis), t, peak * L, long);
    if (kind === "walk") {
      if (!on) return;
      // Up the chord, and a half step into the next one on four.
      const up = bars % 2 === 0 ? [0, third, 7, 9] : [12, 10, 7, third];
      const lead = nextRoot + (nextRoot > root + up[2]! ? -1 : 1);
      note(b === 3 && nextRoot !== root ? lead : root + up[b]!, 0.55, len * beat * 0.92);
    } else if (kind === "boogie") {
      // Eight to the bar.
      const eighth = beat === 3 ? pos % 3 !== 1 : pos % 2 === 0;
      if (!eighth) return;
      const k = beat === 3 ? Math.floor(pos / 3) * 2 + (pos % 3 === 2 ? 1 : 0) : pos / 2;
      note(root + [0, 0, third, third, 7, 7, 9, 10][k]!, 0.5, len * (beat === 3 ? 1.7 : 1.8));
    } else if (kind === "two") {
      if (pos === 0) note(root, 0.55, len * beat * 1.9);
      else if (pos === beat * 2) note(root + 7, 0.45, len * beat * 1.7);
      else if (pos === beat * 4 - 1 && nextRoot !== root) note(nextRoot - 1, 0.3, len);
    } else if (kind === "funk") {
      const at = [0, 3, 6, 8, 10, 14].indexOf(pos);
      if (at >= 0) note(root + [0, 0, 12, 0, 10, 7][at]!, 0.55, len * (at === 0 ? 2.4 : 1.2));
    } else if (kind === "sub") {
      if (pos === 0) this.sub(hz(root), t, 0.7 * L, len * 7);
      else if (pos === 10) this.sub(hz(root), t, 0.55 * L, len * 5);
      else if (pos === 7) this.sub(hz(root + 12), t, 0.3 * L, len * 2);
    } else if (pos % 2 === 0) note(root + (pos === 14 ? 7 : 0), 0.45, len * 1.7);
  }

  // ---------------------------------------------------------------- chords

  private chords(kind: Comp, pos: number, per: number, beat: number, root: number, third: number, t: number, len: number, L: number, bar: number) {
    if (kind === "none") return;
    // Third, seventh and ninth, up where they are out of the bass's way.
    const voicing = [root + 12 + third, root + 22, root + 26];
    if (kind === "organ") {
      if (pos === 0) for (const v of voicing) this.organ(hz(v), t, 0.075 * L, len * per * 0.98);
      if (pos === beat * 2 + (beat === 3 ? 2 : 2)) for (const v of voicing) this.organ(hz(v + 12), t, 0.04 * L, len * 1.5);
    } else if (kind === "piano") {
      if (pos % beat === 0) for (const v of voicing) this.keys(hz(v), t, 0.12 * L, len * 2.4);
    } else if (kind === "guitar") {
      // The chop on two and four.
      if (pos === beat || pos === beat * 3) for (const v of voicing) this.pluck(hz(v), t, 0.085 * L, 0.11, this.out);
      if (beat === 4 && pos === beat * 3 + 2) for (const v of voicing) this.pluck(hz(v), t, 0.05 * L, 0.07, this.out);
    } else if (kind === "rhodes") {
      if (pos === 0 || pos === Math.round(per * 0.62)) for (const v of voicing) this.keys(hz(v), t, (pos === 0 ? 0.13 : 0.08) * L, len * per * 0.55);
    } else if (kind === "horns") {
      // A riff the whole section hits together, in the first half of every other bar.
      const riff = beat === 3 ? [0, 2, 6, 8] : [0, 3, 8, 11];
      if (bar % 2 === 0 && riff.includes(pos)) for (const v of voicing) this.horn(hz(v), t, 0.085 * L, len * (pos === riff[1] || pos === riff[3] ? 2.6 : 1.1));
      if (bar % 4 === 3 && pos === beat * 3) for (const v of voicing) this.horn(hz(v + 1), t, 0.07 * L, len * beat * 0.9, hz(v));
    } else if (pos === 0) for (const v of voicing) this.organ(hz(v), t, 0.05 * L, len * per);
  }

  // ---------------------------------------------------------------- the lead

  /** A phrase is two bars: said in bars 0 and 1 of each four, answered a little differently, with room left after each. */
  private solo(who: Lead, pos: number, per: number, bar: number, n: number, bars: number, t: number, len: number, L: number) {
    const four = bar % 4;
    if (four >= 2 && !(n === 12 && bar >= 8 && bar < 10)) return;
    const local = (four % 2) * per + pos;
    if (local === 0) {
      // A new idea each chorus, the same one again four bars on with a different ending, and higher at the turn.
      const phrase = Math.floor(bar / 4);
      const roll = dice(this.chorus * 97 + (phrase === 2 ? 53 : 11) + this.tune.id.length * 7);
      const tail = dice(bars * 131 + 7);
      const lift = phrase === 2 ? 3 : 0;
      this.motif = [];
      let at = roll() < 0.5 ? 0 : per / 4;
      let deg = 4 + Math.floor(roll() * 3) + lift;
      const span = per * 2 - per / 4;
      while (at < span) {
        const late = at > per * 1.2;
        const r = late ? tail : roll;
        const jump = [-2, -1, -1, 1, 1, 2][Math.floor(r() * 6)]!;
        deg = Math.max(1, Math.min(SCALE.length - 2, deg + jump));
        const gaps = this.tune.feel === "shuffle" ? [1, 2, 3, 3, 6] : [1, 2, 2, 4, 6];
        const gap = gaps[Math.floor(r() * gaps.length)]!;
        if (r() < this.tune.busy + 0.25) this.motif.push({ at, note: SCALE[deg]!, long: gap });
        at += gap;
      }
      // Come to rest on the key note or its fifth.
      const last = this.motif[this.motif.length - 1];
      if (last) {
        last.note = roll() < 0.6 ? 12 : 7;
        last.long = Math.max(last.long, per / 2);
      }
    }
    for (const m of this.motif) {
      if (m.at !== local) continue;
      const f = hz(this.tune.key + 12 + m.note + (who === "sax" ? 0 : who === "synth" ? 12 : 12));
      const long = m.long * len;
      if (who === "guitar") this.guitar(f, t, 0.2 * L, long, m.long >= 3);
      else if (who === "slide") this.guitar(f, t, 0.18 * L, long * 1.3, true, 0.84);
      else if (who === "harp") this.harp(f, t, 0.13 * L, long);
      else if (who === "sax") this.sax(f, t, 0.15 * L, long);
      else this.synth(f, t, 0.1 * L, long);
    }
  }

  // ---------------------------------------------------------------- the instruments

  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  private osc(type: OscillatorType, f: number, t: number, stop: number, dest: AudioNode, from = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    if (from) {
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    } else o.frequency.setValueAtTime(f, t);
    o.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  /** A slow wobble on a note's pitch. */
  private wobble(o: OscillatorNode, t: number, stop: number, rate: number, depth: number) {
    const lfo = this.ctx.createOscillator();
    const amt = this.ctx.createGain();
    lfo.frequency.value = rate;
    amt.gain.setValueAtTime(0, t);
    amt.gain.linearRampToValueAtTime(depth, t + 0.18);
    lfo.connect(amt).connect(o.frequency);
    lfo.start(t);
    lfo.stop(stop);
  }

  private hiss(t: number, peak: number, attack: number, decay: number, freq: number, q: number, type: BiquadFilterType = "bandpass") {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, peak, attack, 0, decay);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random());
    src.stop(t + attack + decay + 0.05);
  }

  private kick(t: number, peak: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.003, 0, 0.2);
    g.connect(this.out);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.26);
  }

  private snare(t: number, peak: number) {
    this.hiss(t, peak, 0.002, 0.13, 2100, 0.8);
    const g = this.ctx.createGain();
    this.env(g, t, peak * 0.5, 0.002, 0, 0.08);
    g.connect(this.out);
    this.osc("triangle", 196, t, t + 0.12, g);
  }

  private hat(t: number, peak: number, decay: number) {
    this.hiss(t, peak, 0.002, decay, 7600, 1.1, "highpass");
  }

  private tom(t: number, peak: number, f: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.003, 0, 0.18);
    g.connect(this.out);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.16);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.24);
  }

  private bassNote(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.008, long * 0.35, long * 0.65);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 520;
    lp.connect(g).connect(this.out);
    const stop = t + long + 0.08;
    this.osc("triangle", f, t, stop, lp);
    this.osc("sine", f * 0.5, t, stop, g);
  }

  private sub(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.01, long * 0.3, long * 0.7);
    g.connect(this.out);
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.06);
    o.connect(g);
    o.start(t);
    o.stop(t + long + 0.1);
  }

  /** Three drawbars and a slow wobble. */
  private organ(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.03, long * 0.75, long * 0.25);
    g.connect(this.out);
    g.connect(this.room);
    const stop = t + long + 0.1;
    const a = this.osc("sine", f, t, stop, g);
    this.wobble(a, t, stop, 6.2, f * 0.006);
    const half = this.ctx.createGain();
    half.gain.value = 0.45;
    half.connect(g);
    this.osc("sine", f * 2, t, stop, half);
    this.osc("sine", f * 3, t, stop, half);
  }

  /** A struck key: a bell on top that dies fast, a body that rings on. */
  private keys(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.004, 0, long);
    g.connect(this.out);
    g.connect(this.room);
    const stop = t + long + 0.05;
    this.osc("sine", f, t, stop, g);
    const bell = this.ctx.createGain();
    this.env(bell, t, 0.5, 0.002, 0, Math.min(0.25, long * 0.4));
    bell.connect(g);
    this.osc("sine", f * 4, t, stop, bell);
  }

  private pluck(f: number, t: number, peak: number, long: number, dest: AudioNode) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.003, 0, long);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + long);
    lp.connect(g).connect(dest);
    this.osc("sawtooth", f, t, t + long + 0.05, lp);
  }

  private horn(f: number, t: number, peak: number, long: number, from = 0) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.03, long * 0.6, long * 0.4);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
    bp.connect(g).connect(this.out);
    g.connect(this.room);
    const stop = t + long + 0.08;
    this.osc("sawtooth", f, t, stop, bp, from);
    this.osc("square", f * 1.003, t, stop, bp, from);
  }

  /** The lead guitar: it bends up into the long ones and shakes them. */
  private guitar(f: number, t: number, peak: number, long: number, held: boolean, bend = 0.944) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.006, long * 0.45, long * 0.55 + 0.05);
    g.connect(this.lead);
    const stop = t + long + 0.16;
    const a = this.osc("sawtooth", f, t, stop, g, held ? f * bend : 0);
    const mix = this.ctx.createGain();
    mix.gain.value = 0.5;
    mix.connect(g);
    const b = this.osc("square", f, t, stop, mix, held ? f * bend : 0);
    if (held) {
      this.wobble(a, t + 0.1, stop, 5.6, f * 0.012);
      this.wobble(b, t + 0.1, stop, 5.6, f * 0.012);
    }
  }

  private harp(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.02, long * 0.5, long * 0.5 + 0.04);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = Math.min(3200, f * 2.2);
    bp.Q.value = 2.2;
    bp.connect(g).connect(this.lead);
    const stop = t + long + 0.12;
    const o = this.osc("square", f, t, stop, bp, f * 0.97);
    this.wobble(o, t, stop, 6.5, f * 0.01);
  }

  private sax(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.035, long * 0.55, long * 0.45 + 0.05);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(2300, t + 0.07);
    lp.Q.value = 2;
    lp.connect(g).connect(this.lead);
    const stop = t + long + 0.14;
    const o = this.osc("sawtooth", f, t, stop, lp, f * 0.965);
    this.wobble(o, t + 0.12, stop, 5.2, f * 0.009);
    this.hiss(t, peak * 0.12, 0.02, Math.min(0.3, long), f * 3, 1.2);
  }

  private synth(f: number, t: number, peak: number, long: number) {
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.004, long * 0.4, long * 0.4 + 0.03);
    g.connect(this.lead);
    const stop = t + long + 0.08;
    this.osc("square", f, t, stop, g);
    const up = this.ctx.createGain();
    up.gain.value = 0.25;
    up.connect(g);
    this.osc("square", f * 2.005, t, stop, up);
  }
}
