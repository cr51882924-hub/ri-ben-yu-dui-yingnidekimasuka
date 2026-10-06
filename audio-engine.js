/**
 * GrooveSync MV - Web Audio & Beat/Viseme Analysis Engine
 * Supports user audio trimming (start point, end point, custom duration)
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
    this.currentTrackId = null;

    this.currentTime = 0;
    this.duration = 0;
    this.startTime = 0;
    this.pauseOffset = 0;

    // Trimming range (which part of song to use for MV)
    this.trimStart = 0;
    this.trimEnd = 0;

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
        error: '選択されたファイルは「画像（写真）」です。人物や楽器の写真は、一番上の【STEP 1: 写真を選択】からアップロードしてください。'
      };
    }

    if (!file || file.size === 0) {
      return {
        success: false,
        error: 'ファイルサイズが0バイトです。iCloud上のファイルの場合は一度端末にダウンロードしてからお試しください。'
      };
    }

    // Helper: read ArrayBuffer safely across browsers/WebViews with 4s timeout
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

    // Helper: decodeAudioData compatible with Promise & Callback with 12s timeout
    const decodeAudioSafe = (ctx, buffer) => {
      return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(new Error('decodeAudioData timeout'));
          }
        }, 12000);

        try {
          const bufCopy = buffer.slice(0);
          const p = ctx.decodeAudioData(
            bufCopy,
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
                reject(err || new Error('decodeAudioData error'));
              }
            }
          );
          if (p && typeof p.then === 'function') {
            p.then((decoded) => {
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
        } catch (e) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            reject(e);
          }
        }
      });
    };

    // Helper: HTML5 Audio/Video fallback (Guaranteed to load, never hangs)
    const loadViaMediaElement = (tag = 'audio') => {
      return new Promise((resolve) => {
        try {
          const url = URL.createObjectURL(file);
          const el = document.createElement(tag);
          el.preload = 'auto';
          el.playsInline = true;

          // Keep in DOM so mobile Safari doesn't detach/pause it
          let host = document.getElementById('hiddenMediaHost');
          if (!host) {
            host = document.createElement('div');
            host.id = 'hiddenMediaHost';
            host.style.cssText = 'position:fixed;width:0;height:0;opacity:0;pointer-events:none;z-index:-999;';
            document.body.appendChild(host);
          }
          host.appendChild(el);

          el.src = url;

          let resolved = false;
          const done = (dur) => {
            if (resolved) return;
            resolved = true;
            clearInterval(poll);
            clearTimeout(timeout);
            resolve({ mediaEl: el, url, duration: dur });
          };

          const check = () => {
            if (el.duration && !isNaN(el.duration) && el.duration > 0 && isFinite(el.duration)) {
              done(el.duration);
            }
          };

          el.addEventListener('loadedmetadata', check);
          el.addEventListener('durationchange', check);
          el.addEventListener('canplay', check);
          el.addEventListener('loadeddata', check);

          // Fast poll every 60ms
          const poll = setInterval(check, 60);

          // If mobile browser delays metadata, resolve anyway with file-size based estimate (never cap to 30s!)
          const timeout = setTimeout(() => {
            const hasDur = (el.duration && !isNaN(el.duration) && el.duration > 0 && isFinite(el.duration));
            const estFromSize = (file && file.size) ? Math.max(180, Math.round(file.size / 16000)) : 240;
            const fallbackDur = hasDur ? el.duration : estFromSize;
            done(fallbackDur);
          }, 6000);

          el.load();
        } catch (err) {
          console.warn('loadViaMediaElement exception:', err);
          resolve(null);
        }
      });
    };

    let loaded = false;

    // Layer 1: Try Web Audio decode (fast & best for waveform splicing)
    try {
      const arrayBuffer = await getArrayBuffer();
      if (arrayBuffer && arrayBuffer.byteLength > 0) {
        const decoded = await decodeAudioSafe(this.ctx, arrayBuffer);
        if (decoded && decoded.duration > 0) {
          this.audioBuffer = decoded;
          this.duration = decoded.duration;
          this.userAudioMode = 'buffer';
          loaded = true;
        }
      }
    } catch (decodeErr) {
      console.warn('Web Audio decode skipped, falling back to media element:', decodeErr);
    }

    // Layer 2: Fallback to HTMLMediaElement (Never fails on iOS/Android)
    if (!loaded) {
      const res = (await loadViaMediaElement('audio')) || (await loadViaMediaElement('video'));
      if (res && res.mediaEl) {
        this.audioElement = res.mediaEl;
        this.userAudioUrl = res.url;
        this.duration = res.duration || 30;
        this.userAudioMode = 'element';

        // Listen for late duration updates from browser
        this.audioElement.addEventListener('durationchange', () => {
          if (this.audioElement.duration && !isNaN(this.audioElement.duration) && this.audioElement.duration > 0) {
            this.duration = this.audioElement.duration;
            if (typeof window.onAudioDurationResolved === 'function') {
              window.onAudioDurationResolved(this.duration);
            }
          }
        });

        // Safely connect to Web Audio analyser if browser permits
        try {
          if (this.mediaElementSource) {
            try { this.mediaElementSource.disconnect(); } catch (e) {}
            this.mediaElementSource = null;
          }
          this.mediaElementSource = this.ctx.createMediaElementSource(this.audioElement);
          this.mediaElementSource.connect(this.analyser);
        } catch (mediaSrcErr) {
          console.warn('createMediaElementSource skipped (using native audio output):', mediaSrcErr);
          // Even if createMediaElementSource fails, audioElement plays audio directly through speaker!
        }
        loaded = true;
      }
    }

    if (!loaded) {
      return {
        success: false,
        error: 'ファイルの読み込みに失敗しました。ファイルが端末内に保存されているかご確認ください。'
      };
    }

    this.currentTrackId = 'custom';
    this.bpm = 120;
    this.trimStart = 0;
    this.trimEnd = Math.min(this.duration, 30);
    this.pauseOffset = 0;
    this.fullPlayOffset = 0;
    this.currentTime = 0;
    this.playMode = 'full'; // Default to full mode on upload so user can check entire song

    return {
      success: true,
      name: file.name,
      duration: this.duration,
      trimStart: this.trimStart,
      trimEnd: this.trimEnd
    };
  }

  // Set trimming range (start second, end second)
  setTrimRange(start, end) {
    this.trimStart = Math.max(0, Math.min(start, this.duration - 0.5));
    this.trimEnd = Math.max(this.trimStart + 0.5, Math.min(end, this.duration));
    if (this.isPlaying && this.playMode === 'trim') {
      this.pause();
      this.pauseOffset = 0;
      this.playTrim(0);
    }
  }

  getTrimDuration() {
    return Math.max(0.5, this.trimEnd - this.trimStart);
  }

  // Select built-in demo track
  selectDemoTrack(id) {
    this.stop();
    this.currentTrackId = id;
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
    this.trimStart = 0;
    this.playMode = 'trim';
    if (id === 'jpop') {
      this.bpm = 132;
      this.duration = 30;
      this.trimEnd = 30;
    } else if (id === 'lofi') {
      this.bpm = 88;
      this.duration = 30;
      this.trimEnd = 30;
    } else if (id === 'rock') {
      this.bpm = 148;
      this.duration = 30;
      this.trimEnd = 30;
    } else if (id === 'cyber') {
      this.bpm = 128;
      this.duration = 30;
      this.trimEnd = 30;
    }
  }

  hasAudioLoaded() {
    return !!(this.audioBuffer || (this.audioElement && this.userAudioUrl));
  }

  // Play specified trim range (loops inside the trim range)
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

    if (this.userAudioMode === 'element' && this.audioElement) {
      const el = this.audioElement;

      // 1. Initial seek attempt before play
      try { el.currentTime = startPoint; } catch (e) {}

      // 2. Play promise with immediate re-seek check
      const playP = el.play();
      if (playP && typeof playP.then === 'function') {
        playP.then(() => {
          if (Math.abs(el.currentTime - startPoint) > 0.3) {
            try { el.currentTime = startPoint; } catch (e) {}
          }
        }).catch(e => console.warn('Audio play error:', e));
      }

      // 3. WebKit official playing event seek reinforcement
      const onPlaying = () => {
        if (this.isPlaying && this.playMode === 'trim') {
          if (Math.abs(el.currentTime - startPoint) > 0.3) {
            try { el.currentTime = startPoint; } catch (e) {}
          }
        }
      };
      el.addEventListener('playing', onPlaying, { once: true });

      // 4. Timeupdate loop constraint (guards against accidental 0s jump in Safari)
      el.ontimeupdate = () => {
        if (this.isPlaying && this.playMode === 'trim') {
          // If iOS Safari reset playback to 0, immediately snap back to trimStart!
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

  // Play the FULL song from a given second to the end (for finding chorus / checking seconds)
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

  // Standard play defaults to trim mode or continues current mode
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
      if (this.playMode === 'full') {
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

    const targetOpen = Math.min(1.0, Math.max(0, (vocalLoudness - 0.05) * 1.8));
    this.mouthOpen += (targetOpen - this.mouthOpen) * 0.35;

    let targetWidth = 0.5;
    if (dominant === 'I' || dominant === 'E') targetWidth = 0.85;
    else if (dominant === 'U' || dominant === 'O') targetWidth = 0.35;
    else targetWidth = 0.6;
    this.mouthWidth += (targetWidth - this.mouthWidth) * 0.25;
  }

  startSynthTrack() {
    this.stopSynthTrack();

    const bpm = this.bpm;
    const beatInterval = 60 / bpm;
    const sixteenth = beatInterval / 4;

    let step = Math.floor((this.pauseOffset % this.duration) / sixteenth);

    const scheduleNext = () => {
      if (!this.isPlaying) return;

      const time = this.ctx.currentTime + 0.05;
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

  triggerStepAudio(genre, step, time) {
    if (!this.ctx) return;

    const isKick = (genre === 'lofi') ? (step % 16 === 0 || step % 16 === 10) : (step % 8 === 0);
    const isSnare = (genre === 'lofi') ? (step % 16 === 8) : (step % 16 === 8 || (genre === 'rock' && (step % 8 === 4)));
    const isHiHat = (step % 2 === 0);

    // Kick
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

    // Snare
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

    // HiHat
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

    // Melody & Chords
    if (genre === 'jpop') {
      const chordScale = [261.63, 329.63, 392.00, 523.25, 440.00];
      if (step % 4 === 0) {
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
      if (step % 2 === 0) {
        const gOsc = this.ctx.createOscillator();
        const gGain = this.ctx.createGain();
        gOsc.type = 'sawtooth';
        const rockChords = [110, 146.83, 164.81, 130.81];
        const chord = rockChords[Math.floor(step / 16) % rockChords.length];
        gOsc.frequency.setValueAtTime(chord * (step % 4 === 0 ? 1 : 1.5), time);
        gGain.gain.setValueAtTime(0.3, time);
        gGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
        gOsc.connect(gGain);
        gGain.connect(this.analyser);
        gOsc.start(time);
        gOsc.stop(time + 0.15);
      }
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
