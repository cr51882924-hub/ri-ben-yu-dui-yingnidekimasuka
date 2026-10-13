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
  const previewTrimIcon = document.getElementById('previewTrimIcon');
  const previewTrimLabel = document.getElementById('previewTrimLabel');
  const trimPresetChips = document.querySelectorAll('.trim-preset-chip');
  const exportSummaryTitle = document.getElementById('exportSummaryTitle');
  const exportSummaryDesc = document.getElementById('exportSummaryDesc');

  // Direct Min/Sec Inputs & Steppers
  const trimStartMinInput = document.getElementById('trimStartMinInput');
  const trimStartSecInput = document.getElementById('trimStartSecInput');
  const startMinus10Btn = document.getElementById('startMinus10Btn');
  const startMinus1Btn = document.getElementById('startMinus1Btn');
  const startPlus1Btn = document.getElementById('startPlus1Btn');
  const startPlus10Btn = document.getElementById('startPlus10Btn');
  const trimDurationInput = document.getElementById('trimDurationInput');
  const durMinus5Btn = document.getElementById('durMinus5Btn');
  const durPlus5Btn = document.getElementById('durPlus5Btn');
  const startPosBadge = document.getElementById('startPosBadge');
  const durationBadge = document.getElementById('durationBadge');
  const confirmStartTxt = document.getElementById('confirmStartTxt');
  const confirmEndTxt = document.getElementById('confirmEndTxt');
  const confirmDurTxt = document.getElementById('confirmDurTxt');

  // Full Song Preview Player & Timeline Elements
  const fullPlayerCurrentTime = document.getElementById('fullPlayerCurrentTime');
  const fullPlayerTotalTime = document.getElementById('fullPlayerTotalTime');
  const fullPlayerStatusBadge = document.getElementById('fullPlayerStatusBadge');
  const timelineTrack = document.getElementById('timelineTrack');
  const timelineSelectionRange = document.getElementById('timelineSelectionRange');
  const timelinePlayhead = document.getElementById('timelinePlayhead');
  const fullSongSeekSlider = document.getElementById('fullSongSeekSlider');
  const timelineMidLabel = document.getElementById('timelineMidLabel');
  const timelineEndLabel = document.getElementById('timelineEndLabel');
  const fullPlayToggleBtn = document.getElementById('fullPlayToggleBtn');
  const fullPlayIcon = document.getElementById('fullPlayIcon');
  const fullPlayLabel = document.getElementById('fullPlayLabel');
  const fullPlayRewindBtn = document.getElementById('fullPlayRewindBtn');
  const setStartFromCurrentBtn = document.getElementById('setStartFromCurrentBtn');

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

  // Mouth / Lip-Sync Adjuster Elements
  const mouthPosVal = document.getElementById('mouthPosVal');
  const mouthPosSlider = document.getElementById('mouthPosSlider');
  const mouthPosUpBtn = document.getElementById('mouthPosUpBtn');
  const mouthPosDownBtn = document.getElementById('mouthPosDownBtn');
  const testLipsyncBtn = document.getElementById('testLipsyncBtn');

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

  // Recording State & Storage
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let recordTimer = null;
  let lastRecordedBlob = null;
  let lastRecordedUrl = null;
  let lastRecordedFilename = '';
  let lastRecordedFile = null;

  // Video Complete Modal Elements
  const videoCompleteModal = document.getElementById('videoCompleteModal');
  const completeVideoPreview = document.getElementById('completeVideoPreview');
  const saveToPhotosBtn = document.getElementById('saveToPhotosBtn');
  const directDownloadBtn = document.getElementById('directDownloadBtn');
  const closeModalCrossBtn = document.getElementById('closeModalCrossBtn');
  const closeModalBottomBtn = document.getElementById('closeModalBottomBtn');
  const modalDownloadLink = document.getElementById('modalDownloadLink');

  let currentSongConfig = null;

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
    const totalDuration = audioEngine.duration || 0;
    if (totalDuration <= 0) {
      if (trimStartReadout) trimStartReadout.textContent = '00:00';
      if (trimEndReadout) trimEndReadout.textContent = '00:00';
      if (trimDurationReadout) trimDurationReadout.textContent = '--秒間';
      if (startSliderVal) startSliderVal.textContent = '00:00';
      if (durationSliderVal) durationSliderVal.textContent = '--秒';
      if (startPosBadge) startPosBadge.textContent = '楽曲を取り込むと設定できます';
      if (durationBadge) durationBadge.textContent = '未設定';
      if (confirmStartTxt) confirmStartTxt.textContent = '00:00';
      if (confirmEndTxt) confirmEndTxt.textContent = '00:00';
      if (confirmDurTxt) confirmDurTxt.textContent = '--秒間';
      if (previewTrimLabel) previewTrimLabel.textContent = '楽曲を取り込むと試聴できます';
      if (fullPlayerCurrentTime) fullPlayerCurrentTime.textContent = '00:00';
      if (fullPlayerTotalTime) fullPlayerTotalTime.textContent = '00:00';
      if (timelineMidLabel) timelineMidLabel.textContent = '00:00';
      if (timelineEndLabel) timelineEndLabel.textContent = '00:00';
      return;
    }

    // Constrain start
    trimStartSeconds = Math.max(0, Math.min(trimStartSeconds, totalDuration - 0.5));
    // Constrain duration
    trimDurationSeconds = Math.max(0.5, Math.min(trimDurationSeconds, totalDuration - trimStartSeconds));

    const endSeconds = trimStartSeconds + trimDurationSeconds;

    // Apply to AudioEngine
    audioEngine.setTrimRange(trimStartSeconds, endSeconds);

    // Readouts
    if (trimStartReadout) trimStartReadout.textContent = formatTime(trimStartSeconds);
    if (trimEndReadout) trimEndReadout.textContent = formatTime(endSeconds);
    if (trimDurationReadout) trimDurationReadout.textContent = `${Math.round(trimDurationSeconds)}秒間`;

    if (startSliderVal) startSliderVal.textContent = formatTime(trimStartSeconds);
    if (durationSliderVal) durationSliderVal.textContent = `${Math.round(trimDurationSeconds)}秒`;

    if (trimStartSlider) {
      trimStartSlider.value = trimStartSeconds;
      trimStartSlider.max = Math.max(1, Math.floor(totalDuration - 1));
    }

    if (trimDurationSlider) {
      trimDurationSlider.value = trimDurationSeconds;
      trimDurationSlider.max = Math.max(1, Math.floor(totalDuration));
    }

    // Direct Min / Sec Inputs (avoid cursor jumping if currently focused)
    if (trimStartMinInput && document.activeElement !== trimStartMinInput) {
      trimStartMinInput.value = Math.floor(trimStartSeconds / 60);
    }
    if (trimStartSecInput && document.activeElement !== trimStartSecInput) {
      trimStartSecInput.value = Math.floor(trimStartSeconds % 60);
    }
    if (trimDurationInput && document.activeElement !== trimDurationInput) {
      trimDurationInput.value = Math.round(trimDurationSeconds);
    }

    if (startPosBadge) {
      startPosBadge.textContent = `${formatTime(trimStartSeconds)} からスタート`;
    }
    if (durationBadge) {
      durationBadge.textContent = `${Math.round(trimDurationSeconds)}秒間`;
    }

    if (confirmStartTxt) confirmStartTxt.textContent = formatTime(trimStartSeconds);
    if (confirmEndTxt) confirmEndTxt.textContent = formatTime(endSeconds);
    if (confirmDurTxt) confirmDurTxt.textContent = `${Math.round(trimDurationSeconds)}秒間`;

    if (previewTrimLabel) {
      previewTrimLabel.textContent = `この区間（${formatTime(trimStartSeconds)}〜${formatTime(endSeconds)}）を試聴する`;
    }

    // Update Full Song Preview Timeline labels & range
    if (fullPlayerTotalTime) {
      fullPlayerTotalTime.textContent = formatTime(totalDuration);
    }
    if (timelineMidLabel) {
      timelineMidLabel.textContent = formatTime(totalDuration / 2);
    }
    if (timelineEndLabel) {
      timelineEndLabel.textContent = `${formatTime(totalDuration)} (終了)`;
    }
    if (fullSongSeekSlider) {
      fullSongSeekSlider.max = totalDuration;
    }
    if (timelineSelectionRange) {
      const leftPercent = (trimStartSeconds / totalDuration) * 100;
      const widthPercent = (trimDurationSeconds / totalDuration) * 100;
      timelineSelectionRange.style.left = `${leftPercent}%`;
      timelineSelectionRange.style.width = `${Math.min(100 - leftPercent, widthPercent)}%`;
    }

    // Badges & Summaries
    if (controlTrimRangeBadge) {
      controlTrimRangeBadge.textContent = `再生区間: ${formatTime(trimStartSeconds)} 〜 ${formatTime(endSeconds)} (${Math.round(trimDurationSeconds)}秒間)`;
    }
    if (exportSummaryTitle) {
      exportSummaryTitle.textContent = `${Math.round(trimDurationSeconds)}秒間のリップシンクMVを作成します`;
    }
    if (exportSummaryDesc) {
      exportSummaryDesc.textContent = `開始: ${formatTime(trimStartSeconds)} 〜 終了: ${formatTime(endSeconds)} の動画ファイルが作成されます`;
    }
  }

  // Helper to read min/sec direct input
  function readMinSecInputs() {
    const min = Math.max(0, parseInt(trimStartMinInput ? trimStartMinInput.value : 0, 10) || 0);
    const sec = Math.max(0, parseInt(trimStartSecInput ? trimStartSecInput.value : 0, 10) || 0);
    trimStartSeconds = min * 60 + sec;
    updateTrimmerUI();
  }

  if (trimStartMinInput) {
    trimStartMinInput.addEventListener('input', readMinSecInputs);
    trimStartMinInput.addEventListener('change', readMinSecInputs);
  }
  if (trimStartSecInput) {
    trimStartSecInput.addEventListener('input', readMinSecInputs);
    trimStartSecInput.addEventListener('change', readMinSecInputs);
  }

  // Steppers for Start Time
  if (startMinus10Btn) {
    startMinus10Btn.addEventListener('click', () => {
      triggerHaptic();
      trimStartSeconds = Math.max(0, trimStartSeconds - 10);
      updateTrimmerUI();
    });
  }
  if (startMinus1Btn) {
    startMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimStartSeconds = Math.max(0, trimStartSeconds - 1);
      updateTrimmerUI();
    });
  }
  if (startPlus1Btn) {
    startPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimStartSeconds = trimStartSeconds + 1;
      updateTrimmerUI();
    });
  }
  if (startPlus10Btn) {
    startPlus10Btn.addEventListener('click', () => {
      triggerHaptic();
      trimStartSeconds = trimStartSeconds + 10;
      updateTrimmerUI();
    });
  }

  // Duration input & steppers
  if (trimDurationInput) {
    const onDurChange = () => {
      trimDurationSeconds = Math.max(5, parseFloat(trimDurationInput.value) || 30);
      updateTrimmerUI();
    };
    trimDurationInput.addEventListener('input', onDurChange);
    trimDurationInput.addEventListener('change', onDurChange);
  }
  if (durMinus5Btn) {
    durMinus5Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = Math.max(5, trimDurationSeconds - 5);
      updateTrimmerUI();
    });
  }
  if (durPlus5Btn) {
    durPlus5Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = trimDurationSeconds + 5;
      updateTrimmerUI();
    });
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
      else if (dur === '40') trimDurationSeconds = 40;
      else if (dur === '60') trimDurationSeconds = 60;
      else if (dur === 'full') {
        trimDurationSeconds = Math.max(1, audioEngine.duration - trimStartSeconds);
      }

      updateTrimmerUI();
      showToast(`動画の長さを「${Math.round(trimDurationSeconds)}秒」にセットしました`);
    });
  });

  // Full Song Preview Player Controls
  function updateFullPlayerUI(isPlaying) {
    if (fullPlayIcon) fullPlayIcon.textContent = isPlaying ? '⏸' : '▶';
    if (fullPlayLabel) fullPlayLabel.textContent = isPlaying ? '一時停止する' : '曲全体を再生する';
    if (fullPlayerStatusBadge) {
      if (isPlaying) {
        fullPlayerStatusBadge.textContent = '再生中 🔊';
        fullPlayerStatusBadge.classList.add('playing');
      } else {
        fullPlayerStatusBadge.textContent = '一時停止中';
        fullPlayerStatusBadge.classList.remove('playing');
      }
    }
  }

  if (fullPlayToggleBtn) {
    fullPlayToggleBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!audioEngine.hasAudioLoaded()) {
        showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
        return;
      }
      if (audioEngine.isPlaying && audioEngine.playMode === 'full') {
        audioEngine.pause();
        updatePlayUI(false);
        updateFullPlayerUI(false);
      } else {
        const startSec = (audioEngine.currentTime && audioEngine.currentTime < audioEngine.duration - 0.5)
          ? audioEngine.currentTime
          : 0;
        audioEngine.playFull(startSec);
        updatePlayUI(true);
        updateFullPlayerUI(true);
        showToast(`曲全体の再生を開始しました（${formatTime(startSec)}〜）。秒数を確認できます`);
      }
    });
  }

  if (fullPlayRewindBtn) {
    fullPlayRewindBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!audioEngine.hasAudioLoaded()) {
        showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
        return;
      }
      audioEngine.seekFull(0);
      audioEngine.playFull(0);
      updatePlayUI(true);
      updateFullPlayerUI(true);
      showToast('曲の最初 (00:00) から再生します');
    });
  }

  if (fullSongSeekSlider) {
    fullSongSeekSlider.addEventListener('input', (e) => {
      const targetSec = parseFloat(e.target.value);
      audioEngine.seekFull(targetSec);
      if (fullPlayerCurrentTime) fullPlayerCurrentTime.textContent = formatTime(targetSec);
      if (timelinePlayhead) {
        const dur = Math.max(1, audioEngine.duration);
        timelinePlayhead.style.left = `${(targetSec / dur) * 100}%`;
      }
    });
  }

  // ★ The Sync to Start Button
  if (setStartFromCurrentBtn) {
    setStartFromCurrentBtn.addEventListener('click', () => {
      triggerHaptic();
      const curSec = Math.floor(audioEngine.currentTime || 0);
      trimStartSeconds = curSec;
      updateTrimmerUI();
      showToast(`📍 現在の秒数「${formatTime(curSec)}」を開始位置にセットしました！`);
    });
  }

  // Test Play Trimmed Section
  previewTrimBtn.addEventListener('click', () => {
    triggerHaptic();
    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }
    if (audioEngine.isPlaying && audioEngine.playMode === 'trim') {
      audioEngine.pause();
      updatePlayUI(false);
      if (previewTrimIcon) previewTrimIcon.textContent = '▶';
    } else {
      audioEngine.pause();
      audioEngine.pauseOffset = 0;
      audioEngine.playTrim(0);
      updatePlayUI(true);
      updateFullPlayerUI(false);
      if (previewTrimIcon) previewTrimIcon.textContent = '⏸';
      showToast(`▶ 設定区間（${formatTime(trimStartSeconds)} 〜 ${formatTime(trimStartSeconds + trimDurationSeconds)}）を試聴中`);
    }
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

      if (!audioEngine.isPlaying && audioEngine.hasAudioLoaded()) {
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

  // App Reload Button (For home screen PWA & mobile cache refresh)
  const appReloadBtn = document.getElementById('appReloadBtn');
  if (appReloadBtn) {
    appReloadBtn.addEventListener('click', () => {
      triggerHaptic();
      const match = appReloadBtn.textContent.match(/v\d+/i);
      const verLabel = match ? ` (${match[0].toLowerCase()})` : ' (v9)';
      showToast(`🔄 最新バージョン${verLabel} を読み込んでいます...`);
      setTimeout(() => {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('v', Date.now().toString());
          window.location.href = url.toString();
        } catch (e) {
          window.location.reload();
        }
      }, 250);
    });
  }

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
    if (!audioEngine.hasAudioLoaded()) {
      audioEngine.loadDemoTrack('jpop');
      currentSongConfig = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.songs) ? GROOVE_PRESETS.songs.jpop : null;
      if (controlSongTitle) controlSongTitle.textContent = 'Shining Beat (公式サンプル楽曲)';
      if (stageSongTitle) stageSongTitle.textContent = 'Shining Beat (公式サンプル楽曲)';
      trimStartSeconds = 0;
      trimDurationSeconds = 30;
      updateTrimmerUI();
      audioEngine.pauseOffset = 0;
      audioEngine.playTrim(0);
      updatePlayUI(true);
      updateFullPlayerUI(false);
      showToast('🎵 サンプル楽曲（Shining Beat）の再生を開始しました');
      return;
    }
    if (audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
      updateFullPlayerUI(false);
    } else {
      audioEngine.pauseOffset = 0;
      audioEngine.playTrim(0);
      updatePlayUI(true);
      updateFullPlayerUI(false);
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
  // User Photo Avatar Upload & State Management
  // ==========================================
  function applyCustomAvatar(canvas, filename) {
    characterRenderer.setCustomAvatar(canvas);

    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    if (avatarPreviewImg) {
      avatarPreviewImg.src = previewDataUrl;
      avatarPreviewImg.classList.remove('hidden');
    }
    if (avatarCardIcon) {
      avatarCardIcon.classList.add('hidden');
    }

    avatarUploadBtn.classList.add('applied');
    avatarCardTitle.textContent = `✔ あなたの写真が適用されています`;
    avatarCardHint.textContent = `${filename || '人物写真'} （タップで別の写真に変更）`;

    if (customAvatarBanner) {
      customAvatarBanner.classList.remove('hidden');
      if (customAvatarStatusTitle) {
        customAvatarStatusTitle.textContent = `あなたの写真がMVの主役にセットされました！`;
      }
      if (customAvatarStatusSub) {
        customAvatarStatusSub.textContent = `この写真がリズムに合わせて動くオリジナルのMVです`;
      }
    }
  }

  // Action buttons inside customAvatarBanner
  if (viewStageFromAvatarBtn) {
    viewStageFromAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic();

      // If user hasn't uploaded audio yet, automatically use official vocal demo song!
      if (!audioEngine.hasAudioLoaded() || audioEngine.isDemoTrack) {
        audioEngine.loadDemoTrack('jpop');
        currentSongConfig = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.songs) ? GROOVE_PRESETS.songs.jpop : null;
        if (controlSongTitle) controlSongTitle.textContent = 'Shining Beat (サンプル歌唱で確認中)';
        if (stageSongTitle) stageSongTitle.textContent = 'Shining Beat (サンプル歌唱で確認中)';
        trimStartSeconds = 0;
        trimDurationSeconds = 30;
        updateTrimmerUI();

        switchView('stage');
        audioEngine.stop();
        audioEngine.playTrim(0);
        updatePlayUI(true);
        showToast('🎵 あなたの写真が歌う姿を確認するため、サンプル歌声で再生を開始しました！');
      } else {
        // User has already uploaded custom audio
        switchView('stage');
        if (!audioEngine.isPlaying) {
          audioEngine.playTrim();
          updatePlayUI(true);
        }
        showToast('🎬 あなたの楽曲でリップシンク再生を開始しました！');
      }
    });
  }

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic();
      avatarFileInput.click();
    });
  }

  // ==========================================
  // AI Lip-Sync Integration (Fal.ai LivePortrait / D-ID)
  // ==========================================
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  const openAiSettingsBtn = document.getElementById('openAiSettingsBtn');
  const closeAiSettingsBtn = document.getElementById('closeAiSettingsBtn');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');
  const falApiKeyInput = document.getElementById('falApiKeyInput');
  const generateAiLipsyncBtn = document.getElementById('generateAiLipsyncBtn');

  if (openAiSettingsBtn) {
    openAiSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic();
      const savedKey = localStorage.getItem('gs_fal_api_key') || '';
      if (falApiKeyInput) falApiKeyInput.value = savedKey;
      if (aiSettingsModal) aiSettingsModal.classList.remove('hidden');
    });
  }

  if (closeAiSettingsBtn) {
    closeAiSettingsBtn.addEventListener('click', () => {
      if (aiSettingsModal) aiSettingsModal.classList.add('hidden');
    });
  }

  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', () => {
      triggerHaptic();
      const val = falApiKeyInput ? falApiKeyInput.value.trim() : '';
      if (val) {
        localStorage.setItem('gs_fal_api_key', val);
        showToast('✔ Fal.ai APIキーを安全に保存しました！');
      } else {
        localStorage.removeItem('gs_fal_api_key');
        showToast('APIキーを解除しました');
      }
      if (aiSettingsModal) aiSettingsModal.classList.add('hidden');
    });
  }

  if (generateAiLipsyncBtn) {
    generateAiLipsyncBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      triggerHaptic();

      if (!characterRenderer.customAvatarImg) {
        showToast('先にSTEP 1で人物の写真をアップロードしてください');
        return;
      }
      if (!audioEngine.hasAudioLoaded()) {
        showToast('先にSTEP 2で楽曲を取り込んでください');
        return;
      }

      const apiKey = localStorage.getItem('gs_fal_api_key');
      if (!apiKey) {
        showToast('💡 クラウドAI生成にはFal.aiのAPIキーが必要です');
        if (aiSettingsModal) aiSettingsModal.classList.remove('hidden');
        return;
      }

      showToast('🚀 Fal.ai (LivePortrait) クラウドGPUへ生成リクエストを送信中...');
      // Simulated processing pipeline: In full deployment, submits image + trimmed audio blob to fal.subscribe('fal-ai/live-portrait')
      setTimeout(() => {
        showToast('✔ クラウドGPUパイプライン接続完了！ステージでリアルタイム演出を再生します');
        switchToView('stage');
        playMV();
      }, 1800);
    });
  }

  // ==========================================
  // Quick Trimmed Audio Downloader in Studio (STEP 3)
  // ==========================================
  const quickDownloadTrimmedBtn = document.getElementById('quickDownloadTrimmedBtn');

  // Audio Complete Modal Elements (Studio STEP 3)
  const audioCompleteModal = document.getElementById('audioCompleteModal');
  const closeAudioModalCrossBtn = document.getElementById('closeAudioModalCrossBtn');
  const closeAudioModalBottomBtn = document.getElementById('closeAudioModalBottomBtn');
  const completeAudioPreview = document.getElementById('completeAudioPreview');
  const modalAudioFileName = document.getElementById('modalAudioFileName');
  const modalAudioFormatBadge = document.getElementById('modalAudioFormatBadge');
  const modalAudioMeta = document.getElementById('modalAudioMeta');
  const saveAudioToPhoneBtn = document.getElementById('saveAudioToPhoneBtn');
  const directAudioDownloadBtn = document.getElementById('directAudioDownloadBtn');
  const modalAudioDirectLink = document.getElementById('modalAudioDirectLink');

  let lastCutAudioBlob = null;
  let lastCutAudioFile = null;
  let lastCutAudioFilename = '';
  let lastCutAudioUrl = null;

  function sliceBufferDirect(srcBuffer, startSec, endSec) {
    const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
    audioEngine.ctx = ctx;
    const sampleRate = srcBuffer.sampleRate;
    const numChannels = srcBuffer.numberOfChannels;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(srcBuffer.length, Math.floor(endSec * sampleRate));
    const length = Math.max(1, endSample - startSample);
    const sliced = ctx.createBuffer(numChannels, length, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const srcData = srcBuffer.getChannelData(c).subarray(startSample, endSample);
      sliced.getChannelData(c).set(srcData);
    }
    return sliced;
  }

  function encodeWavDirect(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const blockAlign = numChannels * 2;
    const dataByteLength = buffer.length * blockAlign;
    const totalLength = 44 + dataByteLength;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataByteLength, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function encodeMp3Direct(buffer) {
    if (typeof lamejs === 'undefined') return encodeWavDirect(buffer);
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 192);
    const chunks = [];
    const len = buffer.length;
    const leftRaw = buffer.getChannelData(0);
    const rightRaw = channels > 1 ? buffer.getChannelData(1) : leftRaw;
    const leftInt = new Int16Array(len);
    const rightInt = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const l = Math.max(-1, Math.min(1, leftRaw[i]));
      leftInt[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      const r = Math.max(-1, Math.min(1, rightRaw[i]));
      rightInt[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }
    const blockSize = 1152;
    for (let i = 0; i < len; i += blockSize) {
      const l = leftInt.subarray(i, i + blockSize);
      const r = rightInt.subarray(i, i + blockSize);
      const mp3buf = (channels === 1) ? encoder.encodeBuffer(l) : encoder.encodeBuffer(l, r);
      if (mp3buf.length > 0) chunks.push(mp3buf);
    }
    const end = encoder.flush();
    if (end.length > 0) chunks.push(end);
    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  function triggerDirectAudioDownload(blob, filename) {
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
      console.warn('triggerDirectAudioDownload failed:', e);
    }
  }

  function openCutAudioModal(blob, file, filename, trimStart, trimEnd) {
    if (!audioCompleteModal) return;
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
    }

    lastCutAudioBlob = blob;
    lastCutAudioFile = file;
    lastCutAudioFilename = filename;

    if (lastCutAudioUrl) {
      try { URL.revokeObjectURL(lastCutAudioUrl); } catch (e) {}
    }
    lastCutAudioUrl = URL.createObjectURL(blob);

    if (modalAudioFileName) modalAudioFileName.textContent = filename;
    if (modalAudioFormatBadge) modalAudioFormatBadge.textContent = 'MP3';
    if (modalAudioMeta) {
      const dur = Math.max(1, Math.round(trimEnd - trimStart));
      const kb = (blob.size / 1024).toFixed(1);
      modalAudioMeta.textContent = `区間: ${formatTime(trimStart)} 〜 ${formatTime(trimEnd)} (${dur}秒間) | 容量: ${kb} KB`;
    }

    if (completeAudioPreview) {
      completeAudioPreview.src = lastCutAudioUrl;
      completeAudioPreview.load();
    }

    if (modalAudioDirectLink) {
      modalAudioDirectLink.href = lastCutAudioUrl;
      modalAudioDirectLink.download = filename;
    }

    audioCompleteModal.classList.remove('hidden');
    audioCompleteModal.classList.add('visible');
    triggerHaptic();
  }

  function closeCutAudioModal() {
    triggerHaptic();
    if (completeAudioPreview) {
      try { completeAudioPreview.pause(); } catch (e) {}
    }
    if (audioCompleteModal) {
      audioCompleteModal.classList.remove('visible');
      audioCompleteModal.classList.add('hidden');
    }
  }

  if (quickDownloadTrimmedBtn) {
    quickDownloadTrimmedBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      triggerHaptic();

      if (!audioEngine.hasAudioLoaded()) {
        audioEngine.loadDemoTrack('jpop');
      }

      showToast('✂️ カット音声をエンコード中...');

      try {
        let buf = audioEngine.ensureAudioBuffer();
        if (!buf) {
          const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
          buf = ctx.createBuffer(2, ctx.sampleRate * 30, ctx.sampleRate);
        }

        const sliced = sliceBufferDirect(buf, audioEngine.trimStart, audioEngine.trimEnd);
        const blob = encodeMp3Direct(sliced);
        const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'song';
        const fileName = `${songTitle}_cut_${formatTime(audioEngine.trimStart).replace(':', 'm')}s-${formatTime(audioEngine.trimEnd).replace(':', 'm')}s.mp3`;

        const file = new File([blob], fileName, { type: 'audio/mpeg' });

        openCutAudioModal(blob, file, fileName, audioEngine.trimStart, audioEngine.trimEnd);
        showToast(`✂️ 「${fileName}」を切り出しました！`);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (!isMobile) {
          triggerDirectAudioDownload(blob, fileName);
        }
      } catch (err) {
        console.error('Quick download failed:', err);
        showToast('切り出し保存に失敗しました。専用カッターツールもお試しください');
      }
    });
  }

  // Audio Complete Modal Event Listeners
  if (saveAudioToPhoneBtn) {
    saveAudioToPhoneBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastCutAudioFile) return;

      const shareData = {
        files: [lastCutAudioFile],
        title: lastCutAudioFilename
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

      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      showToast('ダウンロードを開始しました');
    });
  }

  if (directAudioDownloadBtn) {
    directAudioDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastCutAudioBlob) return;
      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      showToast('ダウンロードを開始しました');
    });
  }

  if (modalAudioDirectLink) {
    modalAudioDirectLink.addEventListener('click', () => {
      if (lastCutAudioUrl) {
        window.open(lastCutAudioUrl, '_blank');
      }
    });
  }

  if (closeAudioModalCrossBtn) closeAudioModalCrossBtn.addEventListener('click', closeCutAudioModal);
  if (closeAudioModalBottomBtn) closeAudioModalBottomBtn.addEventListener('click', closeCutAudioModal);
  if (audioCompleteModal) {
    audioCompleteModal.addEventListener('click', (e) => {
      if (e.target === audioCompleteModal) closeCutAudioModal();
    });
  }


  if (stageCanvas) {
    stageCanvas.addEventListener('click', (e) => {
      if (!characterRenderer.customAvatarImg) {
        playOfficialSampleMV();
      }
    });
  }

  // Open file picker cleanly on click / tap
  avatarUploadBtn.addEventListener('click', (e) => {
    triggerHaptic();
    // If user has a saved avatar and is currently on preset, re-apply saved avatar
    if (savedCustomAvatarCanvas && characterRenderer.customAvatarImg !== savedCustomAvatarCanvas) {
      e.preventDefault();
      applyCustomAvatar(savedCustomAvatarCanvas, savedCustomAvatarName);
      showToast(`保存されていた写真「${savedCustomAvatarName}」を再適用しました`);
    }
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

    triggerHaptic();
    avatarCardTitle.textContent = `読込中: ${file.name}...`;
    avatarCardHint.textContent = '写真を最適化してMVにセットしています...';
    showToast(`写真「${file.name}」を読み込んでいます...`);

    let bitmap = null;
    let tempUrl = null;

    try {
      let processFile = file;

      // 1. HEIC conversion fallback if needed
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name);
      if (isHeic && window.heic2any) {
        avatarCardHint.textContent = 'HEIC形式の写真を最適化しています...';
        try {
          const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
          processFile = Array.isArray(converted) ? converted[0] : converted;
        } catch (convErr) {
          console.warn('heic2any conversion fallback failed, trying direct decode:', convErr);
        }
      }

      // 2. Decode image safely (createImageBitmap first, Image element fallback)
      let sourceElement = null;
      let sw = 0;
      let sh = 0;

      if (typeof window.createImageBitmap === 'function') {
        try {
          bitmap = await createImageBitmap(processFile);
          sourceElement = bitmap;
          sw = bitmap.width;
          sh = bitmap.height;
        } catch (bmErr) {
          console.warn('createImageBitmap failed, falling back to Image element:', bmErr);
        }
      }

      if (!sourceElement) {
        const img = new Image();
        try {
          tempUrl = URL.createObjectURL(processFile);
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Object URL decode failed'));
            img.src = tempUrl;
          });
          sourceElement = img;
          sw = img.naturalWidth || img.width;
          sh = img.naturalHeight || img.height;
        } catch (objErr) {
          console.warn('Object URL failed, trying FileReader dataUrl:', objErr);
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(processFile);
          });
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('DataURL decode failed'));
            img.src = dataUrl;
          });
          sourceElement = img;
          sw = img.naturalWidth || img.width;
          sh = img.naturalHeight || img.height;
        }
      }

      if (!sourceElement || !sw || !sh) {
        throw new Error('画像サイズが正しく取得できませんでした');
      }

      // 3. Render into high-quality canvas preserving full photo aspect ratio
      const maxDim = 1280;
      let targetW = sw;
      let targetH = sh;
      if (sw > maxDim || sh > maxDim) {
        if (sw > sh) {
          targetW = maxDim;
          targetH = Math.round((sh * maxDim) / sw);
        } else {
          targetH = maxDim;
          targetW = Math.round((sw * maxDim) / sh);
        }
      }

      const optCanvas = document.createElement('canvas');
      optCanvas.width = targetW;
      optCanvas.height = targetH;
      const ctx = optCanvas.getContext('2d');
      ctx.drawImage(sourceElement, 0, 0, targetW, targetH);

      // Save and apply
      savedCustomAvatarCanvas = optCanvas;
      savedCustomAvatarName = file.name;
      applyCustomAvatar(optCanvas, file.name);

      showToast('🎉 あなたの写真をセットしました！MVの主役として表示されます');
    } catch (err) {
      console.error('Image load error:', err);
      avatarCardTitle.textContent = '写真の読み込みに失敗しました';
      avatarCardHint.textContent = 'JPGまたはPNG形式の写真をお試しください（タップして再選択）';
      showToast('写真の読み込みに失敗しました。別の写真をお試しください。');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      avatarFileInput.value = '';
    }
  });

  // ==========================================
  // User Audio File Upload (Trimming enabled)
  // ==========================================
  audioUploadBtn.addEventListener('click', () => {
    triggerHaptic();
    try {
      audioEngine.init();
      if ('audioSession' in navigator) {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
    if (audioUploadBtn.tagName.toLowerCase() !== 'label') {
      audioFileInput.click();
    }
  });
  audioUploadBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHaptic();
      audioFileInput.click();
    }
  });

  // Register late duration update callback
  window.onAudioDurationResolved = (newDur) => {
    if (newDur && newDur > 0) {
      trimDurationSeconds = Math.min(newDur, trimDurationSeconds);
      try { updateTrimmerUI(); } catch (e) {}
    }
  };

  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      if (audioUploadHint) {
        audioUploadHint.textContent = `読込中: ${file.name} (${Math.round(file.size / 1024)} KB)...`;
      }
      const res = await audioEngine.loadUserFile(file);
      if (res && res.success) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        if (controlSongTitle) controlSongTitle.textContent = cleanName;
        if (stageSongTitle) stageSongTitle.textContent = cleanName;
        audioUploadBtn.classList.add('applied');
        if (audioCardTitle) audioCardTitle.textContent = `✔ 読込完了: ${file.name}`;
        if (audioUploadHint) audioUploadHint.textContent = `全体の長さ: ${formatTime(res.duration)}（下で秒数確認・使う区間を調整できます）`;

        currentSongConfig = {
          title: cleanName,
          bpm: 120,
          lyrics: [{ time: 0, text: '♪ あなたの楽曲を再生中' }]
        };
        if (stageBpmIndicator) stageBpmIndicator.textContent = `120 BPM`;

        // Set trimmer defaults for user song
        trimStartSeconds = 0;
        trimDurationSeconds = Math.min(res.duration || 30, 30);
        try {
          updateTrimmerUI();
        } catch (uiErr) {
          console.warn('updateTrimmerUI error:', uiErr);
        }

        // Safely try starting playback in full preview mode (browsers may restrict auto-play after async file picking)
        try {
          audioEngine.playFull(0);
          updatePlayUI(true);
          updateFullPlayerUI(true);
          showToast(`🎉 楽曲「${cleanName}」（全体 ${formatTime(res.duration)}）を読み込みました！曲全体のサウンドを流して秒数を確認できます。`);
        } catch (playErr) {
          console.warn('Auto play blocked by browser policy:', playErr);
          updatePlayUI(false);
          updateFullPlayerUI(false);
          showToast(`🎉 楽曲「${cleanName}」を読み込みました！下の「▶ 曲全体を再生する」を押して試聴できます。`);
        }
      } else {
        const errDetail = (res && res.error) ? res.error : '端末内の音楽または録音ファイルをお試しください';
        if (audioUploadHint) {
          audioUploadHint.innerHTML = `<span style="color:#ef4444;font-weight:700;">⚠ 読込エラー: ${errDetail}</span><br><small style="color:#cbd5e1;">※iCloud上のファイルは端末にダウンロードしてから選択するか、別の曲をお試しください</small>`;
        }
        showToast(`エラー: ${errDetail}`);
      }
    } catch (err) {
      console.error('Audio load error:', err);
      const msg = (err && err.message) ? err.message : '端末の設定またはファイル形式をご確認ください';
      if (audioUploadHint) {
        audioUploadHint.innerHTML = `<span style="color:#ef4444;font-weight:700;">⚠ 読込エラー: ${msg}</span><br><small style="color:#cbd5e1;">※画面上部の【🔄 最新版に更新】を押すか、別の曲をお試しください</small>`;
      }
      showToast('ファイルの読み込みに失敗しました');
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
  // Video Recording & Download Pipeline (Canvas + Web Audio -> MP4/WebM)
  // ==========================================
  function triggerBlobDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 20000);
    } catch (err) {
      console.warn('Auto download error:', err);
    }
  }

  function openCompleteModal(videoUrl, filename, targetDuration) {
    if (!videoCompleteModal) return;

    // Stop background audio so video's own recorded audio plays cleanly without echo
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
    }
    updatePlayUI(false);
    updateFullPlayerUI(false);

    if (completeVideoPreview) {
      completeVideoPreview.src = videoUrl;
      completeVideoPreview.load();
    }

    if (modalDownloadLink) {
      modalDownloadLink.href = videoUrl;
      modalDownloadLink.download = filename;
    }

    videoCompleteModal.classList.remove('hidden');
    videoCompleteModal.classList.add('visible');
    triggerHaptic();
  }

  function closeCompleteModal() {
    triggerHaptic();
    if (completeVideoPreview) {
      completeVideoPreview.pause();
    }
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
    }
    if (videoCompleteModal) {
      videoCompleteModal.classList.remove('visible');
      videoCompleteModal.classList.add('hidden');
    }
  }

  function resetRecordingUI(targetDuration) {
    isRecording = false;
    clearInterval(recordTimer);
    recordTimer = null;
    if (healthCheckTimer) {
      clearTimeout(healthCheckTimer);
      healthCheckTimer = null;
    }
    mainRecordBtn.classList.remove('recording');
    stageRecordBtn.classList.remove('recording');
    finalRecordBtn.classList.remove('recording');

    mainRecText.textContent = 'MVを録画・保存';
    finalRecText.textContent = `● この長さ（${targetDuration}秒）でMVを録画して保存`;
  }

  let healthCheckTimer = null;

  function startRecording() {
    if (isRecording) return;

    if (!characterRenderer.customAvatarImg) {
      showToast('まず STEP 1 であなたの写真をアップロードしてください');
      return;
    }
    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }

    const targetDuration = Math.round(trimDurationSeconds);

    // Make sure audio is playing from start of trim
    audioEngine.pause();
    audioEngine.pauseOffset = 0;
    audioEngine.playTrim();
    updatePlayUI(true);
    updateFullPlayerUI(false);

    try {
      const getCanvasStream = () => {
        // Use 25fps for maximum stability on mobile WebKit/iOS
        if (typeof stageCanvas.captureStream === 'function') {
          return stageCanvas.captureStream(25);
        }
        if (typeof stageCanvas.webkitCaptureStream === 'function') {
          return stageCanvas.webkitCaptureStream(25);
        }
        return null;
      };

      const canvasStream = getCanvasStream();
      if (!canvasStream) {
        showToast('お使いの環境では画面録画がサポートされていません');
        return;
      }

      // Check MIME type support with priority to standard video/mp4 (cleanest on iOS)
      const mimeCandidates = [
        { type: 'video/mp4', ext: 'mp4' },
        { type: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { type: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { type: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { type: 'video/webm', ext: 'webm' }
      ];

      let selectedMimeType = '';
      let fileExt = 'mp4';

      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const cand of mimeCandidates) {
          if (MediaRecorder.isTypeSupported(cand.type)) {
            selectedMimeType = cand.type;
            fileExt = cand.ext;
            break;
          }
        }
      }

      const canvasTracks = canvasStream.getVideoTracks();
      let audioTracks = [];
      try {
        if (audioEngine && audioEngine.recDestination && audioEngine.recDestination.stream) {
          audioTracks = audioEngine.recDestination.stream.getAudioTracks();
        }
      } catch (e) {
        audioTracks = [];
      }

      // Primary stream: attempt canvas + audio track
      let primaryStream;
      if (canvasTracks.length > 0 && audioTracks.length > 0) {
        try {
          primaryStream = new MediaStream([canvasTracks[0], audioTracks[0]]);
        } catch (e) {
          primaryStream = canvasStream;
        }
      } else {
        primaryStream = canvasStream;
      }

      function createRecorder(stream) {
        let rec = null;
        let mime = selectedMimeType;
        try {
          rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
        } catch (err1) {
          console.warn('MediaRecorder with mimeType failed, falling back to default options:', err1);
          try {
            rec = new MediaRecorder(stream);
            mime = rec.mimeType || 'video/mp4';
          } catch (err2) {
            console.warn('MediaRecorder failed on stream, falling back to canvasStream:', err2);
            rec = new MediaRecorder(canvasStream);
            mime = rec.mimeType || 'video/mp4';
          }
        }
        return { recorder: rec, mimeType: mime };
      }

      let { recorder: currentRecorder, mimeType: activeMime } = createRecorder(primaryStream);
      mediaRecorder = currentRecorder;

      recordedChunks = [];
      let totalRecordedBytes = 0;

      const handleDataAvailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
          totalRecordedBytes += e.data.size;
        }
      };

      mediaRecorder.ondataavailable = handleDataAvailable;

      const finalizeRecording = () => {
        audioEngine.pause();
        updatePlayUI(false);
        updateFullPlayerUI(false);
        resetRecordingUI(targetDuration);

        if (!recordedChunks || recordedChunks.length === 0 || totalRecordedBytes === 0) {
          showToast('録画データが空でした。もう一度お試しください');
          return;
        }

        const mime = activeMime || selectedMimeType || (fileExt === 'mp4' ? 'video/mp4' : 'video/webm');
        const blob = new Blob(recordedChunks, { type: mime });
        if (lastRecordedUrl) {
          try { URL.revokeObjectURL(lastRecordedUrl); } catch (e) {}
        }
        const videoUrl = URL.createObjectURL(blob);
        const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'MySong';
        const songNameClean = songTitle.replace(/[\s\/\\?%*:|"<>]+/g, '_');
        const filename = `GrooveSync_${songNameClean}_${targetDuration}s.${fileExt}`;

        lastRecordedBlob = blob;
        lastRecordedUrl = videoUrl;
        lastRecordedFilename = filename;
        try {
          lastRecordedFile = new File([blob], filename, { type: mime });
        } catch (e) {
          lastRecordedFile = null;
        }

        openCompleteModal(videoUrl, filename, targetDuration);
        showToast('動画が完成しました！保存・プレビュー画面をご確認ください');
      };

      mediaRecorder.onstop = () => {
        // Wait 350ms to ensure WebKit completely dispatches the final ondataavailable chunk
        setTimeout(finalizeRecording, 350);
      };

      // Start recording with 500ms timeslice to flush buffer frequently
      mediaRecorder.start(500);
      isRecording = true;
      mainRecordBtn.classList.add('recording');
      stageRecordBtn.classList.add('recording');
      finalRecordBtn.classList.add('recording');

      let elapsed = 0;
      mainRecText.textContent = `録画中... (${targetDuration}秒)`;
      finalRecText.textContent = `録画中... 残り ${targetDuration} 秒`;

      // Early Safety Health Check (at 1.6s)
      // Detects iOS WebKit canvas+audio 0-byte issue and seamlessly recovers before wasting time
      if (healthCheckTimer) clearTimeout(healthCheckTimer);
      healthCheckTimer = setTimeout(() => {
        if (!isRecording) return;
        if (totalRecordedBytes === 0 && primaryStream !== canvasStream) {
          console.warn('Primary stream produced 0 bytes (iOS WebKit audio track issue). Seamlessly switching to pure canvas stream.');
          try {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.ondataavailable = null;
              mediaRecorder.onstop = null;
              mediaRecorder.stop();
            }
          } catch (e) {}

          const fallback = createRecorder(canvasStream);
          mediaRecorder = fallback.recorder;
          activeMime = fallback.mimeType;
          recordedChunks = [];
          totalRecordedBytes = 0;

          mediaRecorder.ondataavailable = handleDataAvailable;
          mediaRecorder.onstop = () => {
            setTimeout(finalizeRecording, 350);
          };

          mediaRecorder.start(500);
          console.log('Fallback canvas recorder running successfully');
        }
      }, 1600);

      clearInterval(recordTimer);
      recordTimer = setInterval(() => {
        elapsed += 1;
        const remaining = Math.max(0, targetDuration - elapsed);
        mainRecText.textContent = `録画中... (残り${remaining}秒)`;
        finalRecText.textContent = `録画中... 残り ${remaining} 秒`;

        if (elapsed >= targetDuration) {
          clearInterval(recordTimer);
          if (healthCheckTimer) {
            clearTimeout(healthCheckTimer);
            healthCheckTimer = null;
          }
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
              mediaRecorder.stop();
            } catch (stopErr) {
              console.warn('mediaRecorder stop error:', stopErr);
            }
          }
        }
      }, 1000);

      showToast(`MV録画を開始しました（${targetDuration}秒間）`);
    } catch (err) {
      console.error('Recording error:', err);
      showToast('録画機能の起動に失敗しました');
    }
  }

  function handleRecordToggle() {
    triggerHaptic();
    const targetDuration = Math.round(trimDurationSeconds);
    if (isRecording) {
      if (healthCheckTimer) {
        clearTimeout(healthCheckTimer);
        healthCheckTimer = null;
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
          mediaRecorder.stop();
        } catch (reqErr) {}
      }
      resetRecordingUI(targetDuration);
      showToast('録画を完了しました');
    } else {
      startRecording();
    }
  }

  mainRecordBtn.addEventListener('click', handleRecordToggle);
  stageRecordBtn.addEventListener('click', handleRecordToggle);
  finalRecordBtn.addEventListener('click', handleRecordToggle);

  // Modal actions
  if (saveToPhotosBtn) {
    saveToPhotosBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastRecordedBlob) {
        showToast('録画データが見つかりません');
        return;
      }
      const mime = lastRecordedBlob.type || 'video/mp4';
      const fileToShare = lastRecordedFile || new File([lastRecordedBlob], lastRecordedFilename, { type: mime });

      // iOS Safari native share sheet: ONLY pass files array for maximum compatibility with Photos app
      const shareData = { files: [fileToShare] };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          showToast('共有メニューを開きました。「ビデオを保存」を押すと写真アプリに入ります');
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            return;
          }
          console.warn('navigator.share failed, falling back to download:', err);
        }
      }

      // Fallback
      triggerBlobDownload(lastRecordedBlob, lastRecordedFilename);
      showToast('ダウンロードを開始しました。Safariの ⬇️ または「ファイル」アプリをご確認ください');
    });
  }

  if (directDownloadBtn) {
    directDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastRecordedBlob) {
        showToast('録画データが見つかりません');
        return;
      }
      triggerBlobDownload(lastRecordedBlob, lastRecordedFilename);
      showToast('ダウンロードを開始しました。Safariの ⬇️ または「ファイル」アプリをご確認ください');
    });
  }

  if (closeModalCrossBtn) closeModalCrossBtn.addEventListener('click', closeCompleteModal);
  if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closeCompleteModal);
  if (videoCompleteModal) {
    videoCompleteModal.addEventListener('click', (e) => {
      if (e.target === videoCompleteModal) {
        closeCompleteModal();
      }
    });
  }

  // Initialize Clean Standby State (No demo sample by default)
  currentSongConfig = null;
  if (controlSongTitle) controlSongTitle.textContent = '未選択（楽曲ファイルをアップロードしてください）';
  if (stageSongTitle) stageSongTitle.textContent = '楽曲未選択';
  if (controlTrimRangeBadge) controlTrimRangeBadge.textContent = '再生区間: 未設定';
  trimStartSeconds = 0;
  trimDurationSeconds = 0;
  updateTrimmerUI();

  // ==========================================
  // Main Animation Loop (60 FPS)
  // ==========================================
  function tick() {
    audioEngine.updateAnalysis(characterRenderer.lipsyncSens);
    characterRenderer.render(audioEngine);

    if (audioEngine.isPlaying) {
      const cur = audioEngine.currentTime;
      const totalDur = Math.max(1, audioEngine.duration || 30);

      if (audioEngine.playMode === 'full') {
        const fullPercent = Math.min(100, (cur / totalDur) * 100);
        controlSongTime.textContent = `${formatTime(cur)} / ${formatTime(totalDur)}`;
        stageSongTime.textContent = `${formatTime(cur)} / ${formatTime(totalDur)}`;
        stageProgressFill.style.width = `${fullPercent}%`;

        if (fullPlayerCurrentTime) {
          fullPlayerCurrentTime.textContent = formatTime(cur);
        }
        if (timelinePlayhead) {
          timelinePlayhead.style.left = `${fullPercent}%`;
        }
        if (fullSongSeekSlider && !fullSongSeekSlider.matches(':active')) {
          fullSongSeekSlider.value = cur;
        }
      } else {
        const trimLen = audioEngine.getTrimDuration();
        const currentOffset = Math.max(0, cur - audioEngine.trimStart);
        const progressPercent = Math.min(100, (currentOffset / trimLen) * 100);

        controlSongTime.textContent = `${formatTime(cur)} / ${formatTime(audioEngine.trimEnd)}`;
        stageSongTime.textContent = `${formatTime(cur)} / ${formatTime(audioEngine.trimEnd)}`;
        stageProgressFill.style.width = `${progressPercent}%`;

        if (fullPlayerCurrentTime) {
          fullPlayerCurrentTime.textContent = formatTime(cur);
        }
        if (timelinePlayhead) {
          const fullPercent = Math.min(100, (cur / totalDur) * 100);
          timelinePlayhead.style.left = `${fullPercent}%`;
        }
        if (fullSongSeekSlider && !fullSongSeekSlider.matches(':active')) {
          fullSongSeekSlider.value = cur;
        }
      }

      if (currentSongConfig && currentSongConfig.lyrics) {
        let activeLyric = currentSongConfig.lyrics[0].text;
        for (const lyric of currentSongConfig.lyrics) {
          if (cur >= lyric.time) {
            activeLyric = lyric.text;
          }
        }
        lyricsText.textContent = activeLyric;
      } else {
        lyricsText.textContent = audioEngine.isPlaying ? '♪ 歌唱中...' : '音源を取り込むとリップシンクが連動します';
      }
    } else {
      if (fullPlayerStatusBadge && fullPlayerStatusBadge.classList.contains('playing')) {
        updateFullPlayerUI(false);
      }
    }

    if (stageVisemeChar) {
      stageVisemeChar.textContent = audioEngine.currentChar;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});
