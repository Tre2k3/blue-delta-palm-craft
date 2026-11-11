/**
 * All sound is synthesised: no audio files to ship or fail to load.
 * A slow blues shuffle under the city, an engine that follows the car, and one-shots for play.
 */
type Ctx = AudioContext;

const E2 = 82.41;
const semi = (n: number) => E2 * Math.pow(2, n / 12);

export class Sound {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private engine: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private ambience: GainNode | null = null;
  private nextBeat = 0;
  private beat = 0;
  private timer: number | null = null;
  musicOn = true;
  sfxOn = true;
  private volume = 0.8;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem("sack-v2-audio") || "null") as { music?: boolean; sfx?: boolean; volume?: number } | null;
      if (saved) {
        this.musicOn = saved.music !== false;
        this.sfxOn = saved.sfx !== false;
        if (typeof saved.volume === "number") this.volume = saved.volume;
      }
    } catch {
      /* defaults */
    }
  }

  /** Browsers only start audio from a gesture. Call from the first click or key. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      const comp = ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(ctx.destination);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this.musicOn ? 0.22 : 0;
      this.musicGain.connect(this.master);
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 0.9 : 0;
      this.sfxGain.connect(this.master);
      const len = ctx.sampleRate * 1.5;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.startAmbience();
      this.nextBeat = ctx.currentTime + 0.2;
      this.timer = window.setInterval(() => this.schedule(), 90);
    } catch {
      this.ctx = null;
    }
  }

  private save() {
    try {
      localStorage.setItem("sack-v2-audio", JSON.stringify({ music: this.musicOn, sfx: this.sfxOn, volume: this.volume }));
    } catch {
      /* private mode */
    }
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.22 * this.bedLevel : 0, this.ctx.currentTime, 0.2);
    this.save();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
    this.save();
  }

  private bedLevel = 1;

  /** How much of the city's own music plays, 0..1. Another track nearby turns it down. */
  bed(k: number) {
    const next = Math.max(0, Math.min(1, k));
    if (Math.abs(next - this.bedLevel) < 0.01) return;
    this.bedLevel = next;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.22 * next : 0, this.ctx.currentTime, 0.12);
  }

  private ducked = false;
  private hushed = false;

  /** Duck everything when the tab is paused or a menu is up. */
  duck(on: boolean) {
    this.ducked = on;
    this.level();
  }

  /** Silence while another game on the page has the speakers. */
  hush(on: boolean) {
    this.hushed = on;
    this.level();
  }

  private level() {
    const v = this.hushed ? 0 : this.ducked ? this.volume * 0.35 : this.volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.15);
  }

  private env(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(freq: number, type: OscillatorType, t: number, peak: number, attack: number, decay: number, dest: AudioNode, slide = 0) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + attack + decay);
    this.env(g, t, peak, attack, decay);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  private hiss(t: number, peak: number, attack: number, decay: number, freq: number, q: number, dest: AudioNode, type: BiquadFilterType = "bandpass", slide = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + attack + decay);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, peak, attack, decay);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random());
    src.stop(t + attack + decay + 0.05);
  }

  /** Twelve-bar shuffle in E: walking bass, a soft chord stab, brushed hats. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const step = 60 / 92 / 3;
    while (this.nextBeat < ctx.currentTime + 0.3) {
      const t = this.nextBeat;
      const i = this.beat;
      const bar = Math.floor(i / 12) % 12;
      const pos = i % 12;
      const root = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7][bar]!;
      const out = this.musicGain;
      if (pos % 3 === 0) {
        const walk = [0, 4, 7, 9][pos / 3]!;
        this.tone(semi(root + walk), "triangle", t, 0.5, 0.01, 0.34, out);
        this.tone(semi(root + walk) * 0.5, "sine", t, 0.35, 0.01, 0.3, out);
      }
      if (pos % 3 !== 1) this.hiss(t, pos % 3 === 0 ? 0.05 : 0.09, 0.004, 0.05, 7200, 1.2, out, "highpass");
      if (pos === 3 || pos === 9) {
        this.hiss(t, 0.16, 0.003, 0.11, 1900, 0.9, out);
        this.tone(190, "triangle", t, 0.12, 0.003, 0.08, out, 0.6);
      }
      if (pos === 0 || pos === 8) {
        for (const n of [root + 12, root + 16, root + 22]) this.tone(semi(n), "sine", t, 0.085, 0.012, 0.42, out);
      }
      if ((bar === 3 || bar === 11) && pos >= 6 && pos % 2 === 0) this.tone(semi(root + 24 + [3, 5, 7][(pos - 6) / 2]!), "square", t, 0.03, 0.01, 0.16, out);
      this.nextBeat += step;
      this.beat += 1;
    }
  }

  private startAmbience() {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.ambience = g;
  }

  /** Engine drone for whatever Benji is driving. `rev` 0..1, `on` false cuts it. */
  setEngine(on: boolean, rev = 0, boost = false) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    if (!on) {
      if (this.engine) {
        const e = this.engine;
        e.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        e.osc.stop(ctx.currentTime + 0.4);
        e.osc2.stop(ctx.currentTime + 0.4);
        this.engine = null;
      }
      return;
    }
    if (!this.engine) {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc.type = "sawtooth";
      osc2.type = "square";
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(this.sfxGain);
      osc.start();
      osc2.start();
      this.engine = { osc, osc2, gain, filter };
    }
    const f = 46 + rev * 120 + (boost ? 26 : 0);
    const t = ctx.currentTime;
    this.engine.osc.frequency.setTargetAtTime(f, t, 0.06);
    this.engine.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.06);
    this.engine.filter.frequency.setTargetAtTime(260 + rev * 1500, t, 0.08);
    this.engine.gain.gain.setTargetAtTime(0.05 + rev * 0.07, t, 0.08);
  }

  private one(fn: (t: number, out: AudioNode) => void) {
    if (!this.ctx || !this.sfxGain || !this.sfxOn) return;
    fn(this.ctx.currentTime + 0.005, this.sfxGain);
  }

  ui() {
    this.one((t, o) => this.tone(880, "sine", t, 0.12, 0.004, 0.07, o));
  }
  step() {
    this.one((t, o) => this.hiss(t, 0.035, 0.002, 0.04, 900, 1.5, o));
  }
  cash() {
    this.one((t, o) => {
      this.tone(1318, "triangle", t, 0.2, 0.004, 0.12, o);
      this.tone(1760, "triangle", t + 0.08, 0.22, 0.004, 0.22, o);
    });
  }
  bad() {
    this.one((t, o) => this.tone(196, "sawtooth", t, 0.14, 0.01, 0.22, o, 0.6));
  }
  door() {
    this.one((t, o) => {
      this.tone(140, "sine", t, 0.3, 0.005, 0.14, o, 0.6);
      this.hiss(t, 0.08, 0.004, 0.1, 500, 1, o);
    });
  }
  bounce(power = 1) {
    this.one((t, o) => {
      this.tone(118, "sine", t, 0.42 * power, 0.003, 0.11, o, 0.55);
      this.hiss(t, 0.06 * power, 0.002, 0.03, 1400, 1, o);
    });
  }
  rim() {
    this.one((t, o) => {
      this.tone(740, "square", t, 0.07, 0.002, 0.16, o);
      this.tone(1110, "triangle", t, 0.09, 0.002, 0.22, o);
    });
  }
  board() {
    this.one((t, o) => this.tone(210, "triangle", t, 0.3, 0.002, 0.1, o, 0.7));
  }
  swish() {
    this.one((t, o) => this.hiss(t, 0.3, 0.02, 0.26, 4200, 0.8, o, "bandpass", 0.4));
  }
  release() {
    this.one((t, o) => this.hiss(t, 0.1, 0.01, 0.09, 2400, 1, o, "bandpass", 1.8));
  }
  cheer() {
    this.one((t, o) => {
      this.hiss(t, 0.2, 0.2, 1.1, 1500, 0.6, o);
      this.hiss(t + 0.1, 0.12, 0.3, 0.9, 2600, 0.7, o);
    });
  }
  whoosh() {
    this.one((t, o) => this.hiss(t, 0.2, 0.08, 0.3, 600, 1.2, o, "bandpass", 5));
  }
  splash(power = 1) {
    this.one((t, o) => {
      this.hiss(t, 0.3 * power, 0.01, 0.34, 2600, 0.7, o, "bandpass", 0.3);
      this.tone(160, "sine", t, 0.18 * power, 0.004, 0.16, o, 0.5);
    });
  }
  reel() {
    this.one((t, o) => this.tone(1200 + Math.random() * 200, "square", t, 0.018, 0.001, 0.025, o));
  }
  bite() {
    this.one((t, o) => {
      this.tone(660, "triangle", t, 0.2, 0.004, 0.09, o);
      this.tone(990, "triangle", t + 0.09, 0.22, 0.004, 0.14, o);
    });
  }
  roll() {
    this.one((t, o) => this.hiss(t, 0.16, 0.2, 1.6, 180, 0.8, o, "lowpass"));
  }
  pins(count: number) {
    this.one((t, o) => {
      const n = Math.max(1, Math.min(10, count));
      for (let i = 0; i < n + 2; i++) {
        const at = t + Math.random() * 0.28;
        this.tone(520 + Math.random() * 520, "triangle", at, 0.12, 0.002, 0.07 + Math.random() * 0.08, o, 0.8);
        this.hiss(at, 0.1, 0.002, 0.06, 2200, 1.2, o);
      }
    });
  }
  countdown(go = false) {
    this.one((t, o) => this.tone(go ? 880 : 440, "square", t, 0.14, 0.005, go ? 0.5 : 0.16, o));
  }
  skid(power = 1) {
    this.one((t, o) => this.hiss(t, 0.1 * power, 0.02, 0.2, 1800, 4, o));
  }
  crash(power = 1) {
    this.one((t, o) => {
      this.hiss(t, 0.4 * power, 0.003, 0.24, 800, 0.6, o, "lowpass");
      this.tone(70, "sine", t, 0.4 * power, 0.003, 0.2, o, 0.5);
    });
  }
  horn() {
    this.one((t, o) => {
      this.tone(392, "square", t, 0.09, 0.01, 0.3, o);
      this.tone(494, "square", t, 0.09, 0.01, 0.3, o);
    });
  }
  nitro() {
    this.one((t, o) => this.hiss(t, 0.3, 0.05, 0.7, 500, 0.8, o, "bandpass", 6));
  }
  spook() {
    this.one((t, o) => {
      this.tone(98, "sawtooth", t, 0.16, 0.3, 1.1, o, 0.7);
      this.tone(104, "sawtooth", t, 0.14, 0.3, 1.1, o, 0.7);
    });
  }

  dispose() {
    if (this.timer != null) window.clearInterval(this.timer);
    this.setEngine(false);
    void this.ctx?.close();
    this.ctx = null;
    void this.ambience;
  }
}
