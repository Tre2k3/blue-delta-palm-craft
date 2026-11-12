/**
 * Sound. Everything can be synthesised, so the game is never silent and nothing can fail to
 * load: a slow blues shuffle under the city, an engine that follows the car, one-shots for play.
 *
 * Recordings take over wherever one has been supplied. `public/game-v2/audio/manifest.json`
 * lists what there is (voices, effects, music tracks, each an mp3 named by its id); anything
 * not listed is made up as before.
 */
type Ctx = AudioContext;
type Kind = "voice" | "sfx" | "music";
const BANK = "/game-v2/audio";

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
  private rain: { hiss: GainNode; body: GainNode } | null = null;
  private nextBeat = 0;
  private beat = 0;
  private timer: number | null = null;
  musicOn = true;
  sfxOn = true;
  private volume = 0.8;
  /** What there are recordings of. */
  private bank: Record<Kind, Set<string>> = { voice: new Set(), sfx: new Set(), music: new Set() };
  /** Decoded clips by "kind/id"; null while one is on its way or could not be had. */
  private clips = new Map<string, AudioBuffer | null>();
  private asked = false;
  private voiceGain: GainNode | null = null;
  private speaking: AudioBufferSourceNode | null = null;
  /** The recorded track that is playing, the ones fading out under it, and what was last asked for. */
  private track: { id: string; el: HTMLAudioElement } | null = null;
  private fading: HTMLAudioElement[] = [];
  private wanted: string[] = [];

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
      this.voiceGain = ctx.createGain();
      this.voiceGain.gain.value = this.sfxOn ? 1 : 0;
      this.voiceGain.connect(this.master);
      void this.loadBank();
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
    this.setBed(0.2);
    this.save();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
    if (this.voiceGain && this.ctx) this.voiceGain.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
    this.save();
  }

  /** The made-up shuffle plays only while no recorded track does. */
  private setBed(ease: number) {
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(this.musicOn && !this.track ? 0.22 * this.bedLevel : 0, this.ctx.currentTime, ease);
  }

  // ---------------------------------------------------------------- recordings

  private async loadBank() {
    if (this.asked) return;
    this.asked = true;
    try {
      const r = await fetch(`${BANK}/manifest.json`, { cache: "no-cache" });
      if (!r.ok) return;
      const m = (await r.json()) as Partial<Record<Kind, string[]>>;
      for (const k of ["voice", "sfx", "music"] as const) for (const id of m[k] ?? []) this.bank[k].add(id);
      // Effects and the announcer are short and wanted on the instant: have them ready.
      for (const id of this.bank.sfx) void this.clip("sfx", id);
      for (const id of this.bank.voice) if (id.startsWith("call-")) void this.clip("voice", id);
      if (this.wanted.length) this.setTrack(this.wanted);
    } catch {
      // No recordings: everything is made up, as it always could be.
    }
  }

  private async clip(kind: "voice" | "sfx", id: string) {
    const key = `${kind}/${id}`;
    const have = this.clips.get(key);
    if (have !== undefined) return have;
    this.clips.set(key, null);
    try {
      const r = await fetch(`${BANK}/${key}.mp3`);
      if (!r.ok || !this.ctx) return null;
      const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
      this.clips.set(key, buf);
      return buf;
    } catch {
      return null;
    }
  }

  /** Plays a recorded effect if one is ready. False means: make the sound up. */
  private sample(id: string, gain = 1) {
    if (!this.ctx || !this.sfxGain || !this.bank.sfx.has(id)) return false;
    const buf = this.clips.get(`sfx/${id}`);
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1.5, gain));
    src.connect(g).connect(this.sfxGain);
    src.start();
    return true;
  }

  /**
   * A recorded line, by id. A character's line cuts off whoever was speaking; an announcer's
   * call (`call-…`) plays over the top. Returns whether there is a recording of it.
   */
  voice(id: string) {
    if (!this.ctx || !this.voiceGain || !this.bank.voice.has(id)) return false;
    const call = id.startsWith("call-");
    void this.clip("voice", id).then((buf) => {
      if (!buf || !this.ctx || !this.voiceGain) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.voiceGain);
      if (!call) {
        try {
          this.speaking?.stop();
        } catch {
          // Already finished.
        }
        this.speaking = src;
        src.onended = () => {
          if (this.speaking === src) this.speaking = null;
        };
      }
      src.start();
    });
    return true;
  }

  /** What there are recordings of, for tools and tests. */
  get recorded() {
    return { voice: [...this.bank.voice], sfx: [...this.bank.sfx], music: [...this.bank.music], playing: this.track?.id ?? null };
  }

  /**
   * The music for where Benji is: the first of these tracks there is a recording of plays on
   * a loop, and the made-up shuffle stands down. With none of them recorded the shuffle plays.
   */
  setTrack(wanted: string[]) {
    this.wanted = wanted;
    const id = wanted.find((w) => this.bank.music.has(w)) ?? null;
    if (id === (this.track?.id ?? null)) return;
    if (this.track) this.fading.push(this.track.el);
    this.track = null;
    if (id && typeof Audio !== "undefined") {
      const el = new Audio(`${BANK}/music/${id}.mp3`);
      el.loop = true;
      el.volume = 0;
      void el.play().catch(() => undefined);
      this.track = { id, el };
    }
    this.setBed(0.4);
  }

  /** Recorded tracks ease to their level, and the ones on the way out ease to nothing. */
  private easeTracks() {
    if (this.track) {
      const want = (this.musicOn ? 0.5 : 0) * this.bedLevel * (this.hushed ? 0 : this.ducked ? 0.35 : 1) * this.volume;
      const el = this.track.el;
      el.volume = Math.max(0, Math.min(1, el.volume + (want - el.volume) * 0.2));
    }
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const el = this.fading[i]!;
      el.volume = Math.max(0, el.volume * 0.78 - 0.004);
      if (el.volume <= 0.005) {
        el.pause();
        el.src = "";
        this.fading.splice(i, 1);
      }
    }
  }

  private bedLevel = 1;

  /** How much of the city's own music plays, 0..1. Another track nearby turns it down. */
  bed(k: number) {
    const next = Math.max(0, Math.min(1, k));
    if (Math.abs(next - this.bedLevel) < 0.01) return;
    this.bedLevel = next;
    this.setBed(0.12);
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
    this.easeTracks();
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

  /** Rain coming down: 0 dry, 1 pouring. Indoors it is a murmur on the roof. */
  setRain(k: number, inside = false) {
    const ctx = this.ctx;
    if (!ctx || !this.noise || !this.master) return;
    if (!this.rain) {
      if (k < 0.01) return;
      const make = (type: BiquadFilterType, freq: number, q: number) => {
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(f).connect(g).connect(this.master!);
        src.start();
        return g;
      };
      this.rain = { hiss: make("highpass", 3800, 0.4), body: make("bandpass", 900, 0.5) };
    }
    const level = this.sfxOn ? Math.max(0, Math.min(1, k)) : 0;
    this.rain.hiss.gain.setTargetAtTime(level * (inside ? 0.008 : 0.05), ctx.currentTime, 0.5);
    this.rain.body.gain.setTargetAtTime(level * (inside ? 0.03 : 0.045), ctx.currentTime, 0.5);
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

  /** One effect, by name: the recording if there is one, made up if not. */
  private one(name: string, fn: (t: number, out: AudioNode) => void, gain = 1) {
    if (!this.ctx || !this.sfxGain || !this.sfxOn) return;
    if (this.sample(name, gain)) return;
    fn(this.ctx.currentTime + 0.005, this.sfxGain);
  }

  ui() {
    this.one("ui", (t, o) => this.tone(880, "sine", t, 0.12, 0.004, 0.07, o));
  }
  step() {
    this.one("step", (t, o) => this.hiss(t, 0.035, 0.002, 0.04, 900, 1.5, o));
  }
  cash() {
    this.one("cash", (t, o) => {
      this.tone(1318, "triangle", t, 0.2, 0.004, 0.12, o);
      this.tone(1760, "triangle", t + 0.08, 0.22, 0.004, 0.22, o);
    });
  }
  bad() {
    this.one("bad", (t, o) => this.tone(196, "sawtooth", t, 0.14, 0.01, 0.22, o, 0.6));
  }
  door() {
    this.one("door", (t, o) => {
      this.tone(140, "sine", t, 0.3, 0.005, 0.14, o, 0.6);
      this.hiss(t, 0.08, 0.004, 0.1, 500, 1, o);
    });
  }
  bounce(power = 1) {
    this.one("bounce", (t, o) => {
      this.tone(118, "sine", t, 0.42 * power, 0.003, 0.11, o, 0.55);
      this.hiss(t, 0.06 * power, 0.002, 0.03, 1400, 1, o);
    }, power);
  }
  rim() {
    this.one("rim", (t, o) => {
      this.tone(740, "square", t, 0.07, 0.002, 0.16, o);
      this.tone(1110, "triangle", t, 0.09, 0.002, 0.22, o);
    });
  }
  board() {
    this.one("board", (t, o) => this.tone(210, "triangle", t, 0.3, 0.002, 0.1, o, 0.7));
  }
  swish() {
    this.one("swish", (t, o) => this.hiss(t, 0.3, 0.02, 0.26, 4200, 0.8, o, "bandpass", 0.4));
  }
  release() {
    this.one("release", (t, o) => this.hiss(t, 0.1, 0.01, 0.09, 2400, 1, o, "bandpass", 1.8));
  }
  cheer() {
    this.one("cheer", (t, o) => {
      this.hiss(t, 0.2, 0.2, 1.1, 1500, 0.6, o);
      this.hiss(t + 0.1, 0.12, 0.3, 0.9, 2600, 0.7, o);
    });
  }
  /** A camera: the curtain there and back. */
  shutter() {
    this.one("shutter", (t, o) => {
      this.hiss(t, 0.22, 0.001, 0.03, 5200, 0.9, o, "highpass");
      this.hiss(t + 0.07, 0.16, 0.001, 0.04, 3800, 0.9, o, "highpass");
    });
  }
  /** A shell going off over the river. */
  boom() {
    this.one("boom", (t, o) => {
      this.hiss(t, 0.5, 0.004, 0.5, 150, 0.7, o, "lowpass");
      this.hiss(t + 0.04, 0.14, 0.01, 0.9, 3200, 0.5, o, "bandpass", 0.5);
      this.tone(74, "sine", t, 0.4, 0.005, 0.36, o, 0.5);
    });
  }
  /** Four rising notes for a win. */
  fanfare() {
    this.one("fanfare", (t, o) => {
      [0, 4, 7, 12].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), "triangle", t + i * 0.09, 0.15, 0.006, i === 3 ? 0.5 : 0.16, o));
    });
  }
  whoosh() {
    this.one("whoosh", (t, o) => this.hiss(t, 0.2, 0.08, 0.3, 600, 1.2, o, "bandpass", 5));
  }
  splash(power = 1) {
    this.one("splash", (t, o) => {
      this.hiss(t, 0.3 * power, 0.01, 0.34, 2600, 0.7, o, "bandpass", 0.3);
      this.tone(160, "sine", t, 0.18 * power, 0.004, 0.16, o, 0.5);
    }, power);
  }
  reel() {
    this.one("reel", (t, o) => this.tone(1200 + Math.random() * 200, "square", t, 0.018, 0.001, 0.025, o));
  }
  bite() {
    this.one("bite", (t, o) => {
      this.tone(660, "triangle", t, 0.2, 0.004, 0.09, o);
      this.tone(990, "triangle", t + 0.09, 0.22, 0.004, 0.14, o);
    });
  }
  roll() {
    this.one("roll", (t, o) => this.hiss(t, 0.16, 0.2, 1.6, 180, 0.8, o, "lowpass"));
  }
  pins(count: number) {
    this.one("pins", (t, o) => {
      const n = Math.max(1, Math.min(10, count));
      for (let i = 0; i < n + 2; i++) {
        const at = t + Math.random() * 0.28;
        this.tone(520 + Math.random() * 520, "triangle", at, 0.12, 0.002, 0.07 + Math.random() * 0.08, o, 0.8);
        this.hiss(at, 0.1, 0.002, 0.06, 2200, 1.2, o);
      }
    }, 0.4 + 0.06 * Math.max(1, Math.min(10, count)));
  }
  countdown(go = false) {
    this.one(go ? "go" : "countdown", (t, o) => this.tone(go ? 880 : 440, "square", t, 0.14, 0.005, go ? 0.5 : 0.16, o));
  }
  skid(power = 1) {
    this.one("skid", (t, o) => this.hiss(t, 0.1 * power, 0.02, 0.2, 1800, 4, o), power);
  }
  crash(power = 1) {
    this.one("crash", (t, o) => {
      this.hiss(t, 0.4 * power, 0.003, 0.24, 800, 0.6, o, "lowpass");
      this.tone(70, "sine", t, 0.4 * power, 0.003, 0.2, o, 0.5);
    }, power);
  }
  horn() {
    this.one("horn", (t, o) => {
      this.tone(392, "square", t, 0.09, 0.01, 0.3, o);
      this.tone(494, "square", t, 0.09, 0.01, 0.3, o);
    });
  }
  nitro() {
    this.one("nitro", (t, o) => this.hiss(t, 0.3, 0.05, 0.7, 500, 0.8, o, "bandpass", 6));
  }
  /** Thunder a long way up the river. */
  thunder() {
    this.one("thunder", (t, o) => {
      this.hiss(t, 0.5, 0.06, 2.8, 120, 0.7, o, "lowpass");
      this.tone(46, "sine", t + 0.05, 0.3, 0.03, 2, o, 0.6);
    });
  }
  spook() {
    this.one("spook", (t, o) => {
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
