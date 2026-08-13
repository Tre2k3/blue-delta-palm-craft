/** Procedural mixer: hip-hop-adjacent Memphis bed + tight SFX. Unlock on first gesture. */

type Bus = "master" | "music" | "sfx";

export class GameAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  unlocked = false;
  muted = false;
  volumes = { master: 0.85, music: 0.42, sfx: 0.7 };
  private musicTimer = 0;
  private step = 0;
  private lastKick = 0;
  private padOsc: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private cityNoise: AudioBufferSourceNode | null = null;
  private cityGain: GainNode | null = null;
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private running = false;
  private lastFoot = 0;

  unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC({ latencyHint: "interactive" });
    this.master = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
    this.unlocked = true;
    void this.ctx.resume();
    this.startBed();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void this.ctx?.resume();
    });
  }

  setVolumes(v: { master: number; music: number; sfx: number }) {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const now = this.ctx.currentTime;
    const curve = (x: number) => x * x;
    this.master.gain.setTargetAtTime(this.muted ? 0 : curve(this.volumes.master), now, 0.04);
    this.music.gain.setTargetAtTime(curve(this.volumes.music), now, 0.06);
    this.sfx.gain.setTargetAtTime(curve(this.volumes.sfx), now, 0.03);
  }

  private startBed() {
    if (!this.ctx || !this.music) return;
    this.running = true;
    // Warm pad
    this.padOsc = this.ctx.createOscillator();
    this.padGain = this.ctx.createGain();
    const padFilter = this.ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 420;
    this.padOsc.type = "triangle";
    this.padOsc.frequency.value = 55;
    this.padGain.gain.value = 0.045;
    this.padOsc.connect(padFilter);
    padFilter.connect(this.padGain);
    this.padGain.connect(this.music);
    this.padOsc.start();

    // Sub bass
    this.bassOsc = this.ctx.createOscillator();
    this.bassGain = this.ctx.createGain();
    this.bassOsc.type = "sine";
    this.bassOsc.frequency.value = 55;
    this.bassGain.gain.value = 0;
    this.bassOsc.connect(this.bassGain);
    this.bassGain.connect(this.music);
    this.bassOsc.start();

    // City hiss
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
    this.cityNoise = this.ctx.createBufferSource();
    this.cityNoise.buffer = buf;
    this.cityNoise.loop = true;
    const cityFilter = this.ctx.createBiquadFilter();
    cityFilter.type = "bandpass";
    cityFilter.frequency.value = 900;
    cityFilter.Q.value = 0.4;
    this.cityGain = this.ctx.createGain();
    this.cityGain.gain.value = 0.035;
    this.cityNoise.connect(cityFilter);
    cityFilter.connect(this.cityGain);
    this.cityGain.connect(this.music);
    this.cityNoise.start();
  }

  tick(dt: number, playing: boolean, night: number) {
    if (!this.unlocked || !this.ctx || !this.music) return;
    if (this.ctx.state === "suspended") return;
    if (this.cityGain) {
      this.cityGain.gain.setTargetAtTime(0.025 + night * 0.02, this.ctx.currentTime, 0.2);
    }
    if (!playing) return;
    this.musicTimer += dt;
    const bpm = 88;
    const beat = 60 / bpm;
    if (this.musicTimer - this.lastKick >= beat) {
      this.lastKick = this.musicTimer;
      this.step = (this.step + 1) % 8;
      this.kick();
      if (this.step % 2 === 1) this.hat();
      if (this.step === 2 || this.step === 6) this.snare();
      const notes = [55, 55, 65.4, 55, 73.4, 55, 49, 55];
      this.blipBass(notes[this.step]!);
    }
  }

  private kick() {
    if (!this.ctx || !this.music) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(42, this.ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.22, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    o.connect(g);
    g.connect(this.music);
    o.start();
    o.stop(this.ctx.currentTime + 0.2);
  }

  private snare() {
    if (!this.ctx || !this.music) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1200;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(this.music);
    src.start();
  }

  private hat() {
    if (!this.ctx || !this.music) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = 0.04;
    src.connect(f);
    f.connect(g);
    g.connect(this.music);
    src.start();
  }

  private blipBass(freq: number) {
    if (!this.ctx || !this.bassOsc || !this.bassGain) return;
    this.bassOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.03);
    this.bassGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bassGain.gain.setValueAtTime(0.09, this.ctx.currentTime);
    this.bassGain.gain.exponentialRampToValueAtTime(0.002, this.ctx.currentTime + 0.28);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, bus: Bus = "sfx") {
    if (!this.ctx) return;
    const dest = bus === "music" ? this.music : this.sfx;
    if (!dest) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(dest);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  ui() {
    this.tone(660, 0.06, "triangle", 0.07);
  }

  confirm() {
    this.tone(520, 0.08, "triangle", 0.08);
    this.tone(780, 0.1, "sine", 0.05);
  }

  cash() {
    this.tone(880, 0.08, "square", 0.05);
    this.tone(1320, 0.12, "triangle", 0.06);
  }

  swish() {
    this.tone(740, 0.09, "sine", 0.08);
    this.tone(1180, 0.16, "triangle", 0.07);
  }

  rim() {
    this.tone(180, 0.08, "square", 0.05);
    this.tone(90, 0.12, "sine", 0.08);
  }

  bounce() {
    this.tone(140, 0.07, "sine", 0.06);
  }

  trophy() {
    this.tone(523, 0.12, "triangle", 0.08);
    this.tone(659, 0.16, "triangle", 0.07);
    this.tone(784, 0.22, "sine", 0.08);
  }

  mission() {
    this.tone(392, 0.18, "triangle", 0.08);
    this.tone(523, 0.24, "triangle", 0.07);
    this.tone(659, 0.32, "sine", 0.09);
  }

  talk() {
    const f = 240 + Math.random() * 80;
    this.tone(f, 0.05, "triangle", 0.04);
  }

  foot(now: number) {
    if (now - this.lastFoot < 0.28) return;
    this.lastFoot = now;
    this.tone(90 + Math.random() * 30, 0.05, "sine", 0.035);
  }

  whoosh() {
    this.tone(320, 0.1, "sawtooth", 0.03);
  }
}

export const audio = new GameAudio();
