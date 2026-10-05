/**
 * GrooveSync MV - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const stageCanvas = document.getElementById('stageCanvas');
  const stageContainer = document.getElementById('stageContainer');
  const togglePlayBtn = document.getElementById('togglePlayBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const recordBtn = document.getElementById('recordBtn');
  const progressBarWrap = document.getElementById('progressBarWrap');
  const progressFill = document.getElementById('progressFill');
  const songTitleEl = document.getElementById('songTitle');
  const songTimeEl = document.getElementById('songTime');
  const hudMotionTag = document.getElementById('hudMotionTag');
  const hudBpmTag = document.getElementById('hudBpmTag');
  const lyricsTextEl = document.getElementById('lyricsText');
  const lyricsOverlay = document.getElementById('lyricsOverlay');

  // Monitor DOM
  const visemeCurrentChar = document.getElementById('visemeCurrentChar');
  const grooveIndicator = document.getElementById('grooveIndicator');
  const mBars = {
    A: document.getElementById('barA'),
    I: document.getElementById('barI'),
    U: document.getElementById('barU'),
    E: document.getElementById('barE'),
    O: document.getElementById('barO')
  };

  // Nav & Panels
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanels = document.querySelectorAll('.tab-panel');

  // Sliders
  const lipsyncSensitivity = document.getElementById('lipsyncSensitivity');
  const grooveStrength = document.getElementById('grooveStrength');
  const expressionLevel = document.getElementById('expressionLevel');
  const headbobStrength = document.getElementById('headbobStrength');
  const lipsyncVal = document.getElementById('lipsyncVal');
  const grooveVal = document.getElementById('grooveVal');
  const expressionVal = document.getElementById('expressionVal');
  const headbobVal = document.getElementById('headbobVal');

  // File Uploads
  const audioFileInput = document.getElementById('audioFileInput');
  const audioUploadBox = document.getElementById('audioUploadBox');
  const audioFileNameHint = document.getElementById('audioFileNameHint');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarUploadBox = document.getElementById('avatarUploadBox');

  // Mic Toggle
  const micToggleBtn = document.getElementById('micToggleBtn');
  const micBtnText = document.getElementById('micBtnText');

  // Modals & Exports
  const exportQuickBtn = document.getElementById('exportQuickBtn');
  const exportModal = document.getElementById('exportModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const startRecordingModalBtn = document.getElementById('startRecordingModalBtn');
  const recordProgressWrap = document.getElementById('recordProgressWrap');
  const recordProgressFill = document.getElementById('recordProgressFill');
  const exportStatusTitle = document.getElementById('exportStatusTitle');
  const exportStatusDesc = document.getElementById('exportStatusDesc');
  const exportFormat = document.getElementById('exportFormat');
  const exportDuration = document.getElementById('exportDuration');

  const quickHelpBtn = document.getElementById('quickHelpBtn');
  const helpModal = document.getElementById('helpModal');
  const closeHelpBtn = document.getElementById('closeHelpBtn');

  // Cost AI Hub Elements
  const aiPromptOutput = document.getElementById('aiPromptOutput');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const downloadWorkflowBtn = document.getElementById('downloadWorkflowBtn');
  const userApiKey = document.getElementById('userApiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  const apiKeyProvider = document.getElementById('apiKeyProvider');

  // Spectrum Canvas
  const spectrumCanvas = document.getElementById('spectrumCanvas');
  const specCtx = spectrumCanvas ? spectrumCanvas.getContext('2d') : null;

  // Initialize Engines
  const audioEngine = new window.AudioEngine();
  const characterRenderer = new window.CharacterRenderer(stageCanvas);

  // Recorder state
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let recordTimer = null;
  let recordTimeRemaining = 0;

  // Current state tracking
  let currentSongConfig = GROOVE_PRESETS.songs.jpop;

  // Toast utility
  function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // Format seconds to mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // 1. Navigation Tab Switching
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `panel-${tab.dataset.tab}`;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // 2. Aspect Ratio Switching (9:16 TikTok vs 16:9 YouTube)
  const ratioBtns = document.querySelectorAll('.ratio-btn');
  ratioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ratioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ratio = btn.dataset.ratio;
      characterRenderer.setAspectRatio(ratio);
      if (ratio === '16:9') {
        stageContainer.classList.add('aspect-16-9');
      } else {
        stageContainer.classList.remove('aspect-16-9');
      }
      showToast(`アスペクト比を ${ratio} に変更しました`);
    });
  });

  // 3. Play / Pause Control
  function updatePlayUI(playing) {
    if (playing) {
      playIcon.classList.add('hidden');
      pauseIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
    }
  }

  togglePlayBtn.addEventListener('click', () => {
    if (audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
    } else {
      audioEngine.play();
      updatePlayUI(true);
    }
  });

  // 4. Progress bar scrub
  progressBarWrap.addEventListener('click', (e) => {
    const rect = progressBarWrap.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEngine.seek(ratio);
  });

  // 5. Motion Presets
  const motionCards = document.querySelectorAll('[data-motion]');
  motionCards.forEach(card => {
    card.addEventListener('click', () => {
      motionCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const motionId = card.dataset.motion;
      characterRenderer.setMotion(motionId);
      const preset = GROOVE_PRESETS.motions[motionId];
      if (preset) {
        hudMotionTag.textContent = `${preset.icon} ${preset.name}`;
        updateAIPrompt();
        showToast(`モーション: ${preset.name} に変更`);
      }
    });
  });

  // 6. Character Presets
  const avatarCards = document.querySelectorAll('[data-avatar]');
  avatarCards.forEach(card => {
    card.addEventListener('click', () => {
      avatarCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const charId = card.dataset.avatar;
      characterRenderer.setCharacter(charId);
      updateAIPrompt();
      showToast(`アーティスト: ${GROOVE_PRESETS.characters[charId]?.name || charId}`);
    });
  });

  // 7. Custom Avatar Upload
  avatarUploadBox.addEventListener('click', () => avatarFileInput.click());
  avatarFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        characterRenderer.setCustomAvatar(img);
        avatarCards.forEach(c => c.classList.remove('active'));
        showToast('写真アバターを読み込みました！');
        updateAIPrompt();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // 8. Custom Audio File Upload
  audioUploadBox.addEventListener('click', () => audioFileInput.click());
  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioFileNameHint.textContent = `読込中: ${file.name}...`;
    const res = await audioEngine.loadUserFile(file);
    if (res.success) {
      songTitleEl.textContent = file.name.replace(/\.[^/.]+$/, "");
      audioFileNameHint.textContent = `選択中: ${file.name} (${formatTime(res.duration)})`;
      document.querySelectorAll('.song-item').forEach(s => s.classList.remove('active'));
      currentSongConfig = {
        title: file.name,
        bpm: 120,
        lyrics: [{ time: 0, text: '♪ アップロード楽曲を再生中' }]
      };
      hudBpmTag.textContent = `120 BPM`;
      audioEngine.play();
      updatePlayUI(true);
      showToast(`制作楽曲「${file.name}」を読み込みました！`);
    } else {
      audioFileNameHint.textContent = 'エラー: 音声形式を確認してください';
      showToast('音声の読み込みに失敗しました');
    }
  });

  // 9. Smartphone Mic Toggle
  micToggleBtn.addEventListener('click', async () => {
    const active = await audioEngine.toggleMic();
    if (active) {
      micToggleBtn.classList.add('active');
      micBtnText.textContent = 'マイク入力中（タップで停止）';
      songTitleEl.textContent = '🎤 リアルタイムマイク歌唱中';
      showToast('マイク入力を開始しました。歌ってみてください！');
    } else {
      micToggleBtn.classList.remove('active');
      micBtnText.textContent = 'スマホのマイクでリアルタイム歌唱テスト';
      showToast('マイク入力を停止しました');
    }
  });

  // 10. Demo Songs Selection
  const songItems = document.querySelectorAll('.song-item');
  songItems.forEach(item => {
    item.addEventListener('click', () => {
      songItems.forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      const songId = item.dataset.song;
      const song = GROOVE_PRESETS.songs[songId];
      if (!song) return;

      currentSongConfig = song;
      audioEngine.selectDemoTrack(songId);
      songTitleEl.textContent = `${song.title} (${song.genre})`;
      hudBpmTag.textContent = `${song.bpm} BPM`;

      // Auto recommend appropriate motion
      if (song.recommendedMotion) {
        const targetMotionCard = document.querySelector(`[data-motion="${song.recommendedMotion}"]`);
        if (targetMotionCard) targetMotionCard.click();
      }

      audioEngine.play();
      updatePlayUI(true);
      showToast(`デモ楽曲: ${song.title} を再生`);
    });
  });

  // 11. Sliders Event Handlers
  lipsyncSensitivity.addEventListener('input', (e) => {
    const val = e.target.value;
    lipsyncVal.textContent = `${val}%`;
    characterRenderer.lipsyncSens = val / 100;
  });

  grooveStrength.addEventListener('input', (e) => {
    const val = e.target.value;
    grooveVal.textContent = `${val}%`;
    characterRenderer.grooveStrength = val / 100;
  });

  expressionLevel.addEventListener('input', (e) => {
    const val = e.target.value;
    expressionVal.textContent = `${val}%`;
    characterRenderer.expressionLevel = val / 100;
  });

  headbobStrength.addEventListener('input', (e) => {
    const val = e.target.value;
    headbobVal.textContent = `${val}%`;
    characterRenderer.headbobStrength = val / 100;
  });

  // 12. Camera & Stage Effects
  const cameraCards = document.querySelectorAll('[data-camera]');
  cameraCards.forEach(card => {
    card.addEventListener('click', () => {
      cameraCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      characterRenderer.setCamera(card.dataset.camera);
      showToast(`カメラ: ${card.querySelector('h4').textContent}`);
    });
  });

  const stageBtns = document.querySelectorAll('[data-stage]');
  stageBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stageBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      characterRenderer.setStage(btn.dataset.stage);
      showToast(`ステージ: ${btn.textContent}`);
    });
  });

  document.getElementById('laserEffectToggle').addEventListener('change', (e) => {
    characterRenderer.showLasers = e.target.checked;
  });

  document.getElementById('particleEffectToggle').addEventListener('change', (e) => {
    characterRenderer.showParticles = e.target.checked;
  });

  document.getElementById('lyricsToggle').addEventListener('change', (e) => {
    if (e.target.checked) lyricsOverlay.classList.remove('hidden');
    else lyricsOverlay.classList.add('hidden');
  });

  // 13. Cost Saver Hub - AI Prompts & ComfyUI Export
  function updateAIPrompt() {
    const motion = characterRenderer.motionPreset;
    const char = characterRenderer.characterPreset;
    const bpm = audioEngine ? audioEngine.bpm : 120;

    const fullPrompt = `Masterpiece, 8k resolution, official music video shot. ${char.prompt}. ${motion.promptSnippet}. Real-time beat synchronization at ${bpm} BPM, cinematic stage lighting with atmospheric smoke and volumetric lasers, high expressive singing face, natural rhythmic body movement and instrumental performance. --ar 9:16 --v 6.1`;
    aiPromptOutput.value = fullPrompt;
  }
  updateAIPrompt();

  copyPromptBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(aiPromptOutput.value).then(() => {
      showToast('AI生成用プロンプトをクリップボードにコピーしました！');
    });
  });

  downloadWorkflowBtn.addEventListener('click', () => {
    const motion = characterRenderer.motionPreset;
    const char = characterRenderer.characterPreset;
    const workflowObj = {
      name: "GrooveSync_Expressive_MV_Pipeline",
      version: "1.0",
      description: "Low-cost ComfyUI workflow for LivePortrait + AnimateAnyone / Wan2.1",
      nodes: {
        "1": { class_type: "AudioBeatExtractor", inputs: { bpm: audioEngine.bpm } },
        "2": { class_type: "LivePortraitFaceDriving", inputs: { expression_scale: characterRenderer.expressionLevel, lip_sync_sensitivity: characterRenderer.lipsyncSens } },
        "3": { class_type: "SkeletalMotionTransfer", inputs: { motion_preset: motion.id, instrument: motion.instrument, groove_sway: characterRenderer.grooveStrength } },
        "4": { class_type: "PromptSynthesizer", inputs: { character: char.styleName, positive_prompt: aiPromptOutput.value } }
      }
    };
    const blob = new Blob([JSON.stringify(workflowObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `groovesync-comfyui-${motion.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('ComfyUI設定JSONをダウンロードしました');
  });

  // Save API Key in localStorage
  saveApiKeyBtn.addEventListener('click', () => {
    const key = userApiKey.value.trim();
    const provider = apiKeyProvider.value;
    if (key) {
      localStorage.setItem(`groovesync_api_${provider}`, key);
      showToast(`${provider} のAPIキーを保存しました（格安生成準備完了）`);
    } else {
      showToast('APIキーを入力してください');
    }
  });

  // 14. Modals (Help & Export)
  quickHelpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
  closeHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  exportQuickBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
  closeModalBtn.addEventListener('click', () => exportModal.classList.add('hidden'));
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.add('hidden');
  });

  // 15. Real Video Recording & Download Pipeline (Canvas + Web Audio -> MP4/WebM)
  function startRecording(durationSeconds) {
    if (isRecording) return;

    if (!audioEngine.isPlaying) {
      audioEngine.play();
      updatePlayUI(true);
    }

    try {
      // 1. Capture video stream from canvas
      const canvasStream = stageCanvas.captureStream(30);

      // 2. Capture audio stream from Web Audio recDestination
      const audioStream = audioEngine.recDestination.stream;

      // 3. Combine into single MediaStream
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ];
      const combinedStream = new MediaStream(combinedTracks);

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';

      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 4500000 // High crisp quality
      });

      recordedChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = videoUrl;
        const songNameClean = (currentSongConfig.title || 'song').replace(/\s+/g, '_');
        a.download = `GrooveSync_${songNameClean}_${characterRenderer.motionPreset.id}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(videoUrl);

        isRecording = false;
        recordBtn.classList.remove('recording');
        recordProgressWrap.classList.add('hidden');
        exportStatusTitle.textContent = '録画完了！保存しました';
        exportStatusDesc = 'スマホの保存フォルダ・カメラロールを確認してください';
        showToast('動画のダウンロードが完了しました！');
      };

      mediaRecorder.start(200);
      isRecording = true;
      recordBtn.classList.add('recording');

      // Update modal status
      exportStatusTitle.textContent = '録画中...';
      exportStatusDesc = `演奏と歌唱をキャプチャしています (${durationSeconds}秒間)`;
      recordProgressWrap.classList.remove('hidden');
      recordProgressFill.style.width = '0%';

      let elapsed = 0;
      const interval = 100;
      clearInterval(recordTimer);
      recordTimer = setInterval(() => {
        elapsed += 0.1;
        const progress = Math.min(100, (elapsed / durationSeconds) * 100);
        recordProgressFill.style.width = `${progress}%`;

        if (elapsed >= durationSeconds) {
          clearInterval(recordTimer);
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, interval);

      showToast(`MV録画を開始しました（${durationSeconds}秒）`);
    } catch (err) {
      console.error('Recording error:', err);
      showToast('録画機能の起動に失敗しました');
    }
  }

  recordBtn.addEventListener('click', () => {
    if (isRecording) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      clearInterval(recordTimer);
      isRecording = false;
      recordBtn.classList.remove('recording');
      showToast('録画を停止しました');
    } else {
      startRecording(15);
    }
  });

  startRecordingModalBtn.addEventListener('click', () => {
    let dur = 15;
    if (exportDuration.value === '30') dur = 30;
    else if (exportDuration.value === 'full') dur = Math.min(audioEngine.duration, 60);
    startRecording(dur);
  });

  // 16. Spectrum Visualizer Drawer
  function drawSpectrum() {
    if (!specCtx || !audioEngine.freqData) return;
    const w = spectrumCanvas.width;
    const h = spectrumCanvas.height;
    specCtx.clearRect(0, 0, w, h);

    const binCount = audioEngine.analyser.frequencyBinCount;
    const barWidth = (w / (binCount / 3));
    let x = 0;

    for (let i = 0; i < binCount / 3; i++) {
      const v = audioEngine.freqData[i] / 255.0;
      const barHeight = v * h;

      const grad = specCtx.createLinearGradient(0, h, 0, 0);
      grad.addColorStop(0, '#8b5cf6');
      grad.addColorStop(1, '#06b6d4');
      specCtx.fillStyle = grad;

      specCtx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }

  // 17. Main Animation Loop (60 FPS)
  function tick() {
    // 1. Audio analysis update
    audioEngine.updateAnalysis(characterRenderer.lipsyncSens);

    // 2. Character & Stage rendering
    characterRenderer.render(audioEngine);

    // 3. Spectrum visualization
    drawSpectrum();

    // 4. Update HUD and Progress
    if (audioEngine.isPlaying) {
      const cur = audioEngine.currentTime;
      const dur = audioEngine.duration || 30;
      const progressPercent = Math.min(100, (cur / dur) * 100);
      progressFill.style.width = `${progressPercent}%`;
      songTimeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

      // Update Lyrics sync
      if (currentSongConfig.lyrics) {
        let activeLyric = currentSongConfig.lyrics[0].text;
        for (const lyric of currentSongConfig.lyrics) {
          if (cur >= lyric.time) {
            activeLyric = lyric.text;
          }
        }
        lyricsTextEl.textContent = activeLyric;
      }
    }

    // 5. Viseme & Groove Monitor meters update
    if (visemeCurrentChar) {
      visemeCurrentChar.textContent = audioEngine.currentChar;
    }
    if (grooveIndicator) {
      if (audioEngine.beatPulse > 0.4) {
        grooveIndicator.classList.add('pulse');
      } else {
        grooveIndicator.classList.remove('pulse');
      }
    }

    // Update individual vowel meter bars
    if (mBars.A) {
      for (const [char, el] of Object.entries(mBars)) {
        if (el) {
          if (char === audioEngine.currentChar && audioEngine.mouthOpen > 0.15) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        }
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});
