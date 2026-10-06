/**
 * GrooveSync MV - Main Controller (Workflow & Audio Trimming)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const viewControls = document.getElementById('viewControls');
  const viewStage = document.getElementById('viewStage');
  const tabBtnControls = document.getElementById('tabBtnControls');
  const tabBtnStage = document.getElementById('tabBtnStage');
  const tabControlsSub = document.getElementById('tabControlsSub');
  const tabStageSub = document.getElementById('tabStageSub');
  const zoomToggleBtn = document.getElementById('zoomToggleBtn');
  const zoomBtnText = document.getElementById('zoomBtnText');
  const zoomStatusBadge = document.getElementById('zoomStatusBadge');
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
  const avatarCardIcon = document.getElementById('avatarCardIcon');
  const avatarPreviewImg = document.getElementById('avatarPreviewImg');

  // Custom Avatar Banner Elements
  const customAvatarBanner = document.getElementById('customAvatarBanner');
  const customAvatarStatusTitle = document.getElementById('customAvatarStatusTitle');
  const customAvatarStatusSub = document.getElementById('customAvatarStatusSub');
  const viewStageFromAvatarBtn = document.getElementById('viewStageFromAvatarBtn');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const resetToPresetBtn = document.getElementById('resetToPresetBtn');
  let savedCustomAvatarCanvas = null;
  let savedCustomAvatarName = '';

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
      const alreadyControls = viewControls.classList.contains('active-view');
      viewControls.classList.add('active-view');
      viewStage.classList.add('hidden');
      tabBtnControls.classList.add('active');
      tabBtnControls.setAttribute('aria-selected', 'true');
      tabBtnStage.classList.remove('active');
      tabBtnStage.setAttribute('aria-selected', 'false');

      if (tabControlsSub) tabControlsSub.textContent = '✔ 現在表示中';
      if (tabStageSub) tabStageSub.textContent = '完成動画を見る →';

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // アニメーション効果で押した反応を明示
      tabBtnControls.classList.remove('pulse-anim');
      void tabBtnControls.offsetWidth; // reflow
      tabBtnControls.classList.add('pulse-anim');

      if (alreadyControls) {
        showToast('✅ すでに「操作画面」を表示しています（下へスクロールして設定できます）');
      } else {
        showToast('🎛️ 操作画面に戻りました');
      }
    } else {
      viewControls.classList.remove('active-view');
      viewStage.classList.remove('hidden');
      tabBtnControls.classList.remove('active');
      tabBtnControls.setAttribute('aria-selected', 'false');
      tabBtnStage.classList.add('active');
      tabBtnStage.setAttribute('aria-selected', 'true');

      if (tabControlsSub) tabControlsSub.textContent = '設定に戻る ←';
      if (tabStageSub) tabStageSub.textContent = '✔ 現在表示中';

      tabBtnStage.classList.remove('pulse-anim');
      void tabBtnStage.offsetWidth;
      tabBtnStage.classList.add('pulse-anim');

      if (!audioEngine.isPlaying) {
        audioEngine.play();
        updatePlayUI(true);
      }
      showToast('🎬 MV映像を全画面表示しました');
    }
  }

  tabBtnControls.addEventListener('click', () => switchView('controls'));
  tabBtnStage.addEventListener('click', () => switchView('stage'));
  jumpToStageBtn.addEventListener('click', () => switchView('stage'));
  backToControlsBtn.addEventListener('click', () => switchView('controls'));

  // ==========================================
  // Super Large Mode (文字・ボタン超特大モード)
  // 視力に不安のあるユーザー向け拡大トグル
  // ==========================================
  function setZoomHuge(enable, showFeedback = true) {
    if (enable) {
      document.body.classList.add('zoom-huge');
      if (zoomBtnText) zoomBtnText.textContent = '文字・ボタンを標準サイズに戻す';
      if (zoomStatusBadge) {
        zoomStatusBadge.textContent = '特大ON';
        zoomStatusBadge.classList.add('active');
      }
      if (zoomToggleBtn) zoomToggleBtn.classList.add('active');
      try { localStorage.setItem('groove_zoom_huge', 'true'); } catch (e) {}
      if (showFeedback) {
        triggerHaptic();
        showToast('🔍 文字とボタンを特大サイズに拡大しました！');
      }
    } else {
      document.body.classList.remove('zoom-huge');
      if (zoomBtnText) zoomBtnText.textContent = '文字・ボタンを特大にする';
      if (zoomStatusBadge) {
        zoomStatusBadge.textContent = '標準';
        zoomStatusBadge.classList.remove('active');
      }
      if (zoomToggleBtn) zoomToggleBtn.classList.remove('active');
      try { localStorage.setItem('groove_zoom_huge', 'false'); } catch (e) {}
      if (showFeedback) {
        triggerHaptic();
        showToast('文字・ボタンを標準サイズに戻しました');
      }
    }
  }

  if (zoomToggleBtn) {
    zoomToggleBtn.addEventListener('click', () => {
      const isCurrentlyHuge = document.body.classList.contains('zoom-huge');
      setZoomHuge(!isCurrentlyHuge, true);
    });
  }

  // 保存設定の自動復元
  try {
    const savedZoom = localStorage.getItem('groove_zoom_huge');
    if (savedZoom === 'true') {
      setZoomHuge(true, false);
    }
  } catch (e) {}

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

      // Reset audio upload button state
      audioUploadBtn.classList.remove('applied');
      audioCardTitle.textContent = 'あなたが制作した楽曲ファイルをアップロード';
      audioUploadHint.textContent = 'MP3, WAV, AAC, M4A 形式に対応（ここをタップ）';

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

      // If user photo was active, remove applied style
      avatarUploadBtn.classList.remove('applied');
      if (avatarCardTitle) {
        if (avatarPreviewImg && !avatarPreviewImg.classList.contains('hidden')) {
          avatarCardTitle.textContent = '自分の写真に切り替える・再選択';
          avatarCardHint.textContent = 'タップして写真を選択（保存された写真または新しい写真）';
        } else {
          avatarCardTitle.textContent = 'あなたが用意した人物の写真をアップロード';
          avatarCardHint.textContent = 'タップしてスマホの写真ライブラリから選択';
        }
      }

      const charId = card.dataset.avatar;
      characterRenderer.setCharacter(charId);
      showToast(`アーティストを「${GROOVE_PRESETS.characters[charId]?.name || charId}」に設定`);
    });
  });

  // Open file picker cleanly on click / tap
  avatarUploadBtn.addEventListener('click', () => {
    triggerHaptic();
    avatarFileInput.click();
  });
  avatarUploadBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHaptic();
      avatarFileInput.click();
    }
  });

  avatarFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    avatarCardTitle.textContent = `読込中: ${file.name}...`;
    avatarCardHint.textContent = '写真を最適化してMVにセットしています...';

    try {
      // 1. Decode image (URL.createObjectURL with FileReader fallback)
      let imgElement = null;
      let tempUrl = null;

      try {
        tempUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Object URL decode error'));
          img.src = tempUrl;
        });
        imgElement = img;
      } catch (objErr) {
        console.warn('URL.createObjectURL failed, falling back to FileReader:', objErr);
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(file);
        });
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('DataURL decode error'));
          img.src = dataUrl;
        });
        imgElement = img;
      } finally {
        if (tempUrl) {
          URL.revokeObjectURL(tempUrl);
        }
      }

      if (!imgElement) {
        throw new Error('画像が取得できませんでした');
      }

      // 2. Crop to square (focusing on head/face for vertical portraits) and downscale to 512x512
      const sw = imgElement.naturalWidth || imgElement.width;
      const sh = imgElement.naturalHeight || imgElement.height;
      const optCanvas = document.createElement('canvas');
      optCanvas.width = 512;
      optCanvas.height = 512;
      const ctx = optCanvas.getContext('2d');

      let sx = 0, sy = 0, sSize = sw;
      if (sh > sw) {
        // Portrait: upper center focus for head/face
        sSize = sw;
        sx = 0;
        sy = Math.min(sh - sw, Math.max(0, (sh - sw) * 0.22));
      } else {
        // Landscape / square: center horizontally
        sSize = sh;
        sx = (sw - sh) / 2;
        sy = 0;
      }

      ctx.drawImage(imgElement, sx, sy, sSize, sSize, 0, 0, 512, 512);

      // 3. Set custom avatar in character renderer
      characterRenderer.setCustomAvatar(optCanvas);

      // 4. Update UI thumbnail preview
      const previewDataUrl = optCanvas.toDataURL('image/jpeg', 0.88);
      if (avatarPreviewImg) {
        avatarPreviewImg.src = previewDataUrl;
        avatarPreviewImg.classList.remove('hidden');
      }
      if (avatarCardIcon) {
        avatarCardIcon.classList.add('hidden');
      }

      avatarUploadBtn.classList.add('applied');
      avatarCardTitle.textContent = `✔ あなたの写真が適用されました！`;
      avatarCardHint.textContent = `${file.name} （タップで別の写真に変更）`;

      // Deactivate presets
      avatarCards.forEach(c => {
        c.classList.remove('active');
        const pill = c.querySelector('.status-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.classList.remove('selected');
        }
      });

      showToast('人物写真をMVに適用しました！「MV映像」で確認できます');
    } catch (err) {
      console.error('Image load error:', err);
      avatarCardTitle.textContent = '写真の読み込みに失敗しました';
      avatarCardHint.textContent = 'JPGまたはPNG形式の写真をお試しください（タップして再選択）';
      showToast('写真の読み込みに失敗しました。別の写真をお試しください。');
    } finally {
      // Clear input value so re-selecting the same file fires change event
      avatarFileInput.value = '';
    }
  });

  // ==========================================
  // User Audio File Upload (Trimming enabled)
  // ==========================================
  audioUploadBtn.addEventListener('click', () => {
    triggerHaptic();
    audioFileInput.click();
  });
  audioUploadBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHaptic();
      audioFileInput.click();
    }
  });

  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      audioUploadHint.textContent = `読込中: ${file.name}...`;
      const res = await audioEngine.loadUserFile(file);
      if (res.success) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        controlSongTitle.textContent = cleanName;
        stageSongTitle.textContent = cleanName;
        audioUploadBtn.classList.add('applied');
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
    } catch (err) {
      console.error('Audio load error:', err);
      audioUploadHint.textContent = 'エラー: 音声ファイルの読み込みに失敗しました';
      showToast('音声の読み込みに失敗しました');
    } finally {
      audioFileInput.value = '';
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
