/**
 * GrooveSync MV - Main Controller (Workflow & Audio Trimming)
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

  // Master Player Elements
  const controlSongTitle = document.getElementById('controlSongTitle');
  const controlSongTime = document.getElementById('controlSongTime');
  const controlTrimRangeBadge = document.getElementById('controlTrimRangeBadge');
  const mainPlayBtn = document.getElementById('mainPlayBtn');
  const mainPlayIcon = document.getElementById('mainPlayIcon');
  const mainPlayText = document.getElementById('mainPlayText');
  const mainRecordBtn = document.getElementById('mainRecordBtn');
  const mainRecText = document.getElementById('mainRecText');
  const finalRecordBtn = document.getElementById('finalRecordBtn');
  const finalRecText = document.getElementById('finalRecText');

  // Trimmer Elements
  const trimStartReadout = document.getElementById('trimStartReadout');
  const trimEndReadout = document.getElementById('trimEndReadout');
  const trimDurationReadout = document.getElementById('trimDurationReadout');
  const trimStartSlider = document.getElementById('trimStartSlider');
  const trimDurationSlider = document.getElementById('trimDurationSlider');
  const startSliderVal = document.getElementById('startSliderVal');
  const durationSliderVal = document.getElementById('durationSliderVal');
  const previewTrimBtn = document.getElementById('previewTrimBtn');
  const trimPresetChips = document.querySelectorAll('.trim-preset-chip');
  const exportSummaryTitle = document.getElementById('exportSummaryTitle');
  const exportSummaryDesc = document.getElementById('exportSummaryDesc');

  // Fullscreen Stage Player Elements
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

  // File Upload Elements
  const audioUploadBtn = document.getElementById('audioUploadBtn');
  const audioFileInput = document.getElementById('audioFileInput');
  const audioCardTitle = document.getElementById('audioCardTitle');
  const audioUploadHint = document.getElementById('audioUploadHint');

  const avatarUploadBtn = document.getElementById('avatarUploadBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarCardTitle = document.getElementById('avatarCardTitle');
  const avatarCardHint = document.getElementById('avatarCardHint');

  // Mic
  const micToggleBtn = document.getElementById('micToggleBtn');
  const micBtnTitle = document.getElementById('micBtnTitle');

  // Engines
  const audioEngine = new window.AudioEngine();
  const characterRenderer = new window.CharacterRenderer(stageCanvas);

  // Trimming State
  let trimStartSeconds = 0;
  let trimDurationSeconds = 30;

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

  // Format mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // ==========================================
  // Trimmer Sync & Update Function
  // ==========================================
  function updateTrimmerUI() {
    const totalDuration = audioEngine.duration || 30;

    // Constrain start
    trimStartSeconds = Math.max(0, Math.min(trimStartSeconds, totalDuration - 1));
    // Constrain duration
    trimDurationSeconds = Math.max(1, Math.min(trimDurationSeconds, totalDuration - trimStartSeconds));

    const endSeconds = trimStartSeconds + trimDurationSeconds;

    // Apply to AudioEngine
    audioEngine.setTrimRange(trimStartSeconds, endSeconds);

    // Readouts
    trimStartReadout.textContent = formatTime(trimStartSeconds);
    trimEndReadout.textContent = formatTime(endSeconds);
    trimDurationReadout.textContent = `${Math.round(trimDurationSeconds)}秒間`;

    startSliderVal.textContent = formatTime(trimStartSeconds);
    durationSliderVal.textContent = `${Math.round(trimDurationSeconds)}秒`;

    trimStartSlider.value = trimStartSeconds;
    trimStartSlider.max = Math.max(1, Math.floor(totalDuration - 1));

    trimDurationSlider.value = trimDurationSeconds;
    trimDurationSlider.max = Math.max(1, Math.floor(totalDuration));

    // Badges & Summaries
    controlTrimRangeBadge.textContent = `再生区間: ${formatTime(trimStartSeconds)} 〜 ${formatTime(endSeconds)} (${Math.round(trimDurationSeconds)}秒間)`;
    exportSummaryTitle.textContent = `${Math.round(trimDurationSeconds)}秒間のリップシンクMVを作成します`;
    exportSummaryDesc = `開始: ${formatTime(trimStartSeconds)} 〜 終了: ${formatTime(endSeconds)} の動画ファイルが作成されます`;
  }

  // Trimmer Sliders
  trimStartSlider.addEventListener('input', (e) => {
    trimStartSeconds = parseFloat(e.target.value);
    updateTrimmerUI();
  });

  trimDurationSlider.addEventListener('input', (e) => {
    trimDurationSeconds = parseFloat(e.target.value);
    updateTrimmerUI();
  });

  // Preset Chips
  trimPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic();
      trimPresetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const dur = chip.dataset.dur;
      if (dur === '15') trimDurationSeconds = 15;
      else if (dur === '30') trimDurationSeconds = 30;
      else if (dur === '60') trimDurationSeconds = 60;
      else if (dur === 'full') {
        trimStartSeconds = 0;
        trimDurationSeconds = audioEngine.duration;
      }

      updateTrimmerUI();
      showToast(`動画の長さを「${Math.round(trimDurationSeconds)}秒」にセットしました`);
    });
  });

  // Test Play Trimmed Section
  previewTrimBtn.addEventListener('click', () => {
    triggerHaptic();
    audioEngine.pause();
    audioEngine.pauseOffset = 0;
    audioEngine.play();
    updatePlayUI(true);
    showToast(`選択した区間（${formatTime(trimStartSeconds)}〜）を再生中`);
  });

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
  // Playback Control
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
        if (pill) pill.textContent = 'タップで選択';
      });

      card.classList.add('active');
      const pill = card.querySelector('.status-pill');
      if (pill) pill.textContent = 'セット中';

      const songId = card.dataset.song;
      const song = GROOVE_PRESETS.songs[songId];
      if (!song) return;

      currentSongConfig = song;
      audioEngine.selectDemoTrack(songId);

      controlSongTitle.textContent = `${song.title} (${song.genre})`;
      stageSongTitle.textContent = `${song.title} (${song.genre})`;
      stageBpmIndicator.textContent = `${song.bpm} BPM`;

      // Reset trimmer
      trimStartSeconds = 0;
      trimDurationSeconds = 30;
      updateTrimmerUI();

      if (song.recommendedMotion) {
        const targetMotionCard = document.querySelector(`[data-motion="${song.recommendedMotion}"]`);
        if (targetMotionCard) targetMotionCard.click();
      }

      audioEngine.play();
      updatePlayUI(true);
      showToast(`「${song.title}」をセットしました`);
    });
  });

  // ==========================================
  // User Photo Avatar Upload
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
        avatarCardTitle.textContent = `✔ 適用中: ${file.name}`;
        avatarCardHint.textContent = 'あなたの写真アバターでリップシンク動画を生成します';

        avatarCards.forEach(c => {
          c.classList.remove('active');
          const pill = c.querySelector('.status-pill');
          if (pill) {
            pill.textContent = 'タップで選択';
            pill.classList.remove('selected');
          }
        });
        showToast('ご自身の人物写真をセットしました！');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ==========================================
  // User Audio File Upload (Trimming enabled)
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
      audioCardTitle.textContent = `✔ 読込完了: ${file.name}`;
      audioUploadHint.textContent = `全体の長さ: ${formatTime(res.duration)}（下で使う区間を調整できます）`;

      songCards.forEach(s => {
        s.classList.remove('active');
        const pill = s.querySelector('.status-pill');
        if (pill) pill.textContent = 'タップで選択';
      });

      currentSongConfig = {
        title: cleanName,
        bpm: 120,
        lyrics: [{ time: 0, text: '♪ あなたの楽曲を再生中' }]
      };
      stageBpmIndicator.textContent = `120 BPM`;

      // Set trimmer defaults for user song
      trimStartSeconds = 0;
      trimDurationSeconds = Math.min(res.duration, 30);
      updateTrimmerUI();

      audioEngine.play();
      updatePlayUI(true);
      showToast(`制作楽曲「${cleanName}」を読み込みました！長さをお選びください。`);
    } else {
      audioUploadHint.textContent = 'エラー: 音声ファイルを確認してください';
      showToast('音声の読み込みに失敗しました');
    }
  });

  // ==========================================
  // Mic Toggle
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
  // Video Recording & Download Pipeline (Canvas + Web Audio -> WebM/MP4)
  // ==========================================
  function startRecording() {
    if (isRecording) return;

    // Use current adjusted duration!
    const targetDuration = Math.round(trimDurationSeconds);

    // Make sure audio is playing from start of trim
    audioEngine.pause();
    audioEngine.pauseOffset = 0;
    audioEngine.play();
    updatePlayUI(true);

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
        a.download = `GrooveSync_${songNameClean}_${targetDuration}s.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(videoUrl);

        isRecording = false;
        mainRecordBtn.classList.remove('recording');
        stageRecordBtn.classList.remove('recording');
        finalRecordBtn.classList.remove('recording');

        mainRecText.textContent = 'MVを録画・保存';
        finalRecText.textContent = `● この長さ（${targetDuration}秒）でMVを録画して保存`;
        showToast('動画のダウンロードが完了しました！写真やファイルをご確認ください');
      };

      mediaRecorder.start(200);
      isRecording = true;
      mainRecordBtn.classList.add('recording');
      stageRecordBtn.classList.add('recording');
      finalRecordBtn.classList.add('recording');

      let elapsed = 0;
      mainRecText.textContent = `録画中... (${targetDuration}秒)`;
      finalRecText.textContent = `録画中... 残り ${targetDuration} 秒`;

      clearInterval(recordTimer);
      recordTimer = setInterval(() => {
        elapsed += 1;
        const remaining = Math.max(0, targetDuration - elapsed);
        mainRecText.textContent = `録画中... (残り${remaining}秒)`;
        finalRecText.textContent = `録画中... 残り ${remaining} 秒`;

        if (elapsed >= targetDuration) {
          clearInterval(recordTimer);
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, 1000);

      showToast(`指定した区間のMV録画を開始しました（${targetDuration}秒間）`);
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
      finalRecordBtn.classList.remove('recording');
      mainRecText.textContent = 'MVを録画・保存';
      finalRecText.textContent = `● この長さでMVを録画して保存`;
      showToast('録画を停止しました');
    } else {
      startRecording();
    }
  }

  mainRecordBtn.addEventListener('click', handleRecordToggle);
  stageRecordBtn.addEventListener('click', handleRecordToggle);
  finalRecordBtn.addEventListener('click', handleRecordToggle);

  // Initialize Trimmer Readouts
  updateTrimmerUI();

  // ==========================================
  // Main Animation Loop (60 FPS)
  // ==========================================
  function tick() {
    audioEngine.updateAnalysis(characterRenderer.lipsyncSens);
    characterRenderer.render(audioEngine);

    if (audioEngine.isPlaying) {
      const cur = audioEngine.currentTime;
      const trimLen = audioEngine.getTrimDuration();
      const currentOffset = Math.max(0, cur - audioEngine.trimStart);
      const progressPercent = Math.min(100, (currentOffset / trimLen) * 100);

      controlSongTime.textContent = `${formatTime(cur)} / ${formatTime(audioEngine.trimEnd)}`;
      stageSongTime.textContent = `${formatTime(cur)} / ${formatTime(audioEngine.trimEnd)}`;
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
