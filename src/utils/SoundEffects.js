/**
 * Web Audio API Retro Sound Effects Generator
 * Dynamically synthesizes sound effects in real-time.
 * 100% reliable, zero asset-load delay, no CORS issues.
 */
class SoundEffects {
    static init() {
        if (this.initialized) return;
        
        try {
            // Lazy load AudioContext on first interaction if possible, or boot now
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        } catch (e) {
            console.error("Web Audio API not supported in this browser:", e);
        }

        this.enabled = true;
        this.initialized = true;
        
        // Listen for global sound toggle events from index.html
        window.addEventListener('toggle-sound', (e) => {
            this.enabled = e.detail.soundOn;
            
            // Resume context if browser suspended it
            if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        });
    }

    static resumeContext() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    static playLaser() {
        this.resumeContext();
        if (!this.enabled || !this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
            
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {
            console.warn("Sound playback error:", e);
        }
    }

    static playExplosion() {
        this.resumeContext();
        if (!this.enabled || !this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            
            // Create white noise buffer
            const bufferSize = this.ctx.sampleRate * 0.45; // 0.45 seconds
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            
            // Low-pass filter for a bassy explosion thump
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(10, now + 0.45);
            
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            noise.start(now);
            noise.stop(now + 0.45);
        } catch (e) {
            console.warn("Sound playback error:", e);
        }
    }

    static playPowerup() {
        this.resumeContext();
        if (!this.enabled || !this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.setValueAtTime(400, now + 0.07);
            osc.frequency.setValueAtTime(800, now + 0.14);
            osc.frequency.exponentialRampToValueAtTime(1600, now + 0.28);
            
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.28);
        } catch (e) {
            console.warn("Sound playback error:", e);
        }
    }

    static playHurt() {
        this.resumeContext();
        if (!this.enabled || !this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(240, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
            
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {
            console.warn("Sound playback error:", e);
        }
    }

    static playMenuClick() {
        this.resumeContext();
        if (!this.enabled || !this.ctx) return;
        
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.setValueAtTime(1000, now + 0.04);
            
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {
            console.warn("Sound playback error:", e);
        }
    }
}

export default SoundEffects;
