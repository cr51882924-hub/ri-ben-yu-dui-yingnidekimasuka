/**
 * Audio Trimmer & Cutter Engine
 * Standalone tool for trimming audio tracks and downloading the sliced audio.
 * Supports WAV (16-bit PCM lossless) and MP3 (lamejs 192kbps) encoding.
 */

(function () {
  'use strict';

  // State
  let audioCtx = null;
  let rawAudioBuffer = null;
  let originalFile = null;
  let originalExtension = 'mp3';
  let isDemoTrack = false;

  let totalDuration = 30;
  let trimStart = 0;
  let trimDuration = 30;
  let trimEnd = 30;

  // Playback states
  let isPlayingFull = false;
  let isPlayingTrim = false;
  let currentSourceNode = null;
  let playbackStartTime = 0;
  let playbackStartOffset = 0;
  let animFrameId = null;

  // DOM Elements
  const fileInput = document.getElementById('audioFileInput');
  const uploadCard = document.getElementById('audioUploadCard');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const fileLoadedBanner = document.getElementById('fileLoadedBanner');
  const loadedFileName = document.getElementById('loadedFileName');
  const loadedFileMeta = document.getElementById('loadedFileMeta');

  // Full Player DOM
  const fullPlayerCurrentTime = document.getElementById('fullPlayerCurrentTime');
  const fullPlayerTotalTime = document.getElementById('fullPlayerTotalTime');
  const fullPlayerStatusBadge = document.getElementById('fullPlayerStatusBadge');
  const fullPlayToggleBtn = document.getElementById('fullPlayToggleBtn');
  const fullPlayIcon = document.getElementById('fullPlayIcon');
  const fullPlayLabel = document.getElementById('fullPlayLabel');
  const fullPlayRewindBtn = document.getElementById('fullPlayRewindBtn');
  const setStartFromCurrentBtn = document.getElementById('setStartFromCurrentBtn');
  const setEndFromCurrentBtn = document.getElementById('setEndFromCurrentBtn');
  const fullSongSeekSlider = document.getElementById('fullSongSeekSlider');
  const timelineSelectionRange = document.getElementById('timelineSelectionRange');
  const timelinePlayhead = document.getElementById('timelinePlayhead');
  const timelineMidLabel = document.getElementById('timelineMidLabel');
  const timelineEndLabel = document.getElementById('timelineEndLabel');

  // Status displays
  const trimStartReadout = document.getElementById('trimStartReadout');
  const trimEndReadout = document.getElementById('trimEndReadout');
  const trimDurationReadout = document.getElementById('trimDurationReadout');

  // Trimmer controls
  const startPosBadge = document.getElementById('startPosBadge');
  const trimStartMinInput = document.getElementById('trimStartMinInput');
  const trimStartSecInput = document.getElementById('trimStartSecInput');
  const trimStartSlider = document.getElementById('trimStartSlider');

  const startMinus10Btn = document.getElementById('startMinus10Btn');
  const startMinus1Btn = document.getElementById('startMinus1Btn');
  const startPlus1Btn = document.getElementById('startPlus1Btn');
  const startPlus10Btn = document.getElementById('startPlus10Btn');

  const durationBadge = document.getElementById('durationBadge');
  const trimDurationInput = document.getElementById('trimDurationInput');
  const trimDurationSlider = document.getElementById('trimDurationSlider');
  const durMinus5Btn = document.getElementById('durMinus5Btn');
  const durPlus5Btn = document.getElementById('durPlus5Btn');
  const presetChips = document.querySelectorAll('.trim-preset-chip');

  // Preview & Confirm
  const confirmStartTxt = document.getElementById('confirmStartTxt');
  const confirmEndTxt = document.getElementById('confirmEndTxt');
  const confirmDurTxt = document.getElementById('confirmDurTxt');
  const previewTrimBtn = document.getElementById('previewTrimBtn');
  const previewTrimIcon = document.getElementById('previewTrimIcon');
  const previewTrimLabel = document.getElementById('previewTrimLabel');

  // Download section
  const formatRadios = document.querySelectorAll('input[name="exportFormat"]');
  const formatOriginalExtBadge = document.getElementById('formatOriginalExtBadge');
  const downloadBtn = document.getElementById('downloadTrimmedBtn');
  const downloadProgressBox = document.getElementById('downloadProgressBox');
  const downloadProgressBar = document.getElementById('downloadProgressBar');
  const downloadProgressText = document.getElementById('downloadProgressText');
  const toastEl = document.getElementById('toast');

  // Audio Complete Modal Elements
  const audioCompleteModal = document.getElementById('audioCompleteModal');
  const closeAudioModalBtn = document.getElementById('closeAudioModalBtn');
  const closeAudioModalBottomBtn = document.getElementById('closeAudioModalBottomBtn');
  const modalAudioFileName = document.getElementById('modalAudioFileName');
  const modalAudioFormatBadge = document.getElementById('modalAudioFormatBadge');
  const modalAudioMeta = document.getElementById('modalAudioMeta');
  const modalAudioPreview = document.getElementById('modalAudioPreview');
  const audioShareBtn = document.getElementById('audioShareBtn');
  const audioDirectDownloadBtn = document.getElementById('audioDirectDownloadBtn');
  const lyricsDirectDownloadBtn = document.getElementById('lyricsDirectDownloadBtn');
  const copyLyricsBtn = document.getElementById('copyLyricsBtn');
  const modalLyricsCard = document.getElementById('modalLyricsCard');
  const modalLyricsPreview = document.getElementById('modalLyricsPreview');
  const modalAudioDownloadLink = document.getElementById('modalAudioDownloadLink');

  let lastCutBlob = null;
  let lastCutFile = null;
  let lastCutFilename = '';
  let lastCutUrl = null;

  let lastCutLyricsBlob = null;
  let lastCutLyricsFile = null;
  let lastCutLyricsFilename = '';
  let lastCutLyricsText = '';

  // Helper: Format seconds to MM:SS
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }

  // Toast notification
  let toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }

  // Init AudioContext
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Stop all playing audio
  function stopAllAudio() {
    if (currentSourceNode) {
      try {
        currentSourceNode.stop();
        currentSourceNode.disconnect();
      } catch (e) {}
      currentSourceNode = null;
    }
    isPlayingFull = false;
    isPlayingTrim = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    updateFullPlayerButtonUI();
    updateTrimPreviewButtonUI();
  }

  // Update Trim UI & Clamping
  function updateTrimmerUI() {
    // Clamp start
    trimStart = Math.max(0, Math.min(trimStart, Math.max(0, totalDuration - 1)));

    // Clamp duration
    const maxDur = Math.max(1, totalDuration - trimStart);
    trimDuration = Math.max(1, Math.min(trimDuration, maxDur));
    trimEnd = Math.min(totalDuration, trimStart + trimDuration);

    // Update Status Readouts
    if (trimStartReadout) trimStartReadout.textContent = formatTime(trimStart);
    if (trimEndReadout) trimEndReadout.textContent = formatTime(trimEnd);
    if (trimDurationReadout) trimDurationReadout.textContent = `${Math.round(trimDuration)}秒間`;

    if (confirmStartTxt) confirmStartTxt.textContent = formatTime(trimStart);
    if (confirmEndTxt) confirmEndTxt.textContent = formatTime(trimEnd);
    if (confirmDurTxt) confirmDurTxt.textContent = `${Math.round(trimDuration)}秒間`;

    // Direct Inputs
    const m = Math.floor(trimStart / 60);
    const s = Math.floor(trimStart % 60);
    if (trimStartMinInput && document.activeElement !== trimStartMinInput) trimStartMinInput.value = m;
    if (trimStartSecInput && document.activeElement !== trimStartSecInput) trimStartSecInput.value = s;
    if (trimStartSlider && document.activeElement !== trimStartSlider) {
      trimStartSlider.max = Math.max(1, Math.floor(totalDuration));
      trimStartSlider.value = Math.floor(trimStart);
    }
    if (startPosBadge) startPosBadge.textContent = `${formatTime(trimStart)} からスタート`;

    if (trimDurationInput && document.activeElement !== trimDurationInput) {
      trimDurationInput.max = Math.max(1, Math.floor(maxDur));
      trimDurationInput.value = Math.round(trimDuration);
    }
    if (trimDurationSlider && document.activeElement !== trimDurationSlider) {
      trimDurationSlider.max = Math.max(1, Math.floor(maxDur));
      trimDurationSlider.value = Math.round(trimDuration);
    }
    if (durationBadge) durationBadge.textContent = `${Math.round(trimDuration)}秒間`;

    // Presets Active styling
    presetChips.forEach(chip => {
      const d = chip.getAttribute('data-dur');
      if (d === 'full') {
        chip.classList.toggle('active', Math.abs(trimEnd - totalDuration) < 0.5);
      } else {
        chip.classList.toggle('active', Math.abs(trimDuration - Number(d)) < 0.5);
      }
    });

    // Update visual range in timeline track
    if (timelineSelectionRange && totalDuration > 0) {
      const leftPct = (trimStart / totalDuration) * 100;
      const widthPct = (trimDuration / totalDuration) * 100;
      timelineSelectionRange.style.left = `${leftPct}%`;
      timelineSelectionRange.style.width = `${Math.min(100 - leftPct, widthPct)}%`;
    }
  }

  // Full Song Playback
  function playFullSong(fromSeconds = 0) {
    if (!rawAudioBuffer) return;
    const ctx = getAudioContext();
    stopAllAudio();

    const startSec = Math.max(0, Math.min(fromSeconds, totalDuration - 0.2));
    const src = ctx.createBufferSource();
    src.buffer = rawAudioBuffer;
    src.connect(ctx.destination);

    playbackStartTime = ctx.currentTime;
    playbackStartOffset = startSec;
    currentSourceNode = src;
    isPlayingFull = true;

    src.onended = () => {
      if (isPlayingFull) {
        stopAllAudio();
        updateTimelinePlayhead(0);
      }
    };

    src.start(0, startSec);
    updateFullPlayerButtonUI();
    monitorPlaybackProgress();
  }

  // Trimmed Preview Playback (Looping within cut region)
  function playTrimPreview() {
    if (!rawAudioBuffer) return;
    const ctx = getAudioContext();
    stopAllAudio();

    const src = ctx.createBufferSource();
    src.buffer = rawAudioBuffer;
    src.connect(ctx.destination);

    playbackStartTime = ctx.currentTime;
    playbackStartOffset = trimStart;
    currentSourceNode = src;
    isPlayingTrim = true;

    src.onended = () => {
      if (isPlayingTrim) {
        // Loop trim preview smoothly
        playTrimPreview();
      }
    };

    src.start(0, trimStart, trimDuration);
    updateTrimPreviewButtonUI();
    monitorPlaybackProgress();
  }

  // Monitor progress for timeline playhead
  function monitorPlaybackProgress() {
    if (!isPlayingFull && !isPlayingTrim) return;
    const ctx = getAudioContext();
    const elapsed = ctx.currentTime - playbackStartTime;
    const currentPos = playbackStartOffset + elapsed;

    if (isPlayingTrim && currentPos >= trimEnd) {
      // Loop
      playTrimPreview();
      return;
    }

    if (currentPos >= totalDuration) {
      stopAllAudio();
      updateTimelinePlayhead(0);
      return;
    }

    updateTimelinePlayhead(currentPos);
    animFrameId = requestAnimationFrame(monitorPlaybackProgress);
  }

  function updateTimelinePlayhead(sec) {
    if (fullPlayerCurrentTime) fullPlayerCurrentTime.textContent = formatTime(sec);
    if (fullSongSeekSlider && document.activeElement !== fullSongSeekSlider) {
      fullSongSeekSlider.value = sec;
    }
    if (timelinePlayhead && totalDuration > 0) {
      const pct = (sec / totalDuration) * 100;
      timelinePlayhead.style.left = `${Math.min(100, Math.max(0, pct))}%`;
    }
  }

  function updateFullPlayerButtonUI() {
    if (isPlayingFull) {
      if (fullPlayIcon) fullPlayIcon.textContent = '⏸';
      if (fullPlayLabel) fullPlayLabel.textContent = '一時停止';
      if (fullPlayToggleBtn) fullPlayToggleBtn.classList.add('playing');
      if (fullPlayerStatusBadge) {
        fullPlayerStatusBadge.textContent = '🎵 再生中';
        fullPlayerStatusBadge.className = 'player-status-badge active';
      }
    } else {
      if (fullPlayIcon) fullPlayIcon.textContent = '▶';
      if (fullPlayLabel) fullPlayLabel.textContent = '曲全体を再生する';
      if (fullPlayToggleBtn) fullPlayToggleBtn.classList.remove('playing');
      if (fullPlayerStatusBadge) {
        fullPlayerStatusBadge.textContent = '一時停止中';
        fullPlayerStatusBadge.className = 'player-status-badge';
      }
    }
  }

  function updateTrimPreviewButtonUI() {
    if (isPlayingTrim) {
      if (previewTrimIcon) previewTrimIcon.textContent = '⏸';
      if (previewTrimLabel) previewTrimLabel.textContent = '試聴を一時停止';
      if (previewTrimBtn) previewTrimBtn.classList.add('playing');
    } else {
      if (previewTrimIcon) previewTrimIcon.textContent = '▶';
      if (previewTrimLabel) previewTrimLabel.textContent = 'この区間（サビ）だけを試聴する';
      if (previewTrimBtn) previewTrimBtn.classList.remove('playing');
    }
  }

  // Load and decode user file
  async function handleAudioFile(file) {
    if (!file) return;

    if (file.type && file.type.startsWith('image/')) {
      alert('選択されたファイルは「画像」です。音楽ファイル（MP3, WAV, M4A等）を選択してください。');
      return;
    }

    const ctx = getAudioContext();
    stopAllAudio();

    originalFile = file;
    isDemoTrack = false;

    // Detect extension
    const parts = file.name.split('.');
    originalExtension = parts.length > 1 ? parts.pop().toLowerCase() : 'mp3';
    if (formatOriginalExtBadge) {
      formatOriginalExtBadge.textContent = `.${originalExtension}`;
    }

    showToast(`音声ファイル「${file.name}」を読み込み中...`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      rawAudioBuffer = decoded;
      totalDuration = decoded.duration;

      // Reset trimming defaults
      trimStart = 0;
      trimDuration = Math.min(30, totalDuration);
      trimEnd = trimDuration;

      // Update UI
      if (loadedFileName) loadedFileName.textContent = file.name;
      if (loadedFileMeta) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        loadedFileMeta.textContent = `形式: .${originalExtension.toUpperCase()} | 全長: ${formatTime(totalDuration)} | 容量: ${mb}MB | ${decoded.sampleRate}Hz`;
      }
      if (fileLoadedBanner) fileLoadedBanner.classList.remove('hidden');
      if (fullPlayerTotalTime) fullPlayerTotalTime.textContent = formatTime(totalDuration);
      if (timelineEndLabel) timelineEndLabel.textContent = `${formatTime(totalDuration)} (曲の終わり)`;
      if (timelineMidLabel) timelineMidLabel.textContent = formatTime(totalDuration / 2);

      if (fullSongSeekSlider) {
        fullSongSeekSlider.max = Math.floor(totalDuration);
        fullSongSeekSlider.value = 0;
      }

      updateTrimmerUI();
      updateTimelinePlayhead(0);
      showToast('✔ 音声の読み込みが完了しました！');
    } catch (err) {
      console.error('Audio decode failed:', err);
      alert('音声の読み込みに失敗しました。MP3やWAV形式のファイルをお試しください。');
    }
  }

  // Generate Synthesized Demo Track if user has no file
  async function loadDemoSong() {
    const ctx = getAudioContext();
    stopAllAudio();

    originalFile = null;
    originalExtension = 'mp3';
    isDemoTrack = true;

    showToast('公式デモ曲（Shining Beat - J-POP）を生成中...');

    // Synthesize a 30-second groovy demo buffer
    const sampleRate = ctx.sampleRate;
    const dur = 32;
    const buffer = ctx.createBuffer(2, sampleRate * dur, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = 132;
    const beatSec = 60 / bpm;

    // Rich synth music track generator
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sampleL = 0;
      let sampleR = 0;

      // Kick drum on every beat
      const beatProgress = (t % beatSec) / beatSec;
      const kickEnv = Math.max(0, 1 - beatProgress * 5);
      const kick = Math.sin(2 * Math.PI * (130 - beatProgress * 95) * t) * kickEnv * 0.45;

      // Snare on 2nd and 4th beats
      const barProgress = (t % (beatSec * 4)) / beatSec;
      let snare = 0;
      if ((barProgress >= 1 && barProgress < 2) || (barProgress >= 3 && barProgress < 4)) {
        const snareProg = barProgress % 1;
        const snareEnv = Math.max(0, 1 - snareProg * 6);
        const noise = (Math.random() * 2 - 1) * 0.28;
        const tone = Math.sin(2 * Math.PI * 180 * t) * 0.2;
        snare = (noise + tone) * snareEnv;
      }

      // Melodic synth chord
      const chordIndex = Math.floor(t / (beatSec * 4)) % 4;
      const chords = [
        [261.63, 329.63, 392.00], // C
        [220.00, 261.63, 329.63], // Am
        [174.61, 220.00, 261.63], // F
        [196.00, 246.94, 293.66]  // G
      ];
      const curChord = chords[chordIndex];
      let synth = 0;
      curChord.forEach(freq => {
        synth += Math.sin(2 * Math.PI * freq * t) * 0.08;
      });

      // Vocal lead tone
      const vocalMelody = [523.25, 587.33, 659.25, 587.33, 523.25, 440.00, 493.88, 523.25];
      const vocalNote = vocalMelody[Math.floor(t / beatSec) % vocalMelody.length];
      const vocal = Math.sin(2 * Math.PI * vocalNote * t) * 0.12 * (1 + Math.sin(t * 12) * 0.15);

      sampleL = kick + snare * 0.8 + synth + vocal * 0.9;
      sampleR = kick + snare * 0.8 + synth * 0.9 + vocal * 1.1;

      // Master limiter
      left[i] = Math.max(-0.95, Math.min(0.95, sampleL));
      right[i] = Math.max(-0.95, Math.min(0.95, sampleR));
    }

    rawAudioBuffer = buffer;
    totalDuration = dur;

    trimStart = 0;
    trimDuration = 30;
    trimEnd = 30;

    if (loadedFileName) loadedFileName.textContent = '🌟 公式デモ曲 - Shining Beat (J-POP 132BPM)';
    if (loadedFileMeta) loadedFileMeta.textContent = '形式: .MP3 (デモ音源) | 全長: 00:32 | 44.1kHz Stereo';
    if (fileLoadedBanner) fileLoadedBanner.classList.remove('hidden');
    if (fullPlayerTotalTime) fullPlayerTotalTime.textContent = formatTime(totalDuration);
    if (timelineEndLabel) timelineEndLabel.textContent = `${formatTime(totalDuration)} (曲の終わり)`;
    if (timelineMidLabel) timelineMidLabel.textContent = formatTime(totalDuration / 2);

    if (fullSongSeekSlider) {
      fullSongSeekSlider.max = Math.floor(totalDuration);
      fullSongSeekSlider.value = 0;
    }

    updateTrimmerUI();
    updateTimelinePlayhead(0);
    showToast('✔ 公式デモ曲をセットしました！');
  }

  // ==========================================
  // Audio Trimming & Encoding Logic
  // ==========================================

  // Slice AudioBuffer
  function sliceAudioBuffer(sourceBuffer, startSec, endSec) {
    const ctx = getAudioContext();
    const sampleRate = sourceBuffer.sampleRate;
    const numChannels = sourceBuffer.numberOfChannels;

    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(sourceBuffer.length, Math.floor(endSec * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);

    const slicedBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let c = 0; c < numChannels; c++) {
      const srcChannel = sourceBuffer.getChannelData(c);
      const sub = srcChannel.subarray(startSample, endSample);
      slicedBuffer.getChannelData(c).set(sub);
    }

    return slicedBuffer;
  }

  // Pure JS WAV Encoder (16-bit PCM RIFF)
  function encodeWAV(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const length = buffer.length;
    const dataByteLength = length * blockAlign;
    const headerByteLength = 44;
    const totalLength = headerByteLength + dataByteLength;

    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    /* RIFF chunk descriptor */
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeString(8, 'WAVE');

    /* fmt sub-chunk */
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    /* data sub-chunk */
    writeString(36, 'data');
    view.setUint32(40, dataByteLength, true);

    // Channel pointers
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        // Clip
        sample = Math.max(-1, Math.min(1, sample));
        // Convert float32 to int16
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Pure JS MP3 Encoder using lamejs (192kbps)
  function encodeMP3(buffer, onProgress) {
    if (typeof lamejs === 'undefined') {
      console.warn('lamejs not available, falling back to WAV');
      return encodeWAV(buffer);
    }

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 192; // High quality 192 kbps MP3

    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    const sampleBlockSize = 1152;
    const length = buffer.length;

    // Convert Float32Array to Int16Array
    const leftRaw = buffer.getChannelData(0);
    const rightRaw = channels > 1 ? buffer.getChannelData(1) : leftRaw;

    const leftInt16 = new Int16Array(length);
    const rightInt16 = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      const l = Math.max(-1, Math.min(1, leftRaw[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;

      const r = Math.max(-1, Math.min(1, rightRaw[i]));
      rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }

    for (let i = 0; i < length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      let mp3buf;
      if (channels === 1) {
        mp3buf = mp3encoder.encodeBuffer(leftChunk);
      } else {
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      }
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }

      if (onProgress && i % (sampleBlockSize * 15) === 0) {
        const pct = Math.round((i / length) * 100);
        onProgress(pct);
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    // Standard RFC MIME type for MP3 is audio/mpeg
    return new Blob(mp3Data, { type: 'audio/mpeg' });
  }

  // Open Audio Complete Modal with preview player and iPhone share actions
  function openAudioModal(blob, file, filename, targetExt) {
    if (!audioCompleteModal) return;
    stopAllAudio();

    lastCutBlob = blob;
    lastCutFile = file;
    lastCutFilename = filename;

    if (lastCutUrl) {
      try { URL.revokeObjectURL(lastCutUrl); } catch (e) {}
    }
    lastCutUrl = URL.createObjectURL(blob);

    if (modalAudioFileName) modalAudioFileName.textContent = filename;
    if (modalAudioFormatBadge) modalAudioFormatBadge.textContent = targetExt.toUpperCase();
    if (modalAudioMeta) {
      const kb = (blob.size / 1024).toFixed(1);
      modalAudioMeta.textContent = `区間: ${formatTime(trimStart)} 〜 ${formatTime(trimEnd)} (${Math.round(trimDuration)}秒間) | 容量: ${kb} KB`;
    }

    if (modalAudioPreview) {
      modalAudioPreview.src = lastCutUrl;
      modalAudioPreview.load();
    }

    if (modalAudioDownloadLink) {
      modalAudioDownloadLink.href = lastCutUrl;
      modalAudioDownloadLink.download = filename;
    }

    audioCompleteModal.classList.remove('hidden');
    audioCompleteModal.classList.add('visible');
  }

  function closeAudioModal() {
    if (!audioCompleteModal) return;
    if (modalAudioPreview) {
      try { modalAudioPreview.pause(); } catch (e) {}
    }
    audioCompleteModal.classList.remove('visible');
    audioCompleteModal.classList.add('hidden');
  }

  // Trigger file download helper (with safe lifetime for iOS/WebKit)
  function triggerDownloadDirect(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (e) {}
      }, 1000);
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 60000);
    } catch (e) {
      console.warn('triggerDownloadDirect failed:', e);
    }
  }

  // Main Download Handler
  async function handleDownload() {
    if (!rawAudioBuffer) {
      showToast('🌟 公式デモ曲を自動ロード中...');
      await loadDemoSong();
    }

    if (!rawAudioBuffer) {
      alert('先に音楽ファイルをアップロードするか、デモ曲を選択してください。');
      return;
    }

    // Determine chosen format
    let chosenFormat = 'original';
    formatRadios.forEach(r => {
      if (r.checked) chosenFormat = r.value;
    });

    let targetExt = 'mp3';
    if (chosenFormat === 'original') {
      targetExt = (originalExtension === 'wav') ? 'wav' : 'mp3';
    } else if (chosenFormat === 'wav') {
      targetExt = 'wav';
    } else {
      targetExt = 'mp3';
    }

    // Generate output file name
    const rawName = originalFile ? originalFile.name.replace(/\.[^/.]+$/, "") : (isDemoTrack ? 'Shining_Beat' : 'audio_cut');
    const startTag = formatTime(trimStart).replace(':', 'm') + 's';
    const endTag = formatTime(trimEnd).replace(':', 'm') + 's';
    const outputFilename = `${rawName}_cut_${startTag}-${endTag}.${targetExt}`;

    // Show Progress
    if (downloadProgressBox) downloadProgressBox.classList.remove('hidden');
    if (downloadProgressBar) downloadProgressBar.style.width = '15%';
    if (downloadProgressText) downloadProgressText.textContent = '区間データを切り出し中...';
    if (downloadBtn) downloadBtn.disabled = true;

    // Small delay to allow UI render
    await new Promise(r => setTimeout(r, 60));

    try {
      // 1. Slice buffer
      const sliced = sliceAudioBuffer(rawAudioBuffer, trimStart, trimEnd);
      if (downloadProgressBar) downloadProgressBar.style.width = '45%';
      if (downloadProgressText) downloadProgressText.textContent = `${targetExt.toUpperCase()} 形式へエンコード中...`;
      await new Promise(r => setTimeout(r, 60));

      let blob = null;
      const mime = (targetExt === 'wav') ? 'audio/wav' : 'audio/mpeg';

      if (targetExt === 'wav') {
        blob = encodeWAV(sliced);
        if (downloadProgressBar) downloadProgressBar.style.width = '95%';
      } else {
        blob = encodeMP3(sliced, (pct) => {
          if (downloadProgressBar) downloadProgressBar.style.width = `${45 + Math.floor(pct * 0.5)}%`;
        });
      }

      if (downloadProgressBar) downloadProgressBar.style.width = '100%';
      if (downloadProgressText) downloadProgressText.textContent = 'ダウンロード準備完了！';

      const file = new File([blob], outputFilename, { type: mime });

      // Open Audio Complete Modal with audio player and iPhone/Android save options
      openAudioModal(blob, file, outputFilename, targetExt);
      showToast(`✂️ 「${outputFilename}」を切り出しました！`);

      // On PC / Desktop browsers, also trigger immediate download
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        triggerDownloadDirect(blob, outputFilename);
      }

      setTimeout(() => {
        if (downloadProgressBox) downloadProgressBox.classList.add('hidden');
        if (downloadBtn) downloadBtn.disabled = false;
      }, 1000);

    } catch (e) {
      console.error('Download error:', e);
      alert('音声の切り出し・エンコード中にエラーが発生しました: ' + e.message);
      if (downloadProgressBox) downloadProgressBox.classList.add('hidden');
      if (downloadBtn) downloadBtn.disabled = false;
    }
  }

  // ==========================================
  // Event Listeners Setup
  // ==========================================
  function setupEventListeners() {
    // File upload
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleAudioFile(e.target.files[0]);
        }
      });
    }

    // Demo song
    if (loadDemoBtn) {
      loadDemoBtn.addEventListener('click', () => {
        loadDemoSong();
      });
    }

    // Drag & Drop
    if (uploadCard) {
      ['dragenter', 'dragover'].forEach(eventName => {
        uploadCard.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadCard.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(eventName => {
        uploadCard.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadCard.classList.remove('dragover');
        });
      });
      uploadCard.addEventListener('drop', (e) => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files[0]) {
          handleAudioFile(files[0]);
        }
      });
    }

    // Full Player controls
    if (fullPlayToggleBtn) {
      fullPlayToggleBtn.addEventListener('click', () => {
        if (isPlayingFull) {
          stopAllAudio();
        } else {
          const seekVal = fullSongSeekSlider ? Number(fullSongSeekSlider.value) : 0;
          playFullSong(seekVal);
        }
      });
    }

    if (fullPlayRewindBtn) {
      fullPlayRewindBtn.addEventListener('click', () => {
        stopAllAudio();
        updateTimelinePlayhead(0);
        playFullSong(0);
      });
    }

    // Set Start / End from current playback position
    if (setStartFromCurrentBtn) {
      setStartFromCurrentBtn.addEventListener('click', () => {
        const curSec = fullSongSeekSlider ? Number(fullSongSeekSlider.value) : 0;
        trimStart = curSec;
        updateTrimmerUI();
        showToast(`開始位置を「${formatTime(trimStart)}」にセットしました！`);
      });
    }

    if (setEndFromCurrentBtn) {
      setEndFromCurrentBtn.addEventListener('click', () => {
        const curSec = fullSongSeekSlider ? Number(fullSongSeekSlider.value) : totalDuration;
        if (curSec > trimStart) {
          trimDuration = curSec - trimStart;
          updateTrimmerUI();
          showToast(`終了位置を「${formatTime(trimEnd)}」にセットしました！`);
        } else {
          showToast('終了位置は開始位置より後ろを指定してください');
        }
      });
    }

    // Timeline Seek Slider
    if (fullSongSeekSlider) {
      fullSongSeekSlider.addEventListener('input', (e) => {
        const sec = Number(e.target.value);
        updateTimelinePlayhead(sec);
        if (isPlayingFull) {
          playFullSong(sec);
        }
      });
    }

    // Start Position Steppers & Sliders
    if (trimStartMinInput) {
      trimStartMinInput.addEventListener('change', () => {
        const m = Math.max(0, parseInt(trimStartMinInput.value, 10) || 0);
        const s = Math.max(0, Math.min(59, parseInt(trimStartSecInput.value, 10) || 0));
        trimStart = m * 60 + s;
        updateTrimmerUI();
      });
    }

    if (trimStartSecInput) {
      trimStartSecInput.addEventListener('change', () => {
        const m = Math.max(0, parseInt(trimStartMinInput.value, 10) || 0);
        const s = Math.max(0, Math.min(59, parseInt(trimStartSecInput.value, 10) || 0));
        trimStart = m * 60 + s;
        updateTrimmerUI();
      });
    }

    if (trimStartSlider) {
      trimStartSlider.addEventListener('input', (e) => {
        trimStart = Number(e.target.value);
        updateTrimmerUI();
      });
    }

    if (startMinus10Btn) {
      startMinus10Btn.addEventListener('click', () => {
        trimStart = Math.max(0, trimStart - 10);
        updateTrimmerUI();
      });
    }
    if (startMinus1Btn) {
      startMinus1Btn.addEventListener('click', () => {
        trimStart = Math.max(0, trimStart - 1);
        updateTrimmerUI();
      });
    }
    if (startPlus1Btn) {
      startPlus1Btn.addEventListener('click', () => {
        trimStart = Math.min(totalDuration - 1, trimStart + 1);
        updateTrimmerUI();
      });
    }
    if (startPlus10Btn) {
      startPlus10Btn.addEventListener('click', () => {
        trimStart = Math.min(totalDuration - 1, trimStart + 10);
        updateTrimmerUI();
      });
    }

    // Duration Steppers & Sliders
    if (trimDurationInput) {
      trimDurationInput.addEventListener('change', () => {
        trimDuration = Math.max(1, parseInt(trimDurationInput.value, 10) || 1);
        updateTrimmerUI();
      });
    }

    if (trimDurationSlider) {
      trimDurationSlider.addEventListener('input', (e) => {
        trimDuration = Number(e.target.value);
        updateTrimmerUI();
      });
    }

    if (durMinus5Btn) {
      durMinus5Btn.addEventListener('click', () => {
        trimDuration = Math.max(1, trimDuration - 5);
        updateTrimmerUI();
      });
    }
    if (durPlus5Btn) {
      durPlus5Btn.addEventListener('click', () => {
        trimDuration = Math.min(totalDuration - trimStart, trimDuration + 5);
        updateTrimmerUI();
      });
    }

    // Preset Chips
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const d = chip.getAttribute('data-dur');
        if (d === 'full') {
          trimDuration = Math.max(1, totalDuration - trimStart);
        } else {
          trimDuration = Number(d);
        }
        updateTrimmerUI();
        showToast(`長さを「${Math.round(trimDuration)}秒」にセットしました`);
      });
    });

    // Preview Trim Button
    if (previewTrimBtn) {
      previewTrimBtn.addEventListener('click', () => {
        if (isPlayingTrim) {
          stopAllAudio();
        } else {
          playTrimPreview();
        }
      });
    }

    // Download Button
    if (downloadBtn) {
      downloadBtn.addEventListener('click', handleDownload);
    }

    // Audio Complete Modal Actions (iPhone WebKit & Android & PC)
    if (audioShareBtn) {
      audioShareBtn.addEventListener('click', async () => {
        if (!lastCutFile) return;

        const shareData = {
          files: [lastCutFile],
          title: lastCutFilename
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            showToast('共有メニューを開きました。「"ファイル"に保存」を選択してください');
            return;
          } catch (err) {
            if (err.name === 'AbortError') return;
            console.warn('navigator.share failed, fallback to direct download:', err);
          }
        }

        // Fallback for non-share environments
        triggerDownloadDirect(lastCutBlob, lastCutFilename);
        showToast('ダウンロードを開始しました');
      });
    }

    if (audioDirectDownloadBtn) {
      audioDirectDownloadBtn.addEventListener('click', () => {
        if (!lastCutBlob) return;
        triggerDownloadDirect(lastCutBlob, lastCutFilename);
        showToast('ダウンロードを開始しました');
      });
    }

    if (modalAudioDownloadLink) {
      modalAudioDownloadLink.addEventListener('click', (e) => {
        if (lastCutUrl) {
          window.open(lastCutUrl, '_blank');
        }
      });
    }

    if (closeAudioModalBtn) {
      closeAudioModalBtn.addEventListener('click', closeAudioModal);
    }
    if (closeAudioModalBottomBtn) {
      closeAudioModalBottomBtn.addEventListener('click', closeAudioModal);
    }
    if (audioCompleteModal) {
      audioCompleteModal.addEventListener('click', (e) => {
        if (e.target === audioCompleteModal) {
          closeAudioModal();
        }
      });
    }
  }

  // Auto initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateTrimmerUI();

    // Auto-load demo song so the user can immediately test trimming & downloading without empty state
    setTimeout(() => {
      if (!rawAudioBuffer && !originalFile) {
        loadDemoSong();
      }
    }, 150);
  });

})();
