/**
 * GrooveSync MV - Main Controller (Accessible 2-View Architecture)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const viewControls = document.getElementById('viewControls');
  const viewStage = document.getElementById('viewStage');
  const tabBtnControls = document.getElementById('tabBtnControls');
  const tabBtnStage = document.getElementById('tabBtnStage');
  const jumpToStageBtn = document.getElementById('jumpToStageBtn');
  const backToControlsBtn = document.getElementById('backToControlsBtn');

  // Stage Canvas
  const stageCanvas = document.getElementById('stageCanvas');

  // Player Elements (Controls Screen)
  const controlSongTitle = document.getElementById('controlSongTitle');
  const controlSongTime = document.getElementById('controlSongTime');
  const mainPlayBtn = document.getElementById('mainPlayBtn');
  const mainPlayIcon = document.getElementById('mainPlayIcon');
  const mainPlayText = document.getElementById('mainPlayText');
  const mainRecordBtn = document.getElementById('mainRecordBtn');
  const mainRecText = document.getElementById('mainRecText');

  // Player Elements (Stage Screen)
  const stagePlayBtn = document.getElementById('stagePlayBtn');
  const stagePlayIcon = document.getElementById('stagePlayIcon');
  const stageRecordBtn = document.getElementById('stageRecordBtn');
  const stageSongTitle = document.getElementById('stageSongTitle');
  const stageSongTime = document.getElementById('stageSongTime');
  const stageProgressWrap = document.getElementById('stageProgressWrap');
  const stageProgressFill = document.getElementById('stageProgressFill');
  const stageBpmIndicator = document.getElementById('stageBpmIndicator');
  const stageVisemeChar = document.getElementById('stageVisemeChar');
  const lyricsText = document.getElementById('lyricsText');

  // Sliders
  const lipsyncSensitivity = document.getElementById('lipsyncSensitivity');
  const grooveStrength = document.getElementById('grooveStrength');
  const expressionLevel = document.getElementById('expressionLevel');
  const lipsyncVal = document.getElementById('lipsyncVal');
  const grooveVal = document.getElementById('grooveVal');
  const expressionVal = document.getElementById('expressionVal');

  // File Uploads
  const audioUploadBtn = document.getElementById('audioUploadBtn');
  const audioFileInput = document.getElementById('audioFileInput');
  const audioUploadHint = document.getElementById('audioUploadHint');
  const avatarUploadBtn = document.getElementById('avatarUploadBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');

  // Mic
  const micToggleBtn = document.getElementById('micToggleBtn');
  const micBtnTitle = document.getElementById('micBtnTitle');

  // Cost & Prompts
  const copyPromptBtn = document.getElementById('copyPromptBtn');

  // Engines
  const audioEngine = new window.AudioEngine();
  const characterRenderer = new window.CharacterRenderer(stageCanvas);

  // Recording State
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let recordTimer = null;

  let currentSongConfig = GROOVE_PRESETS.songs.jpop;

  // Haptic Feedback
  function triggerHaptic() {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }

  // Toast
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

  // Time format
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // ==========================================
  // Screen View Switcher (操作画面 ⇔ MV映像)
  // ==========================================
  function switchView(target) {
    triggerHaptic();
    if (target === 'controls') {
      viewControls.classList.add('active-view');
      viewStage.classList.add('hidden');
      tabBtnControls.classList.add('active');
      tabBtnStage.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      viewControls.classList.remove('active-view');
      viewStage.classList.remove('hidden');
      tabBtnControls.classList.remove('active');
      tabBtnStage.classList.add('active');

      // Auto play when switching to stage if not already playing
      if (!audioEngine.isPlaying) {
        audioEngine.play();
        updatePlayUI(true);
      }
      showToast('MVを全画面表示しました');
    }
  }

  tabBtnControls.addEventListener('click', () => switchView('controls'));
  tabBtnStage.addEventListener('click', () => switchView('stage'));
  jumpToStageBtn.addEventListener('click', () => switchView('stage'));
  backToControlsBtn.addEventListener('click', () => switchView('controls'));

  // ==========================================
  // Playback Control (Synchronized across both views)
  // ==========================================
  function updatePlayUI(playing) {
    if (playing) {
      mainPlayIcon.textContent = '⏸';
      mainPlayText.textContent = '音楽を一時停止';
      stagePlayIcon.textContent = '⏸';
    } else {
      mainPlayIcon.textContent = '▶';
      mainPlayText.textContent = '音楽を再生する';
      stagePlayIcon.textContent = '▶';
    }
  }

  function togglePlay() {
    triggerHaptic();
    if (audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
    } else {
      audioEngine.play();
      updatePlayUI(true);
    }
  }

  mainPlayBtn.addEventListener('click', togglePlay);
  stagePlayBtn.addEventListener('click', togglePlay);

  // Progress scrub on stage
  stageProgressWrap.addEventListener('click', (e) => {
    const rect = stageProgressWrap.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEngine.seek(ratio);
  });

  // ==========================================
  // Motion Presets Selection
  // ==========================================
  const motionCards = document.querySelectorAll('[data-motion]');
  motionCards.forEach(card => {
    card.addEventListener('click', () => {
      triggerHaptic();
      motionCards.forEach(c => {
        c.classList.remove('active');
        const pill = c.querySelector('.status-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.classList.remove('selected');
        }
      });

      card.classList.add('active');
      const pill = card.querySelector('.status-pill');
      if (pill) {
        pill.textContent = '✔ 選択中';
        pill.classList.add('selected');
      }

      const motionId = card.dataset.motion;
      characterRenderer.setMotion(motionId);
      const preset = GROOVE_PRESETS.motions[motionId];
      if (preset) {
        showToast(`動作を「${preset.name}」に変更しました`);
      }
    });
  });

  // ==========================================
  // Demo Songs Selection
  // ==========================================
  const songCards = document.querySelectorAll('[data-song]');
  songCards.forEach(card => {
    card.addEventListener('click', () => {
      triggerHaptic();
      songCards.forEach(s => {
        s.classList.remove('active');
        const pill = s.querySelector('.status-pill');
        if (pill) pill.textContent = 'タップで再生';
      });

      card.classList.add('active');
      const pill = card.querySelector('.status-pill');
      if (pill) pill.textContent = '再生中';

      const songId = card.dataset.song;
      const song = GROOVE_PRESETS.songs[songId];
      if (!song) return;

      currentSongConfig = song;
      audioEngine.selectDemoTrack(songId);

      controlSongTitle.textContent = `${song.title} (${song.genre})`;
      stageSongTitle.textContent = `${song.title} (${song.genre})`;
      stageBpmIndicator.textContent = `${song.bpm} BPM`;

      // Recommend motion
      if (song.recommendedMotion) {
        const targetMotionCard = document.querySelector(`[data-motion="${song.recommendedMotion}"]`);
        if (targetMotionCard) targetMotionCard.click();
      }

      audioEngine.play();
      updatePlayUI(true);
      showToast(`「${song.title}」を再生開始`);
    });
  });

  // ==========================================
  // Avatar Selection & Photo Upload
  // ==========================================
  const avatarCards = document.querySelectorAll('[data-avatar]');
  avatarCards.forEach(card => {
    card.addEventListener('click', () => {
      triggerHaptic();
      avatarCards.forEach(c => {
        c.classList.remove('active');
        const pill = c.querySelector('.status-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.classList.remove('selected');
        }
      });

      card.classList.add('active');
      const pill = card.querySelector('.status-pill');
      if (pill) {
        pill.textContent = '✔ 選択中';
        pill.classList.add('selected');
      }

      const charId = card.dataset.avatar;
      characterRenderer.setCharacter(charId);
      showToast(`アーティストを「${GROOVE_PRESETS.characters[charId]?.name || charId}」に設定`);
    });
  });

  avatarUploadBtn.addEventListener('click', () => avatarFileInput.click());
  avatarFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        characterRenderer.setCustomAvatar(img);
        avatarCards.forEach(c => {
          c.classList.remove('active');
          const pill = c.querySelector('.status-pill');
          if (pill) {
            pill.textContent = 'タップで選択';
            pill.classList.remove('selected');
          }
        });
        showToast('ご自身の写真アバターを適用しました！');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ==========================================
  // User Audio File Upload
  // ==========================================
  audioUploadBtn.addEventListener('click', () => audioFileInput.click());
  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    audioUploadHint.textContent = `読込中: ${file.name}...`;
    const res = await audioEngine.loadUserFile(file);
    if (res.success) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      controlSongTitle.textContent = cleanName;
      stageSongTitle.textContent = cleanName;
      audioUploadHint.textContent = `選択中: ${file.name} (${formatTime(res.duration)})`;

      songCards.forEach(s => {
        s.classList.remove('active');
        const pill = s.querySelector('.status-pill');
        if (pill) pill.textContent = 'タップで再生';
      });

      currentSongConfig = {
        title: cleanName,
        bpm: 120,
        lyrics: [{ time: 0, text: '♪ アップロード楽曲を再生中' }]
      };
      stageBpmIndicator.textContent = `120 BPM`;

      audioEngine.play();
      updatePlayUI(true);
      showToast(`制作楽曲「${cleanName}」を読み込みました！`);
    } else {
      audioUploadHint.textContent = 'エラー: 音声ファイルを確認してください';
      showToast('音声の読み込みに失敗しました');
    }
  });

  // ==========================================
  // Smartphone Mic Toggle
  // ==========================================
  micToggleBtn.addEventListener('click', async () => {
    triggerHaptic();
    const active = await audioEngine.toggleMic();
    if (active) {
      micToggleBtn.classList.add('active');
      micBtnTitle.textContent = '🎤 マイク入力中（タップで停止）';
      controlSongTitle.textContent = '🎤 リアルタイムマイク歌唱中';
      stageSongTitle.textContent = '🎤 リアルタイムマイク歌唱中';
      showToast('マイク入力を開始しました。歌ってみてください！');
    } else {
      micToggleBtn.classList.remove('active');
      micBtnTitle.textContent = 'スマホのマイクで歌唱テスト';
      showToast('マイク入力を停止しました');
    }
  });

  // ==========================================
  // Sliders Event Handlers
  // ==========================================
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

  // ==========================================
  // Copy AI Prompt
  // ==========================================
  copyPromptBtn.addEventListener('click', () => {
    triggerHaptic();
    const motion = characterRenderer.motionPreset;
    const char = characterRenderer.characterPreset;
    const bpm = audioEngine ? audioEngine.bpm : 120;
    const fullPrompt = `Masterpiece, 8k resolution, official music video shot. ${char.prompt}. ${motion.promptSnippet}. Real-time beat synchronization at ${bpm} BPM, cinematic stage lighting with atmospheric smoke and volumetric lasers, high expressive singing face, natural rhythmic body movement and instrumental performance. --ar 9:16 --v 6.1`;

    navigator.clipboard.writeText(fullPrompt).then(() => {
      showToast('AI動画生成用プロンプトをコピーしました！');
    });
  });

  // ==========================================
  // Video Recording & Download Pipeline (Canvas + Web Audio -> WebM/MP4)
  // ==========================================
  function startRecording(durationSeconds = 15) {
    if (isRecording) return;

    if (!audioEngine.isPlaying) {
      audioEngine.play();
      updatePlayUI(true);
    }

    try {
      const canvasStream = stageCanvas.captureStream(30);
      const audioStream = audioEngine.recDestination.stream;

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
        videoBitsPerSecond: 4500000
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
        mainRecordBtn.classList.remove('recording');
        stageRecordBtn.classList.remove('recording');
        mainRecText.textContent = 'MVを録画・保存';
        showToast('動画のダウンロードが完了しました！');
      };

      mediaRecorder.start(200);
      isRecording = true;
      mainRecordBtn.classList.add('recording');
      stageRecordBtn.classList.add('recording');
      mainRecText.textContent = `録画中... (${durationSeconds}秒)`;

      let elapsed = 0;
      clearInterval(recordTimer);
      recordTimer = setInterval(() => {
        elapsed += 1;
        mainRecText.textContent = `録画中... (${durationSeconds - elapsed}秒)`;
        if (elapsed >= durationSeconds) {
          clearInterval(recordTimer);
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, 1000);

      showToast(`MV録画を開始しました（${durationSeconds}秒間）`);
    } catch (err) {
      console.error('Recording error:', err);
      showToast('録画機能の起動に失敗しました');
    }
  }

  function handleRecordToggle() {
    triggerHaptic();
    if (isRecording) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      clearInterval(recordTimer);
      isRecording = false;
      mainRecordBtn.classList.remove('recording');
      stageRecordBtn.classList.remove('recording');
      mainRecText.textContent = 'MVを録画・保存';
      showToast('録画を停止しました');
    } else {
      startRecording(15);
    }
  }

  mainRecordBtn.addEventListener('click', handleRecordToggle);
  stageRecordBtn.addEventListener('click', handleRecordToggle);

  // ==========================================
  // Main Animation Loop (60 FPS)
  // ==========================================
  function tick() {
    audioEngine.updateAnalysis(characterRenderer.lipsyncSens);
    characterRenderer.render(audioEngine);

    if (audioEngine.isPlaying) {
      const cur = audioEngine.currentTime;
      const dur = audioEngine.duration || 30;
      const progressPercent = Math.min(100, (cur / dur) * 100);

      controlSongTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
      stageSongTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
      stageProgressFill.style.width = `${progressPercent}%`;

      if (currentSongConfig.lyrics) {
        let activeLyric = currentSongConfig.lyrics[0].text;
        for (const lyric of currentSongConfig.lyrics) {
          if (cur >= lyric.time) {
            activeLyric = lyric.text;
          }
        }
        lyricsText.textContent = activeLyric;
      }
    }

    if (stageVisemeChar) {
      stageVisemeChar.textContent = audioEngine.currentChar;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});
