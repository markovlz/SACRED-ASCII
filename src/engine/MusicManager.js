/**
 * MusicManager - BSO Procedural Lúgubre / Dark Synthwave Metal Industrial
 * BPM lento y pesado (104 BPM), sub-bass profundo y atmósfera sombría estilo Terminator / Doom 64.
 */
export class MusicManager {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.isPlaying = false;
        this.isMuted = true; // Silenciada por defecto a petición del usuario
        this.masterGain = null;

        // Tempo lento, pesado y lúgubre
        this.bpm = 104;
        this.stepTime = (60 / this.bpm) / 4; // Semicorcheas
        this.currentStep = 0;
        this.timer = null;

        // Progresión de notas sub-graves oscuras (Re menor / Mi menor / Do / Si bemol)
        // D1 (36.7Hz), Eb1 (38.8Hz), D1 (36.7Hz), Bb0 (29.1Hz), C1 (32.7Hz), A0 (27.5Hz)
        this.bassRiff = [
            36.7, 36.7, 73.4, 36.7, 0, 36.7, 38.8, 36.7,
            36.7, 0, 73.4, 36.7, 32.7, 32.7, 29.1, 27.5,
            36.7, 36.7, 73.4, 36.7, 0, 36.7, 55.0, 49.0,
            36.7, 0, 38.8, 36.7, 32.7, 29.1, 27.5, 36.7
        ];

        // Melodía atmosférica oscura y sombría
        this.leadMelody = [
            146.8, 0, 0, 0, 155.5, 0, 146.8, 0,
            0, 0, 174.6, 0, 155.5, 0, 130.8, 0,
            146.8, 0, 0, 0, 220.0, 0, 196.0, 0,
            174.6, 0, 155.5, 0, 146.8, 0, 116.5, 0
        ];

        this.init();
    }

    init() {
        if (!this.ctx) return;
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // Inicia en silencio
        this.masterGain.connect(this.ctx.destination);
    }

    start() {
        if (this.isPlaying || !this.ctx) return;
        this.isPlaying = true;
        this.scheduleNextStep();
    }

    pause() {
        this.isPlaying = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.isPlaying && this.ctx) {
            this.isPlaying = true;
            this.scheduleNextStep();
        }
    }

    stop() {
        this.pause();
        this.currentStep = 0;
    }

    toggleMusic() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0.0 : 0.20, this.ctx.currentTime);
        }
        return !this.isMuted;
    }

    scheduleNextStep() {
        if (!this.isPlaying || !this.ctx || this.ctx.state !== 'running') {
            return;
        }

        const now = this.ctx.currentTime;
        const step = this.currentStep % 32;

        // 1. Doom Sub-Bass Heavy Chug (Graves profundos y oscuros)
        const bassFreq = this.bassRiff[step];
        if (bassFreq > 0) {
            this.playBassNote(bassFreq, now, this.stepTime * 0.9);
        }

        // 2. Percusión Industrial Lenta y Sombría
        if (step % 8 === 0 || step % 8 === 6) {
            this.playHeavyKick(now);
        }

        if (step % 8 === 4) {
            this.playIndustrialSnare(now);
        }

        // Clang metálico espaciado
        if (step % 4 === 0) {
            this.playMetallicClang(now, step % 8 === 0);
        }

        // 3. Lead Sombrío / John Carpenter Synth
        const leadFreq = this.leadMelody[step];
        if (leadFreq > 0) {
            this.playDarkLead(leadFreq, now, this.stepTime * 2.2);
        }

        this.currentStep++;
        this.timer = setTimeout(() => this.scheduleNextStep(), this.stepTime * 1000);
    }

    /* --- Sub-Bass Profundo con Distorsión Oscura --- */
    playBassNote(freq, time, dur) {
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freq * 0.5, time); // Sub-octava ultra profunda

        // Filtro pasabajos oscuro y cavernoso
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, time);
        filter.frequency.exponentialRampToValueAtTime(180, time + dur);
        filter.Q.setValueAtTime(5.5, time);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        subOsc.start(time);
        osc.stop(time + dur + 0.05);
        subOsc.stop(time + dur + 0.05);
    }

    /* --- Bombo Industrial Pesado --- */
    playHeavyKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, time);
        osc.frequency.exponentialRampToValueAtTime(25, time + 0.18);

        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.22);
    }

    /* --- Redoblante Industrial Cavernoso --- */
    playIndustrialSnare(time) {
        const bSize = this.ctx.sampleRate * 0.18;
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.2));
        }
        const source = this.ctx.createBufferSource();
        source.buffer = bBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);
        filter.Q.setValueAtTime(1.2, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        source.start(time);
    }

    /* --- Clang Metálico Terminator --- */
    playMetallicClang(time, isHeavy = false) {
        const osc1 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(isHeavy ? 620 : 1100, time);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, time);

        const dur = isHeavy ? 0.12 : 0.05;
        gain.gain.setValueAtTime(isHeavy ? 0.16 : 0.07, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc1.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(time);
        osc1.stop(time + dur);
    }

    /* --- Lead Sombrío Lúgubre --- */
    playDarkLead(freq, time, dur) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.frequency.linearRampToValueAtTime(450, time + dur);

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.02);
    }
}
