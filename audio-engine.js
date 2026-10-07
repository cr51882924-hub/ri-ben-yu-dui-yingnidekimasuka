/**
 * GrooveSync MV - Web Audio & Beat/Viseme Analysis Engine
 * Supports user audio trimming (start point, end point, custom duration)
 * and rich vocal formant synthesis for official demo songs.
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

    // Trimming range (which part of song to use for MV)
    this.trimStart = 0;
    this.trimEnd = 30;

    // Demo song synthesizer state
    this.isDemoTrack = false; // set to true when official demo song is active
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
    this.audioElement = null; // HTMLAudioElement fallback
    this.mediaElementSource = null;
    this.userAudioUrl = null;
    this.userAudioMode = null; // 'buffer' or 'element'

    this.playMode = 'trim'; // 'trim' or 'full'
    this.fullPlayOffset = 0;

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

  // Load user audio file with bulletproof multi-layer fallback
  async loadUserFile(file) {
    this.init();
    this.stop();

    // Disable demo track when user uploads their own file
    this.isDemoTrack = false;

    // Clean up previous custom audio instances
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch (e) {}
      this.audioElement = null;
    }
    if (this.userAudioUrl) {
      try { URL.revokeObjectURL(this.userAudioUrl); } catch (e) {}
      this.userAudioUrl = null;
    }
    this.audioBuffer = null;
    this.userAudioMode = null;

    // Check if the user accidentally uploaded an image file
    if (file && file.type && file.type.startsWith('image/')) {
      return {
        success: false,
        error: '選択されたファイルは「画像（写真）」です。人物やアーティストの写真は、一番上の【STEP 1: 人物・写真を設定する】からアップロードしてください。'
      };
    }

    if (!file || file.size === 0) {
      return {
        success: false,
        error: 'ファイルサイズが0バイトです。iCloud上のファイルの場合は一度端末にダウンロードしてからお試しください。'
      };
    }

    // Helper: read ArrayBuffer safely
    const getArrayBuffer = () => {
      return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ArrayBuffer timeout')), 4000);
        try {
          if (typeof file.arrayBuffer === 'function') {
            const buf = await file.arrayBuffer();
            clearTimeout(timer);
            resolve(buf);
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              clearTimeout(timer);
              resolve(reader.result);
            };
            reader.onerror = () => {
              clearTimeout(timer);
              reject(reader.error || new Error('FileReader failed'));
            };
            reader.readAsArrayBuffer(file);
          }
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });
    };

    // Helper: decodeAudioData compatible with Promise & Callback
    const decodeAudioSafe = (ctx, buffer) => {
      return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(new Error('Audio decode timeout (12s)'));
          }
        }, 12000);

        try {
          const res = ctx.decodeAudioData(
            buffer,
            (decoded) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(decoded);
              }
            },
            (err) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err || new Error('decodeAudioData callback failed'));
              }
            }
          );
          if (res && typeof res.then === 'function') {
            res.then((decoded) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(decoded);
              }
            }).catch((err) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err);
              }
            });
          }
        } catch (err) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            reject(err);
          }
        }
      });
    };

    // LAYER 1: Fast direct AudioBuffer decoding
    try {
      const buffer = await getArrayBuffer();
      const decoded = await decodeAudioSafe(this.ctx, buffer);
      this.audioBuffer = decoded;
      this.duration = decoded.duration;
      this.userAudioMode = 'buffer';

      this.trimStart = 0;
      this.trimEnd = Math.min(30, this.duration);
      this.bpm = this.estimateBpm(decoded);

      return {
        success: true,
        duration: this.duration,
        bpm: this.bpm,
        mode: 'buffer'
      };
    } catch (bufferErr) {
      console.warn('AudioBuffer direct decode failed, falling back to HTMLAudioElement:', bufferErr);
    }

    // LAYER 2: HTMLAudioElement fallback
    try {
      this.userAudioUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.src = this.userAudioUrl;

      const dur = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            resolve(audio.duration);
          } else {
            reject(new Error('HTMLAudioElement metadata timeout'));
          }
        }, 4000);

        audio.onloadedmetadata = () => {
          clearTimeout(timer);
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            resolve(audio.duration);
          } else {
            resolve(30);
          }
        };
        audio.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Audio element error'));
        };
      });

      this.audioElement = audio;
      this.duration = dur;
      this.userAudioMode = 'element';

      try {
        if (!this.mediaElementSource) {
          this.mediaElementSource = this.ctx.createMediaElementSource(audio);
        }
        this.mediaElementSource.connect(this.analyser);
      } catch (nodeErr) {
        console.warn('createMediaElementSource warning:', nodeErr);
      }

      this.trimStart = 0;
      this.trimEnd = Math.min(30, this.duration);
      this.bpm = 124;

      return {
        success: true,
        duration: this.duration,
        bpm: this.bpm,
        mode: 'element'
      };
    } catch (elementErr) {
      console.error('All audio loading layers failed:', elementErr);
      return {
        success: false,
        error: '音声の読み込みに失敗しました。MP3またはM4A形式の音楽ファイルをお試しください。'
      };
    }
  }

  // Load official demo song (Shining Beat / J-POP Vocal)
  loadDemoTrack(trackId = 'jpop') {
    this.init();
    this.stop();

    this.isDemoTrack = true;
    this.currentTrackId = trackId;
    this.duration = 30;
    this.trimStart = 0;
    this.trimEnd = 30;
    this.bpm = 132;
    this.userAudioMode = null;
    this.audioBuffer = null;
    if (this.audioElement) {
      try { this.audioElement.pause(); } catch (e) {}
      this.audioElement = null;
    }

    return {
      success: true,
      duration: 30,
      bpm: 132,
      isDemo: true
    };
  }

  // Simple BPM heuristic estimator
  estimateBpm(buffer) {
    try {
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      const step = Math.floor(sampleRate / 100);
      const peaks = [];

      for (let i = 0; i < Math.min(channelData.length, sampleRate * 30); i += step) {
        let max = 0;
        for (let j = 0; j < step; j++) {
          const val = Math.abs(channelData[i + j] || 0);
          if (val > max) max = val;
        }
        if (max > 0.65) {
          peaks.push(i / sampleRate);
        }
      }

      if (peaks.length < 8) return 126;

      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        const diff = peaks[i] - peaks[i - 1];
        if (diff > 0.35 && diff < 0.85) {
          intervals.push(diff);
        }
      }

      if (intervals.length === 0) return 128;
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let estBpm = Math.round(60 / avgInterval);
      while (estBpm < 85) estBpm *= 2;
      while (estBpm > 175) estBpm = Math.round(estBpm / 2);
      return estBpm;
    } catch (e) {
      return 128;
    }
  }

  // Set trim range
  setTrimRange(startSeconds, endSeconds) {
    this.trimStart = Math.max(0, startSeconds);
    this.trimEnd = Math.max(this.trimStart + 0.5, Math.min(endSeconds, this.duration || 30));
  }

  getTrimDuration() {
    return Math.max(0.5, this.trimEnd - this.trimStart);
  }

  hasAudioLoaded() {
    return !!(this.audioBuffer || (this.audioElement && this.userAudioUrl) || this.isDemoTrack);
  }

  // Play specified trim range
  playTrim(startAt) {
    if (!this.hasAudioLoaded()) return false;
    this.init();
    if (this.isPlaying) this.pause();

    this.isPlaying = true;
    this.playMode = 'trim';

    const trimLen = this.getTrimDuration();
    const offset = (startAt !== undefined) ? (startAt % trimLen) : (this.pauseOffset % trimLen);
    this.pauseOffset = offset;
    const startPoint = this.trimStart + offset;
    const playLength = Math.max(0.1, this.trimEnd - startPoint);

    this.startTime = this.ctx.currentTime - offset;
    this.currentTime = startPoint;

    // If demo track: play rich synthesized vocal song
    if (this.isDemoTrack) {
      this.startSynthTrack();
      return true;
    }

    if (this.userAudioMode === 'element' && this.audioElement) {
      const el = this.audioElement;
      try { el.currentTime = startPoint; } catch (e) {}

      const playP = el.play();
      if (playP && typeof playP.then === 'function') {
        playP.then(() => {
          if (Math.abs(el.currentTime - startPoint) > 0.3) {
            try { el.currentTime = startPoint; } catch (e) {}
          }
        }).catch(e => console.warn('Audio play error:', e));
      }

      el.ontimeupdate = () => {
        if (this.isPlaying && this.playMode === 'trim') {
          if (el.currentTime < this.trimStart - 0.5) {
            try { el.currentTime = this.trimStart; } catch (e) {}
            return;
          }
          if (el.currentTime >= this.trimEnd - 0.1) {
            try { el.currentTime = this.trimStart; } catch (e) {}
          }
        }
      };
    } else if (this.audioBuffer) {
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.analyser);
      this.sourceNode.onended = () => {
        if (this.isPlaying && this.playMode === 'trim' && this.currentTime >= this.trimEnd - 0.25) {
          this.pause();
          this.pauseOffset = 0;
          this.playTrim(0);
        }
      };
      this.sourceNode.start(0, startPoint, playLength);
    }
    return true;
  }

  // Play full song from given second to end
  playFull(startSecond = 0) {
    if (!this.hasAudioLoaded()) return false;
    this.init();
    if (this.isPlaying) this.pause();

    this.isPlaying = true;
    this.playMode = 'full';
    this.fullPlayOffset = Math.max(0, Math.min(startSecond, this.duration - 0.1));
    this.startTime = this.ctx.currentTime;
    this.currentTime = this.fullPlayOffset;

    const playLength = Math.max(0.1, this.duration - this.fullPlayOffset);

    if (this.isDemoTrack) {
      this.startSynthTrack();
      return true;
    }

    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = this.fullPlayOffset; } catch (e) {}
      this.audioElement.play().catch(e => console.warn('Audio play error:', e));
      this.audioElement.ontimeupdate = () => {
        if (this.isPlaying && this.playMode === 'full') {
          if (this.audioElement.currentTime >= this.duration - 0.1) {
            this.stop();
          }
        }
      };
    } else if (this.audioBuffer) {
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.analyser);
      this.sourceNode.onended = () => {
        if (this.isPlaying && this.playMode === 'full') {
          if (this.currentTime >= this.duration - 0.25) {
            this.stop();
          }
        }
      };
      this.sourceNode.start(0, this.fullPlayOffset, playLength);
    }
    return true;
  }

  play() {
    if (!this.hasAudioLoaded()) return false;
    if (this.playMode === 'full') {
      return this.playFull(this.fullPlayOffset);
    } else {
      return this.playTrim();
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.isDemoTrack) {
      this.stopSynthTrack();
      return;
    }

    if (this.playMode === 'full') {
      if (this.userAudioMode === 'element' && this.audioElement) {
        this.fullPlayOffset = this.audioElement.currentTime;
        this.audioElement.pause();
      } else if (this.audioBuffer) {
        const elapsed = this.ctx.currentTime - this.startTime;
        this.fullPlayOffset = Math.min(this.duration, this.fullPlayOffset + elapsed);
      }
    } else {
      const trimLen = this.getTrimDuration();
      if (this.userAudioMode === 'element' && this.audioElement) {
        this.pauseOffset = Math.max(0, this.audioElement.currentTime - this.trimStart) % trimLen;
        this.audioElement.pause();
      } else {
        this.pauseOffset = (this.ctx.currentTime - this.startTime) % trimLen;
      }
    }

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
    this.fullPlayOffset = 0;
    this.currentTime = (this.playMode === 'trim') ? this.trimStart : 0;
    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = this.currentTime; } catch (e) {}
    }
  }

  seekFull(targetSeconds) {
    const sec = Math.max(0, Math.min(targetSeconds, this.duration));
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.fullPlayOffset = sec;
    this.currentTime = sec;
    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = sec; } catch (e) {}
    }
    if (wasPlaying) {
      this.playFull(sec);
    }
  }

  seek(ratio) {
    if (this.playMode === 'full') {
      this.seekFull(ratio * this.duration);
    } else {
      const trimLen = this.getTrimDuration();
      const target = ratio * trimLen;
      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.pause();
      this.pauseOffset = target;
      this.currentTime = this.trimStart + target;
      if (this.userAudioMode === 'element' && this.audioElement) {
        try { this.audioElement.currentTime = this.currentTime; } catch (e) {}
      }
      if (wasPlaying) this.playTrim(target);
    }
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
      if (this.isDemoTrack) {
        const trimLen = this.getTrimDuration();
        const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
        this.currentTime = this.trimStart + elapsed;
      } else if (this.playMode === 'full') {
        if (this.userAudioMode === 'element' && this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
        } else if (this.audioBuffer) {
          const elapsed = this.ctx.currentTime - this.startTime;
          this.currentTime = Math.min(this.duration, this.fullPlayOffset + elapsed);
        } else {
          this.currentTime = (this.ctx.currentTime - this.startTime + this.fullPlayOffset) % this.duration;
        }
      } else {
        if (this.userAudioMode === 'element' && this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
        } else if (this.audioBuffer) {
          const trimLen = this.getTrimDuration();
          const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
          this.currentTime = this.trimStart + elapsed;
        } else {
          const trimLen = this.getTrimDuration();
          const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
          this.currentTime = this.trimStart + elapsed;
        }
      }
    }

    // Frequency spectrum bands
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
    const vocalLoudness = (form1Avg * 0.48 + form2Avg * 0.45 + highAvg * 0.07) * sensitivity;

    // Beat pulse detection (kick thump)
    if (bassAvg > 0.52 && bassAvg > this.beatPulse) {
      this.beatPulse = Math.min(1.0, bassAvg * 1.35);
    } else {
      this.beatPulse *= 0.88; // natural decay
    }

    // Groove level (smooth body sway)
    const targetGroove = (midLowAvg * 0.6 + bassAvg * 0.4);
    this.grooveLevel += (targetGroove - this.grooveLevel) * 0.15;

    // Viseme calculation (A, I, U, E, O)
    const rawA = Math.max(0, form1Avg * 1.3 + form2Avg * 0.5 - 0.15);
    const rawI = Math.max(0, form2Avg * 1.7 - form1Avg * 0.5);
    const rawU = Math.max(0, midLowAvg * 1.25 - form2Avg * 0.75);
    const rawE = Math.max(0, form2Avg * 1.15 + form1Avg * 0.5 - 0.12);
    const rawO = Math.max(0, form1Avg * 1.45 - form2Avg * 0.35);

    const sum = rawA + rawI + rawU + rawE + rawO + 0.001;
    this.visemes.A = (rawA / sum) * vocalLoudness;
    this.visemes.I = (rawI / sum) * vocalLoudness;
    this.visemes.U = (rawU / sum) * vocalLoudness;
    this.visemes.E = (rawE / sum) * vocalLoudness;
    this.visemes.O = (rawO / sum) * vocalLoudness;

    let maxVal = -1;
    let dominant = 'A';
    for (const [char, val] of Object.entries(this.visemes)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = char;
      }
    }
    if (vocalLoudness > 0.06) {
      this.currentChar = dominant;
    }

    const targetOpen = Math.min(1.0, Math.max(0, (vocalLoudness - 0.04) * 1.9));
    this.mouthOpen += (targetOpen - this.mouthOpen) * 0.38;

    let targetWidth = 0.5;
    if (dominant === 'I' || dominant === 'E') targetWidth = 0.85;
    else if (dominant === 'U' || dominant === 'O') targetWidth = 0.35;
    else targetWidth = 0.6;
    this.mouthWidth += (targetWidth - this.mouthWidth) * 0.25;
  }

  // ==========================================
  // Demo Song Synthesizer with Vocal Formants
  // ==========================================
  startSynthTrack() {
    this.stopSynthTrack();

    const bpm = this.bpm || 132;
    const beatInterval = 60 / bpm;
    const sixteenth = beatInterval / 4;

    this.startTime = this.ctx.currentTime - (this.pauseOffset % this.getTrimDuration());

    let step = Math.floor((this.pauseOffset % this.getTrimDuration()) / sixteenth);

    const scheduleNext = () => {
      if (!this.isPlaying) return;

      const time = this.ctx.currentTime + 0.04;
      const currentStep = step % 64;

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

  // Synthesize instruments and organic vocal singing voice
  triggerStepAudio(genre, step, time) {
    if (!this.ctx) return;

    const isKick = (genre === 'lofi') ? (step % 16 === 0 || step % 16 === 10) : (step % 8 === 0);
    const isSnare = (genre === 'lofi') ? (step % 16 === 8) : (step % 16 === 8 || (genre === 'rock' && (step % 8 === 4)));
    const isHiHat = (step % 2 === 0);

    // 1. Kick Drum (Deep punch)
    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
      gain.gain.setValueAtTime(0.75, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.20);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.22);
    }

    // 2. Snare Drum
    if (isSnare) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, time);
      gain.gain.setValueAtTime(0.40, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.18);
    }

    // 3. Hi-Hat
    if (isHiHat) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'highpass';
      osc.frequency.setValueAtTime(8000, time);
      gain.gain.setValueAtTime(0.07, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.05);
    }

    // 4. Accompaniment Chords (Piano / Guitar / Synth)
    const chordScale = [261.63, 329.63, 392.00, 523.25, 440.00];
    if (step % 4 === 0) {
      const chordOsc = this.ctx.createOscillator();
      const chordGain = this.ctx.createGain();
      chordOsc.type = 'sawtooth';
      const chordNote = chordScale[(Math.floor(step / 16)) % chordScale.length];
      chordOsc.frequency.setValueAtTime(chordNote, time);

      // Lowpass filter for smooth warm backing chord
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);

      chordGain.gain.setValueAtTime(0.18, time);
      chordGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      chordOsc.connect(filter);
      filter.connect(chordGain);
      chordGain.connect(this.analyser);
      chordOsc.start(time);
      chordOsc.stop(time + 0.24);
    }

    // 5. LEAD VOCAL SINGING VOICE (with realistic Japanese vowel formants!)
    // Generates genuine singing vocal harmonics that the analyser decodes into realistic visemes
    if (step % 2 === 0 && (step % 8 !== 7)) {
      const melodyNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99];
      const melodyIdx = Math.floor(step / 2) % melodyNotes.length;
      const note = melodyNotes[melodyIdx];

      // Japanese vowel formant frequencies (F1 / F2 in Hz)
      const vowelFormants = [
        { char: 'A', f1: 820, f2: 1300 }, // あ
        { char: 'I', f1: 310, f2: 2350 }, // い
        { char: 'U', f1: 340, f2: 860 },  // う
        { char: 'E', f1: 540, f2: 1980 }, // え
        { char: 'O', f1: 510, f2: 960 }   // お
      ];
      const vowel = vowelFormants[melodyIdx % vowelFormants.length];

      // Sawtooth vocal cord oscillator (rich in vocal harmonics)
      const vocOsc = this.ctx.createOscillator();
      vocOsc.type = 'sawtooth';
      vocOsc.frequency.setValueAtTime(note, time);

      // Formant Filter 1 (F1: Throat cavity)
      const f1Filter = this.ctx.createBiquadFilter();
      f1Filter.type = 'bandpass';
      f1Filter.frequency.setValueAtTime(vowel.f1, time);
      f1Filter.Q.setValueAtTime(4.2, time);

      // Formant Filter 2 (F2: Oral cavity / vowel definition)
      const f2Filter = this.ctx.createBiquadFilter();
      f2Filter.type = 'bandpass';
      f2Filter.frequency.setValueAtTime(vowel.f2, time);
      f2Filter.Q.setValueAtTime(5.5, time);

      const vocGain = this.ctx.createGain();
      vocGain.gain.setValueAtTime(0.36, time);
      vocGain.gain.exponentialRampToValueAtTime(0.015, time + 0.16);

      // Connect vocal chain: Osc -> Parallel Filters -> Gain -> Analyser
      vocOsc.connect(f1Filter);
      vocOsc.connect(f2Filter);
      f1Filter.connect(vocGain);
      f2Filter.connect(vocGain);
      vocGain.connect(this.analyser);

      vocOsc.start(time);
      vocOsc.stop(time + 0.18);
    }
  }
}

window.AudioEngine = AudioEngine;
