// Voyage audio engine — Web Audio API, browser only.
// Music and sound effects are SYNTHESIZED in code (original, no licences to track, works offline).
// Narration is prerecorded MP3 (one per approved line) and ducks the music while it plays.
// Every call is safe before unlock / if audio is unavailable: the game never waits on audio (techspec §8.2).

import { VOICE_CLIPS } from "./voiceClips";

export type MusicState =
  | "silence"
  | "title"
  | "launch"
  | "space"
  | "memory"
  | "mars"
  | "hazard"
  | "discovery"
  | "ending"
  | "debrief";

export type LoopName = "thrust" | "wind" | "drive";

export type Sfx =
  | "click"
  | "hubOpen"
  | "hubClose"
  | "discovery"
  | "coin"
  | "lowPower"
  | "hit"
  | "touchdown"
  | "unlock"
  | "travel"
  | "stormPass"
  | "panelDamage"
  | "powerDown"
  | "noPower"
  | "lock"
  | "chargeStart";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// Note helper: "A2" → midi number.
const NOTE: Record<string, number> = { C: 0, "C#": 1, D: 2, Eb: 3, E: 4, F: 5, "F#": 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const n = (s: string) => {
  const m = /^([A-G](?:#|b)?)(-?\d)$/.exec(s)!;
  return 12 * (Number(m[2]) + 1) + NOTE[m[1]];
};
const chords = (...cs: string[][]) => cs.map((c) => c.map(n));

interface MusicDef {
  chords: number[][];
  chordSeconds: number;
  wave: OscillatorType;
  cutoff: number;
  level: number;
  /** Probability per beat of a soft pluck from the chord, an octave up. */
  pluck: number;
  beatSeconds: number;
  pulse?: number; // low pulse frequency (hazard tension)
}

const MUSIC: Record<Exclude<MusicState, "silence">, MusicDef> = {
  title: { chords: chords(["A2", "E3", "A3", "C4", "E4"], ["F2", "C3", "A3", "C4", "E4"], ["C3", "G3", "C4", "E4"], ["G2", "D3", "B3", "D4"]), chordSeconds: 6, wave: "triangle", cutoff: 1300, level: 0.5, pluck: 0.25, beatSeconds: 0.75 },
  // Triangle/sine only — sawtooth pads read as a constant buzz (player feedback, Nov 14).
  launch: { chords: chords(["D3", "A3", "D4", "F#4"], ["B2", "F#3", "B3", "D4"], ["G2", "D3", "G3", "B3"], ["A2", "E3", "A3", "C#4"]), chordSeconds: 4, wave: "triangle", cutoff: 1500, level: 0.42, pluck: 0.55, beatSeconds: 0.5 },
  space: { chords: chords(["D3", "A3", "D4", "F#4"], ["G2", "D3", "G3", "B3"], ["E3", "B3", "E4", "G4"], ["A2", "E3", "A3", "C#4"]), chordSeconds: 3, wave: "triangle", cutoff: 1600, level: 0.4, pluck: 0.7, beatSeconds: 0.375 },
  memory: { chords: chords(["C3", "G3", "E4"], ["A2", "E3", "C4"], ["F2", "C3", "A3"], ["G2", "D3", "B3"]), chordSeconds: 5, wave: "sine", cutoff: 900, level: 0.5, pluck: 0.35, beatSeconds: 0.625 },
  mars: { chords: chords(["E2", "B2", "E3", "G3", "B3"], ["C3", "G3", "C4", "E4"], ["D3", "A3", "D4", "F#4"], ["B2", "F#3", "B3", "D4"]), chordSeconds: 7, wave: "triangle", cutoff: 950, level: 0.42, pluck: 0.18, beatSeconds: 0.875 },
  hazard: { chords: chords(["D2", "A2", "D3", "F3"], ["Eb2", "Bb2", "Eb3", "F#3"], ["D2", "A2", "D3", "F3"], ["C2", "G2", "C3", "Eb3"]), chordSeconds: 5, wave: "triangle", cutoff: 700, level: 0.45, pluck: 0.1, beatSeconds: 0.625, pulse: 1.6 },
  discovery: { chords: chords(["F3", "A3", "C4", "E4"], ["G3", "B3", "D4", "F#4"], ["E3", "G3", "B3", "D4"], ["A3", "C4", "E4", "G4"]), chordSeconds: 5, wave: "triangle", cutoff: 1600, level: 0.42, pluck: 0.5, beatSeconds: 0.5 },
  ending: { chords: chords(["A2", "E3", "C4"], ["F2", "C3", "A3"], ["C3", "G3", "E4"], ["G2", "D3", "B3"]), chordSeconds: 8, wave: "sine", cutoff: 800, level: 0.5, pluck: 0.12, beatSeconds: 1 },
  debrief: { chords: chords(["C3", "G3", "C4", "E4"], ["A2", "E3", "A3", "C4"], ["F2", "C3", "F3", "A3"], ["G2", "D3", "G3", "B3"]), chordSeconds: 5, wave: "triangle", cutoff: 1400, level: 0.45, pluck: 0.4, beatSeconds: 0.625 },
};

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private voiceBus!: GainNode;
  private noise!: AudioBuffer;
  private musicState: MusicState = "silence";
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private loops = new Map<LoopName, { gain: GainNode; stop: () => void }>();
  private voiceCache = new Map<string, AudioBuffer | null>();
  private voiceSource: AudioBufferSourceNode | null = null;
  private muted = false;
  private pendingMusic: MusicState = "silence";

  get unlocked() {
    return this.ctx !== null && this.ctx.state === "running";
  }

  /** Must be called from a user gesture (browser autoplay rules). Safe to call repeatedly. */
  unlock() {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
        this.musicBus = this.gain(0.35, this.master);
        this.sfxBus = this.gain(0.6, this.master);
        this.voiceBus = this.gain(1, this.master);
        this.noise = this.makeNoise();
        void this.preloadVoices();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      if (this.pendingMusic !== this.musicState) this.setMusic(this.pendingMusic);
    } catch {
      this.ctx = null; // audio unavailable — the game continues silently
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }
  get isMuted() {
    return this.muted;
  }

  // ---------- music ----------

  setMusic(state: MusicState) {
    this.pendingMusic = state;
    if (!this.ctx || state === this.musicState) return;
    const ctx = this.ctx;
    // Crossfade: fade out the old bed, start the new one (design.md §9.1 — no abrupt jumps).
    if (this.musicGain) {
      const old = this.musicGain;
      old.gain.cancelScheduledValues(ctx.currentTime);
      old.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      window.setTimeout(() => old.disconnect(), 4000);
    }
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicGain = null;
    this.musicState = state;
    if (state === "silence") return;

    const def = MUSIC[state];
    const bed = this.gain(0, this.musicBus);
    bed.gain.setTargetAtTime(def.level, ctx.currentTime, 1.2);
    this.musicGain = bed;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = def.cutoff;
    filter.Q.value = 0.7;
    filter.connect(bed);

    let chordIndex = 0;
    let nextChord = ctx.currentTime + 0.05;
    let nextBeat = ctx.currentTime + 0.05;
    const schedule = () => {
      if (this.musicGain !== bed) return;
      const horizon = ctx.currentTime + 1.5;
      while (nextChord < horizon) {
        this.playChord(def.chords[chordIndex % def.chords.length], nextChord, def, filter);
        chordIndex++;
        nextChord += def.chordSeconds;
      }
      while (nextBeat < horizon) {
        const chord = def.chords[(chordIndex + def.chords.length - 1) % def.chords.length];
        if (Math.random() < def.pluck) this.pluck(midi(chord[Math.floor(Math.random() * chord.length)] + 12), nextBeat, bed);
        if (def.pulse) this.pulse(nextBeat, bed, def.pulse);
        nextBeat += def.beatSeconds;
      }
    };
    schedule();
    this.musicTimer = window.setInterval(schedule, 400);
  }

  private playChord(notes: number[], at: number, def: MusicDef, out: AudioNode) {
    const ctx = this.ctx!;
    const dur = def.chordSeconds * 1.25;
    for (const note of notes) {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = def.wave;
        o.frequency.value = midi(note);
        o.detune.value = detune;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.06 / notes.length, at + def.chordSeconds * 0.35);
        g.gain.linearRampToValueAtTime(0, at + dur);
        o.connect(g).connect(out);
        o.start(at);
        o.stop(at + dur + 0.1);
      }
    }
  }

  private pluck(freq: number, at: number, out: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.05, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 1.5);
  }

  private pulse(at: number, out: AudioNode, everyBeats: number) {
    if (Math.random() > 1 / everyBeats) return;
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(70, at);
    o.frequency.exponentialRampToValueAtTime(40, at + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.55);
  }

  // ---------- ambience loops ----------

  /** Set a continuous loop's level (0 = off). Ramps smoothly; creates the loop on first use. */
  setLoop(name: LoopName, level: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    let loop = this.loops.get(name);
    if (!loop) {
      if (level <= 0) return;
      loop = this.createLoop(name);
      this.loops.set(name, loop);
    }
    loop.gain.gain.setTargetAtTime(Math.max(0, level), ctx.currentTime, name === "wind" ? 0.8 : 0.15);
  }

  stopAllLoops() {
    for (const name of this.loops.keys()) this.setLoop(name, 0);
  }

  private createLoop(name: LoopName) {
    const ctx = this.ctx!;
    const gain = this.gain(0, this.sfxBus);
    const nodes: AudioScheduledSourceNode[] = [];
    if (name === "thrust" || name === "wind") {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = name === "thrust" ? "lowpass" : "bandpass";
      f.frequency.value = name === "thrust" ? 300 : 700;
      f.Q.value = name === "thrust" ? 0.8 : 0.6;
      if (name === "wind") {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.13;
        const depth = this.gain(300, f.frequency);
        lfo.connect(depth);
        lfo.start();
        nodes.push(lfo);
      }
      src.connect(f).connect(gain);
      src.start();
      nodes.push(src);
    } else {
      // Drive: soft low gravel rumble (filtered noise), not an oscillator hum.
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      src.playbackRate.value = 0.6;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 240;
      f.Q.value = 0.5;
      src.connect(f).connect(gain);
      src.start();
      nodes.push(src);
    }
    return { gain, stop: () => nodes.forEach((s) => s.stop()) };
  }

  // ---------- one-shot effects ----------

  sfx(name: Sfx) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const tone = (freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.2, endFreq?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(this.sfxBus);
      o.start(start);
      o.stop(start + dur + 0.05);
    };
    const noiseBurst = (start: number, dur: number, cutoff: number, vol: number) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      s.connect(f).connect(g).connect(this.sfxBus);
      s.start(start);
      s.stop(start + dur + 0.05);
    };
    switch (name) {
      case "click":
        tone(880, t, 0.06, "square", 0.05);
        break;
      case "hubOpen":
        tone(523, t, 0.18, "triangle", 0.12);
        tone(784, t + 0.08, 0.25, "triangle", 0.12);
        break;
      case "hubClose":
        tone(784, t, 0.15, "triangle", 0.1);
        tone(523, t + 0.07, 0.22, "triangle", 0.1);
        break;
      case "discovery":
        [659, 784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.14, 1.6, "sine", 0.12));
        break;
      case "coin":
        tone(988, t, 0.09, "square", 0.06);
        tone(1319, t + 0.08, 0.22, "square", 0.06);
        break;
      case "lowPower":
        tone(440, t, 0.12, "triangle", 0.1);
        tone(440, t + 0.22, 0.12, "triangle", 0.1);
        break;
      case "hit":
        noiseBurst(t, 0.35, 900, 0.5);
        tone(120, t, 0.3, "sine", 0.25, 50);
        break;
      case "touchdown":
        noiseBurst(t, 0.9, 500, 0.6);
        tone(80, t, 0.6, "sine", 0.3, 40);
        break;
      case "unlock":
        [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.09, 0.5, "triangle", 0.11));
        break;
      case "travel":
        noiseBurst(t, 1.4, 2500, 0.18);
        tone(220, t, 1.2, "sine", 0.08, 880);
        break;
      case "stormPass":
        [392, 523, 659, 784].forEach((f, i) => tone(f, t + i * 0.2, 1.8, "sine", 0.1));
        break;
      case "panelDamage":
        // Gust impact, then crackling electrical sparks and a sagging hum.
        noiseBurst(t, 0.7, 2600, 0.5);
        [0.05, 0.13, 0.19, 0.31, 0.42, 0.55].forEach((d, i) => tone(1500 + i * 230, t + d, 0.05, "square", 0.05));
        tone(320, t + 0.1, 0.9, "sawtooth", 0.07, 90);
        break;
      case "powerDown":
        // A long falling whine as the rover's systems die.
        tone(620, t, 2.2, "sawtooth", 0.08, 40);
        tone(310, t + 0.05, 2.4, "sine", 0.1, 30);
        break;
      case "noPower":
        // A dull relay click: the controls do nothing.
        tone(95, t, 0.1, "square", 0.07);
        break;
      case "lock":
        [587, 740, 880, 1175].forEach((f, i) => tone(f, t + i * 0.1, 0.9, "triangle", 0.1));
        break;
      case "chargeStart":
        // One soft rising pair when the panels start charging (replaces the old constant tone).
        tone(523, t, 0.35, "sine", 0.05);
        tone(784, t + 0.12, 0.5, "sine", 0.05);
        break;
    }
  }

  // ---------- narration ----------

  private async loadVoice(id: string): Promise<AudioBuffer | null> {
    if (!this.ctx || !VOICE_CLIPS.has(id)) return null;
    if (this.voiceCache.has(id)) return this.voiceCache.get(id) ?? null;
    try {
      const res = await fetch(`/assets/audio/voice/${id}.mp3`);
      if (!res.ok) throw new Error(String(res.status));
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      this.voiceCache.set(id, buf);
      return buf;
    } catch {
      this.voiceCache.set(id, null);
      return null;
    }
  }

  private async preloadVoices() {
    for (const id of VOICE_CLIPS) await this.loadVoice(id);
  }

  /**
   * Play one narration clip. Resolves with its duration in seconds, or null if there is no
   * playable clip (muted, locked, missing, failed) — the caller then uses reading-pace timing.
   */
  async playVoice(id: string): Promise<number | null> {
    if (!this.unlocked || this.muted) return null;
    const buf = await this.loadVoice(id);
    if (!buf || !this.ctx) return null;
    this.stopVoice();
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceBus);
    // Duck the music under narration (design.md §9.3).
    this.musicBus.gain.setTargetAtTime(0.14, ctx.currentTime, 0.15);
    src.onended = () => {
      if (this.voiceSource === src) {
        this.voiceSource = null;
        this.musicBus.gain.setTargetAtTime(0.35, ctx.currentTime, 0.6);
      }
    };
    src.start();
    this.voiceSource = src;
    return buf.duration;
  }

  stopVoice() {
    try {
      this.voiceSource?.stop();
    } catch {
      /* already stopped */
    }
    this.voiceSource = null;
  }

  // ---------- helpers ----------

  private gain(value: number, to: AudioNode | AudioParam) {
    const g = this.ctx!.createGain();
    g.gain.value = value;
    g.connect(to as AudioNode);
    return g;
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const audio = new AudioEngine();
