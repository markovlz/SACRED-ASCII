import { MusicManager } from './MusicManager.js';

/**
 * AudioManager - Gestor de audio con BSO Doom/Terminator Metal 80s y SFX
 */
export class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isInitialized = false;

        this.waveGain = null;
        this.waveFilter = null;
        this.psychicGain = null;
        this.psychicOsc = null;
        this.seagullInterval = null;
        this.carHornInterval = null;

        this.musicManager = null;
    }

    init() {
        if (this.isInitialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.musicManager = new MusicManager(this.ctx);

            this.setupOceanAmbience();
            this.setupPsychicHum();
            this.startSeagullLoop();
            this.startCarHornLoop();
            this.isInitialized = true;
        } catch (e) {
            console.warn('Web Audio no disponible:', e);
        }
    }

    startMusic() {
        if (this.musicManager) {
            this.musicManager.start();
        }
    }

    pauseMusic() {
        if (this.musicManager) {
            this.musicManager.pause();
        }
    }

    resumeMusic() {
        if (this.musicManager) {
            this.musicManager.resume();
        }
    }

    toggleMusic() {
        if (this.musicManager) {
            return this.musicManager.toggleMusic();
        }
        return false;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.startMusic();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx) {
            if (this.isMuted) {
                this.ctx.suspend();
            } else {
                this.ctx.resume();
            }
        }
        return this.isMuted;
    }

    setupOceanAmbience() {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * 4;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 2.0;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.waveFilter = this.ctx.createBiquadFilter();
        this.waveFilter.type = 'lowpass';
        this.waveFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
        lfo.connect(this.waveFilter.frequency);

        this.waveGain = this.ctx.createGain();
        this.waveGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

        whiteNoise.connect(this.waveFilter);
        this.waveFilter.connect(this.waveGain);
        this.waveGain.connect(this.ctx.destination);

        whiteNoise.start();
        lfo.start();
    }

    setupPsychicHum() {
        if (!this.ctx) return;
        this.psychicGain = this.ctx.createGain();
        this.psychicGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

        this.psychicOsc = this.ctx.createOscillator();
        this.psychicOsc.type = 'sawtooth';
        this.psychicOsc.frequency.setValueAtTime(65, this.ctx.currentTime);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(140, this.ctx.currentTime);
        filter.Q.setValueAtTime(6.0, this.ctx.currentTime);

        this.psychicOsc.connect(filter);
        filter.connect(this.psychicGain);
        this.psychicGain.connect(this.ctx.destination);

        this.psychicOsc.start();
    }

    setPsychicIntensity(intensity) {
        if (!this.psychicGain || !this.ctx || this.isMuted) return;
        const target = Math.min(0.2, Math.max(0.0, intensity * 0.2));
        this.psychicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    }

    playRevolverShot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.type = 'triangle';
        punchOsc.frequency.setValueAtTime(170, now);
        punchOsc.frequency.exponentialRampToValueAtTime(30, now + 0.14);

        punchGain.gain.setValueAtTime(0.35, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        punchOsc.connect(punchGain);
        punchGain.connect(this.ctx.destination);
        punchOsc.start(now);
        punchOsc.stop(now + 0.18);

        const bSize = this.ctx.sampleRate * 0.2;
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.15));
        }
        const nSource = this.ctx.createBufferSource();
        nSource.buffer = bBuffer;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(3000, now);
        nFilter.frequency.exponentialRampToValueAtTime(450, now + 0.18);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.4, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        nSource.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        nSource.start(now);
    }

    playShotgunShot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const boomOsc = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();
        boomOsc.type = 'sawtooth';
        boomOsc.frequency.setValueAtTime(140, now);
        boomOsc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

        boomGain.gain.setValueAtTime(0.5, now);
        boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        boomOsc.connect(boomGain);
        boomGain.connect(this.ctx.destination);
        boomOsc.start(now);
        boomOsc.stop(now + 0.3);

        const bSize = this.ctx.sampleRate * 0.3;
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.12));
        }
        const nSource = this.ctx.createBufferSource();
        nSource.buffer = bBuffer;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(4000, now);
        nFilter.frequency.exponentialRampToValueAtTime(300, now + 0.3);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.55, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        nSource.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        nSource.start(now);

        setTimeout(() => this.playShotgunPump(), 220);
    }

    playShotgunPump() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(900, now);
        osc1.frequency.setValueAtTime(450, now + 0.08);

        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);
    }

    playMinigunShot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280 + Math.random() * 60, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
    }

    playUziShot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450 + Math.random() * 90, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playDeagleShot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Golpe de percusión de alto calibre .50AE
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.type = 'sawtooth';
        punchOsc.frequency.setValueAtTime(190, now);
        punchOsc.frequency.exponentialRampToValueAtTime(22, now + 0.22);

        punchGain.gain.setValueAtTime(0.55, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

        punchOsc.connect(punchGain);
        punchGain.connect(this.ctx.destination);
        punchOsc.start(now);
        punchOsc.stop(now + 0.25);

        // Eco y detonación metálica de pólvora pesada
        const bSize = Math.floor(this.ctx.sampleRate * 0.26);
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.16));
        }
        const nSource = this.ctx.createBufferSource();
        nSource.buffer = bBuffer;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1800, now);
        nFilter.frequency.exponentialRampToValueAtTime(220, now + 0.24);
        nFilter.Q.setValueAtTime(1.8, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.65, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        nSource.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        nSource.start(now);
    }

    playM16Shot() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Chasquido táctico y estruendo de proyectil militar 5.56mm
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320 + Math.random() * 40, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);

        const bSize = Math.floor(this.ctx.sampleRate * 0.12);
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.1));
        }
        const nSource = this.ctx.createBufferSource();
        nSource.buffer = bBuffer;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(4200, now);
        nFilter.frequency.exponentialRampToValueAtTime(600, now + 0.1);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.38, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        nSource.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        nSource.start(now);
    }

    /* --- QUEJIDO / GRUÑIDO DE DOLOR DEL JUGADOR (SINTETIZADO PROCEDURAL) --- */
    playPlayerHurt() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Exhalación gutural grave del impacto
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140 + Math.random() * 25, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.22);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);
        filter.frequency.exponentialRampToValueAtTime(160, now + 0.22);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);

        // Ruido sordo del golpe en carne/armadura
        const bSize = Math.floor(this.ctx.sampleRate * 0.15);
        const bBuffer = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const data = bBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bSize * 0.18));
        }
        const nSource = this.ctx.createBufferSource();
        nSource.buffer = bBuffer;

        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(320, now);
        nFilter.Q.setValueAtTime(1.4, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.24, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        nSource.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        nSource.start(now);
    }

    /* --- FANFARRIA DE VICTORIA AL ELIMINAR AL JEFE FINAL --- */
    playVictory() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const notes = [
            { f: 261.63, t: 0.0, d: 0.25 }, // C4
            { f: 329.63, t: 0.22, d: 0.25 }, // E4
            { f: 392.00, t: 0.44, d: 0.25 }, // G4
            { f: 523.25, t: 0.66, d: 0.35 }, // C5
            { f: 440.00, t: 1.05, d: 0.25 }, // A4
            { f: 523.25, t: 1.30, d: 0.25 }, // C5
            { f: 659.25, t: 1.55, d: 0.70 }  // E5
        ];

        notes.forEach(n => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(n.f, now + n.t);

            gain.gain.setValueAtTime(0.001, now + n.t);
            gain.gain.linearRampToValueAtTime(0.22, now + n.t + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + n.t);
            osc.stop(now + n.t + n.d + 0.05);
        });
    }

    playBossRoar() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.4);
        osc.frequency.exponentialRampToValueAtTime(25, now + 1.6);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 1.6);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 1.9);
    }

    playReload() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.setValueAtTime(1150, now + 0.12);
        osc.frequency.setValueAtTime(550, now + 0.25);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    }

    playHeal() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        [440, 554.37, 659.25, 880, 1108.7].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);

            gain.gain.setValueAtTime(0.001, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.12, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.28);
        });
    }

    playPickup() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);

            gain.gain.setValueAtTime(0.001, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.09, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.18);
        });
    }

    playDemonDeath(isElite = false) {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';

        const startFreq = isElite ? 160 : 250;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    startCarHornLoop() {
        const triggerHorn = () => {
            if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
                this.playCarHorn();
            }
            const nextHorn = 45000 + Math.random() * 40000;
            this.carHornInterval = setTimeout(triggerHorn, nextHorn);
        };
        setTimeout(triggerHorn, 12000);
    }

    playCarHorn() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        [370, 466].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.03, now + 0.03);
            gain.gain.setValueAtTime(0.03, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }

    startSeagullLoop() {
        const triggerSeagull = () => {
            if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
                this.playSeagull();
            }
            const nextCall = 10000 + Math.random() * 12000;
            this.seagullInterval = setTimeout(triggerSeagull, nextCall);
        };
        setTimeout(triggerSeagull, 4000);
    }

    playSeagull() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const basePitch = 1800 + Math.random() * 300;
        osc.frequency.setValueAtTime(basePitch, now);
        osc.frequency.linearRampToValueAtTime(basePitch * 1.4, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(basePitch * 0.75, now + 0.5);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.03, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.55);
    }

    playFootstep(surface = 'asphalt') {
        if (!this.ctx || this.isMuted || this.ctx.state !== 'running') return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        if (surface === 'sand') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1100, now);
            gain.gain.setValueAtTime(0.05, now);
        } else if (surface === 'grass') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(360, now);
            gain.gain.setValueAtTime(0.04, now);
        } else {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(540, now);
            gain.gain.setValueAtTime(0.05, now);
        }

        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(now);
    }
}
