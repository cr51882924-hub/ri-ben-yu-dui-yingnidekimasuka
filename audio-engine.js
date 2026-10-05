/**
 * GrooveSync MV - Web Audio & Beat/Viseme Analysis Engine
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.destination = null;
    this.recDestination = null;
    this.sourceNode = null;
    this.micStream = null;
    this.micNode = null;

    this.isPlaying = false;
    this.isMicActive = false;
    this.currentTrackId = 'jpop';

    this.currentTime = 0;
    this.duration = 30;
    this.startTime = 0;
    this.pauseOffset = 0;

    // Synthetic demo song loop nodes & timers
    this.synthInterval = null;
    this.synthNotesTimer = null;

    // Analysis data arrays
    this.fftSize = 512;
    this.freqData = null;
    this.timeData = null;

    // Visemes & groove states
    this.visemes = { A: 0, I: 0, U: 0, E: 0, O: 0 };
    this.currentChar = 'A';
    this.mouthOpen = 0; // 0 to 1
    this.mouthWidth = 0.5; // 0 to 1
    this.beatPulse = 0; // 0 to 1, decays
    this.grooveLevel = 0; // 0 to 1

    this.bpm = 132;
    this.audioBuffer = null; // user loaded song

    this.onEndedCallbacks = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.82;

      this.recDestination = this.ctx.createMediaStreamDestination();

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

      // Connect analyser to both hardware speakers and recording stream
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.recDestination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Load user audio file
  async loadUserFile(file) {
    this.init();
    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    try {
      this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.duration = this.audioBuffer.duration;
      this.currentTrackId = 'custom';
      this.bpm = 120; // Default estimate for custom audio
      return {
        success: true,
        name: file.name,
        duration: this.duration
      };
    } catch (err) {
      console.error('Audio decode error:', err);
      return { success: false, error: err.message };
    }
  }

  // Select built-in demo track
  selectDemoTrack(id) {
    this.stop();
    this.currentTrackId = id;
    this.audioBuffer = null;
    if (id === 'jpop') {
      this.bpm = 132;
      this.duration = 30;
    } else if (id === 'lofi') {
      this.bpm = 88;
      this.duration = 30;
    } else if (id === 'rock') {
      this.bpm = 148;
      this.duration = 30;
    } else if (id === 'cyber') {
      this.bpm = 128;
      this.duration = 30;
    }
  }

  play() {
    this.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = this.ctx.currentTime - this.pauseOffset;

    if (this.audioBuffer) {
      // Play decoded audio buffer
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.analyser);
      this.sourceNode.onended = () => {
        if (this.isPlaying && this.currentTime >= this.duration - 0.2) {
          this.stop();
        }
      };
      this.sourceNode.start(0, this.pauseOffset % this.duration);
    } else {
      // Play procedural high quality synthesizer track
      this.startSynthTrack();
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.pauseOffset = (this.ctx.currentTime - this.startTime) % this.duration;

    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.stopSynthTrack();
  }

  stop() {
    this.pause();
    this.pauseOffset = 0;
    this.currentTime = 0;
  }

  seek(ratio) {
    const target = ratio * this.duration;
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.pauseOffset = target;
    this.currentTime = target;
    if (wasPlaying) this.play();
  }

  toggleMic() {
    this.init();
    if (this.isMicActive) {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
      }
      if (this.micNode) {
        this.micNode.disconnect();
        this.micNode = null;
      }
      this.isMicActive = false;
      return false;
    } else {
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.micStream = stream;
          this.micNode = this.ctx.createMediaStreamSource(stream);
          this.micNode.connect(this.analyser);
          this.isMicActive = true;
          return true;
        })
        .catch(err => {
          console.error("Mic access denied or error:", err);
          return false;
        });
    }
  }

  // Real-time analysis for every frame
  updateAnalysis(sensitivity = 1.0) {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    if (this.isPlaying) {
      this.currentTime = (this.ctx.currentTime - this.startTime) % this.duration;
    }

    // Split frequency spectrum into bands
    const binCount = this.analyser.frequencyBinCount;
    // Sub-bass (kick & beat): ~20Hz - 150Hz
    let bassSum = 0;
    const bassEnd = Math.floor(binCount * 0.08);
    for (let i = 1; i < bassEnd; i++) bassSum += this.freqData[i];
    const bassAvg = (bassSum / (bassEnd - 1)) / 255;

    // Mid low (body & rhythm): ~150Hz - 600Hz
    let midLowSum = 0;
    const midLowEnd = Math.floor(binCount * 0.22);
    for (let i = bassEnd; i < midLowEnd; i++) midLowSum += this.freqData[i];
    const midLowAvg = (midLowSum / (midLowEnd - bassEnd)) / 255;

    // Vocal vowel Formant 1: ~600Hz - 1600Hz
    let form1Sum = 0;
    const form1End = Math.floor(binCount * 0.45);
    for (let i = midLowEnd; i < form1End; i++) form1Sum += this.freqData[i];
    const form1Avg = (form1Sum / (form1End - midLowEnd)) / 255;

    // Vocal vowel Formant 2: ~1600Hz - 4000Hz
    let form2Sum = 0;
    const form2End = Math.floor(binCount * 0.75);
    for (let i = form1End; i < form2End; i++) form2Sum += this.freqData[i];
    const form2Avg = (form2Sum / (form2End - form1End)) / 255;

    // High presence: ~4000Hz+
    let highSum = 0;
    for (let i = form2End; i < binCount; i++) highSum += this.freqData[i];
    const highAvg = (highSum / (binCount - form2End)) / 255;

    // Total vocal loudness
    const vocalLoudness = (form1Avg * 0.45 + form2Avg * 0.45 + highAvg * 0.1) * sensitivity;

    // Beat pulse detection (kick thump)
    if (bassAvg > 0.55 && bassAvg > this.beatPulse) {
      this.beatPulse = Math.min(1.0, bassAvg * 1.3);
    } else {
      this.beatPulse *= 0.88; // decay
    }

    // Groove level (smooth body sway)
    const targetGroove = (midLowAvg * 0.6 + bassAvg * 0.4);
    this.grooveLevel += (targetGroove - this.grooveLevel) * 0.15;

    // Viseme calculation (A, I, U, E, O)
    // A: High openness, balanced formants
    // I: Wide smile, high formant 2, lower formant 1
    // U: Rounded small lips, lower formants
    // E: Medium open, wide smile
    // O: Open rounded, strong formant 1
    const rawA = Math.max(0, form1Avg * 1.2 + form2Avg * 0.6 - 0.2);
    const rawI = Math.max(0, form2Avg * 1.6 - form1Avg * 0.5);
    const rawU = Math.max(0, midLowAvg * 1.2 - form2Avg * 0.8);
    const rawE = Math.max(0, form2Avg * 1.1 + form1Avg * 0.5 - 0.15);
    const rawO = Math.max(0, form1Avg * 1.4 - form2Avg * 0.4);

    const sum = rawA + rawI + rawU + rawE + rawO + 0.001;
    this.visemes.A = (rawA / sum) * vocalLoudness;
    this.visemes.I = (rawI / sum) * vocalLoudness;
    this.visemes.U = (rawU / sum) * vocalLoudness;
    this.visemes.E = (rawE / sum) * vocalLoudness;
    this.visemes.O = (rawO / sum) * vocalLoudness;

    // Find dominant vowel
    let maxVal = -1;
    let dominant = 'A';
    for (const [char, val] of Object.entries(this.visemes)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = char;
      }
    }
    if (vocalLoudness > 0.08) {
      this.currentChar = dominant;
    }

    // Target mouth openness & width
    const targetOpen = Math.min(1.0, Math.max(0, (vocalLoudness - 0.05) * 1.8));
    this.mouthOpen += (targetOpen - this.mouthOpen) * 0.35;

    let targetWidth = 0.5;
    if (dominant === 'I' || dominant === 'E') targetWidth = 0.85;
    else if (dominant === 'U' || dominant === 'O') targetWidth = 0.35;
    else targetWidth = 0.6;
    this.mouthWidth += (targetWidth - this.mouthWidth) * 0.25;
  }

  // Procedural synthesizer music generator for zero-latency, beat-perfect demos
  startSynthTrack() {
    this.stopSynthTrack();

    const bpm = this.bpm;
    const beatInterval = 60 / bpm; // seconds per beat
    const sixteenth = beatInterval / 4;

    let step = Math.floor((this.pauseOffset % this.duration) / sixteenth);

    const scheduleNext = () => {
      if (!this.isPlaying) return;

      const time = this.ctx.currentTime + 0.05;
      const currentStep = step % 64; // 4-bar loop

      this.triggerStepAudio(this.currentTrackId, currentStep, time);

      step++;
      this.synthInterval = setTimeout(scheduleNext, sixteenth * 1000 * 0.95);
    };

    scheduleNext();
  }

  stopSynthTrack() {
    if (this.synthInterval) {
      clearTimeout(this.synthInterval);
      this.synthInterval = null;
    }
  }

  // Play individual instrument and vocal layers in demo tracks
  triggerStepAudio(genre, step, time) {
    if (!this.ctx) return;

    const isKick = (genre === 'lofi') ? (step % 16 === 0 || step % 16 === 10) : (step % 8 === 0);
    const isSnare = (genre === 'lofi') ? (step % 16 === 8) : (step % 16 === 8 || (genre === 'rock' && (step % 8 === 4)));
    const isHiHat = (step % 2 === 0);

    // 1. Kick Drum
    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(genre === 'cyber' ? 140 : 120, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);
      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.22);
    }

    // 2. Snare / Clap
    if (isSnare) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.18);
    }

    // 3. HiHat
    if (isHiHat) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'highpass';
      osc.frequency.setValueAtTime(8000, time);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.05);
    }

    // 4. Genre Specific Chords & Guitar/Melody
    if (genre === 'jpop') {
      // J-Pop guitar cutting chords & idol vocal arpeggio
      const chordScale = [261.63, 329.63, 392.00, 523.25, 440.00]; // C, E, G, C, A
      if (step % 4 === 0) {
        // Guitar strum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        const chordNote = chordScale[(Math.floor(step / 16)) % chordScale.length];
        osc.frequency.setValueAtTime(chordNote, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
        osc.connect(gain);
        gain.connect(this.analyser);
        osc.start(time);
        osc.stop(time + 0.2);
      }
      // Vocal melody line (triggers lip-sync!)
      if (step % 2 === 0 && (step % 8 !== 7)) {
        const vocOsc = this.ctx.createOscillator();
        const vocGain = this.ctx.createGain();
        vocOsc.type = 'sine';
        const melody = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99];
        const note = melody[(step / 2) % melody.length];
        vocOsc.frequency.setValueAtTime(note, time);
        vocGain.gain.setValueAtTime(0.28, time);
        vocGain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
        vocOsc.connect(vocGain);
        vocGain.connect(this.analyser);
        vocOsc.start(time);
        vocOsc.stop(time + 0.15);
      }
    } else if (genre === 'rock') {
      // Overdrive guitar power chord & rock vocal belt
      if (step % 2 === 0) {
        const gOsc = this.ctx.createOscillator();
        const gGain = this.ctx.createGain();
        gOsc.type = 'sawtooth';
        const rockChords = [110, 146.83, 164.81, 130.81]; // A, D, E, C
        const chord = rockChords[Math.floor(step / 16) % rockChords.length];
        gOsc.frequency.setValueAtTime(chord * (step % 4 === 0 ? 1 : 1.5), time);
        gGain.gain.setValueAtTime(0.3, time);
        gGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        gOsc.connect(gGain);
        gGain.connect(this.analyser);
        gOsc.start(time);
        gOsc.stop(time + 0.15);
      }
      // Passionate rock vocal belt
      if (step % 4 === 0) {
        const vOsc = this.ctx.createOscillator();
        const vGain = this.ctx.createGain();
        vOsc.type = 'triangle';
        const beltNotes = [440, 493.88, 523.25, 659.25];
        vOsc.frequency.setValueAtTime(beltNotes[Math.floor(step / 8) % beltNotes.length], time);
        vGain.gain.setValueAtTime(0.35, time);
        vGain.gain.exponentialRampToValueAtTime(0.01, time + 0.28);
        vOsc.connect(vGain);
        vGain.connect(this.analyser);
        vOsc.start(time);
        vOsc.stop(time + 0.3);
      }
    } else if (genre === 'lofi') {
      // Chill Rhodes piano chord & groovy bass
      if (step % 8 === 0) {
        const pOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pOsc.type = 'sine';
        const lofiChords = [220, 293.66, 329.63, 261.63];
        pOsc.frequency.setValueAtTime(lofiChords[Math.floor(step / 16) % lofiChords.length], time);
        pGain.gain.setValueAtTime(0.25, time);
        pGain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
        pOsc.connect(pGain);
        pGain.connect(this.analyser);
        pOsc.start(time);
        pOsc.stop(time + 0.75);
      }
      // Smooth vocal hum / whisper
      if (step % 4 === 2) {
        const humOsc = this.ctx.createOscillator();
        const humGain = this.ctx.createGain();
        humOsc.type = 'sine';
        humOsc.frequency.setValueAtTime(329.63, time);
        humGain.gain.setValueAtTime(0.18, time);
        humGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        humOsc.connect(humGain);
        humGain.connect(this.analyser);
        humOsc.start(time);
        humOsc.stop(time + 0.26);
      }
    } else if (genre === 'cyber') {
      // Supersaw lead EDM melody
      if (step % 2 === 0) {
        const sOsc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        sOsc.type = 'sawtooth';
        const edmNotes = [523.25, 587.33, 659.25, 783.99, 880.00];
        sOsc.frequency.setValueAtTime(edmNotes[Math.floor(step / 2) % edmNotes.length], time);
        sGain.gain.setValueAtTime(0.24, time);
        sGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        sOsc.connect(sGain);
        sGain.connect(this.analyser);
        sOsc.start(time);
        sOsc.stop(time + 0.12);
      }
    }
  }
}

window.AudioEngine = AudioEngine;
