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

  // Direct Min/Sec Inputs & Steppers (v12.6 with 0.5s precision)
  const trimStartMinInput = document.getElementById('trimStartMinInput');
  const trimStartSecInput = document.getElementById('trimStartSecInput');
  const startMinus1Btn = document.getElementById('startMinus1Btn');
  const startMinusHalfBtn = document.getElementById('startMinusHalfBtn');
  const startPlusHalfBtn = document.getElementById('startPlusHalfBtn');
  const startPlus1Btn = document.getElementById('startPlus1Btn');
  const trimDurationInput = document.getElementById('trimDurationInput');
  const durMinus1Btn = document.getElementById('durMinus1Btn');
  const durMinusHalfBtn = document.getElementById('durMinusHalfBtn');
  const durPlusHalfBtn = document.getElementById('durPlusHalfBtn');
  const durPlus1Btn = document.getElementById('durPlus1Btn');
  const trimEndMinInput = document.getElementById('trimEndMinInput');
  const trimEndSecInput = document.getElementById('trimEndSecInput');
  const endMinus1Btn = document.getElementById('endMinus1Btn');
  const endMinusHalfBtn = document.getElementById('endMinusHalfBtn');
  const endPlusHalfBtn = document.getElementById('endPlusHalfBtn');
  const endPlus1Btn = document.getElementById('endPlus1Btn');
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
  const setEndFromCurrentBtn = document.getElementById('setEndFromCurrentBtn');

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
    if (trimEndMinInput && document.activeElement !== trimEndMinInput) {
      trimEndMinInput.value = Math.floor(endSeconds / 60);
    }
    if (trimEndSecInput && document.activeElement !== trimEndSecInput) {
      trimEndSecInput.value = Math.floor(endSeconds % 60);
    }
    if (trimDurationInput && document.activeElement !== trimDurationInput) {
      trimDurationInput.value = Math.round(trimDurationSeconds);
    }

    if (startPosBadge) {
      startPosBadge.textContent = `${formatTime(trimStartSeconds)} からスタート`;
    }
    if (durationBadge) {
      durationBadge.textContent = `${Math.round(trimDurationSeconds)}秒間（終了: ${formatTime(endSeconds)}）`;
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
      trimDurationSeconds = Math.max(1, parseFloat(trimDurationInput.value) || 30);
      updateTrimmerUI();
    };
    trimDurationInput.addEventListener('input', onDurChange);
    trimDurationInput.addEventListener('change', onDurChange);
  }
  if (durMinus5Btn) {
    durMinus5Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = Math.max(1, trimDurationSeconds - 5);
      updateTrimmerUI();
    });
  }
  if (durMinus1Btn) {
    durMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = Math.max(1, trimDurationSeconds - 1);
      updateTrimmerUI();
    });
  }
  if (durPlus1Btn) {
    durPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = trimDurationSeconds + 1;
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

  // End position input & steppers (1秒ずらし対応)
  const onEndChange = () => {
    const m = parseInt(trimEndMinInput ? trimEndMinInput.value : 0, 10) || 0;
    const s = parseInt(trimEndSecInput ? trimEndSecInput.value : 0, 10) || 0;
    const targetEnd = m * 60 + s;
    if (targetEnd > trimStartSeconds) {
      trimDurationSeconds = Math.min(60, targetEnd - trimStartSeconds);
      updateTrimmerUI();
    }
  };
  if (trimEndMinInput) {
    trimEndMinInput.addEventListener('input', onEndChange);
    trimEndMinInput.addEventListener('change', onEndChange);
  }
  if (trimEndSecInput) {
    trimEndSecInput.addEventListener('input', onEndChange);
    trimEndSecInput.addEventListener('change', onEndChange);
  }
  if (endMinus1Btn) {
    endMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = Math.max(1, trimDurationSeconds - 1);
      updateTrimmerUI();
    });
  }
  if (endPlus1Btn) {
    endPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      trimDurationSeconds = Math.min(60, trimDurationSeconds + 1);
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
      if (dur === 'full') {
        trimDurationSeconds = Math.max(1, (audioEngine.duration || 15) - trimStartSeconds);
      } else {
        const parsed = parseInt(dur, 10);
        if (parsed > 0) trimDurationSeconds = parsed;
      }

      updateTrimmerUI();
      showToast(`リップシンク動画の長さを「${Math.round(trimDurationSeconds)}秒」にセットしました`);
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

  // ★ The Sync to End Button (一発で終了位置を合わせるボタン)
  if (setEndFromCurrentBtn) {
    setEndFromCurrentBtn.addEventListener('click', () => {
      triggerHaptic();
      const curSec = Math.floor(audioEngine.currentTime || 0);
      if (curSec <= trimStartSeconds) {
        showToast('⚠️ 終了位置は歌い出し位置（開始）より後ろで指定してください');
        return;
      }
      trimDurationSeconds = Math.max(1, Math.min(60, curSec - trimStartSeconds));
      updateTrimmerUI();
      showToast(`🏁 現在の秒数「${formatTime(curSec)}」を終了位置にセットしました！（長さ: ${Math.round(trimDurationSeconds)}秒間）`);
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
      showToast('まず STEP 2 であなたのオリジナル楽曲をアップロードしてください');
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

  if (mainPlayBtn) mainPlayBtn.addEventListener('click', togglePlay);
  if (stagePlayBtn) stagePlayBtn.addEventListener('click', togglePlay);

  if (stageProgressWrap) {
    stageProgressWrap.addEventListener('click', (e) => {
      const rect = stageProgressWrap.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioEngine.seek(ratio);
    });
  }

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
    avatarCardTitle.textContent = `✔ あなたの写真がセットされています`;
    avatarCardHint.textContent = `${filename || '人物写真'} (${canvas.width}×${canvas.height}) — タップで別の写真に変更`;

    if (customAvatarBanner) {
      customAvatarBanner.classList.remove('hidden');
      if (customAvatarStatusTitle) {
        customAvatarStatusTitle.textContent = `あなたの写真がセットされました！`;
      }
      if (customAvatarStatusSub) {
        customAvatarStatusSub.textContent = `続けて STEP 2・3 で楽曲と歌わせる秒数を指定し、STEP 4 で完成動画サイズを選んでください`;
      }
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
  }

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic();
      avatarFileInput.click();
    });
  }

  // ==========================================
  // v12 (Fal.ai Unified API): Full AI Lip-Sync & Singing Video Studio
  // ==========================================
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  const openAiSettingsBtn = document.getElementById('openAiSettingsBtn');
  const closeAiSettingsBtn = document.getElementById('closeAiSettingsBtn');
  const closeAiSettingsBottomBtn = document.getElementById('closeAiSettingsBottomBtn');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');

  const falApiKeyInput = document.getElementById('falApiKeyInput');
  const inlineFalApiKeyInput = document.getElementById('inlineFalApiKeyInput');
  const saveInlineApiKeyBtn = document.getElementById('saveInlineApiKeyBtn');
  const pasteAndSaveApiKeyBtn = document.getElementById('pasteAndSaveApiKeyBtn');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibilityBtn');
  const statusKeyFal = document.getElementById('statusKeyFal');
  const aiGenStatusBox = document.getElementById('aiGenStatusBox');

  const generateAiLipsyncBtn = document.getElementById('generateAiLipsyncBtn');
  const aiVideoPromptInput = document.getElementById('aiVideoPromptInput');
  const aiVideoFileInput = document.getElementById('aiVideoFileInput');

  const aiResultCard = document.getElementById('aiResultCard');
  const inlineAiResultVideo = document.getElementById('inlineAiResultVideo');
  const saveAiResultToPhotosBtn = document.getElementById('saveAiResultToPhotosBtn');
  const downloadAiResultMp4Btn = document.getElementById('downloadAiResultMp4Btn');

  // v12.4 Material Mode & Video Pattern Elements
  const tabModePhoto = document.getElementById('tabModePhoto');
  const tabModeVideo = document.getElementById('tabModeVideo');
  const materialPhotoBox = document.getElementById('materialPhotoBox');
  const materialVideoBox = document.getElementById('materialVideoBox');
  const videoMaterialUploadBtn = document.getElementById('videoMaterialUploadBtn');
  const videoMaterialFileInput = document.getElementById('videoMaterialFileInput');
  const videoMaterialCardTitle = document.getElementById('videoMaterialCardTitle');
  const videoMaterialCardHint = document.getElementById('videoMaterialCardHint');
  const videoPatternSection = document.getElementById('videoPatternSection');
  const sourceVideoPlayer = document.getElementById('sourceVideoPlayer');
  const sourceVideoDurationLabel = document.getElementById('sourceVideoDurationLabel');
  const patternBtnA = document.getElementById('patternBtnA');
  const patternBtnB = document.getElementById('patternBtnB');
  const patternPillA = document.getElementById('patternPillA');
  const patternPillB = document.getElementById('patternPillB');
  const patternBFrameBox = document.getElementById('patternBFrameBox');
  const captureVideoFrameBtn = document.getElementById('captureVideoFrameBtn');
  const capturedFramePreviewRow = document.getElementById('capturedFramePreviewRow');
  const capturedFrameThumb = document.getElementById('capturedFrameThumb');
  const capturedFrameTimeBadge = document.getElementById('capturedFrameTimeBadge');
  const changeVideoMaterialBtn = document.getElementById('changeVideoMaterialBtn');
  const photoModelsGroup = document.getElementById('photoModelsGroup');
  const videoModelsGroup = document.getElementById('videoModelsGroup');
  const aiPromptStyleWrap = document.getElementById('aiPromptStyleWrap');
  const currentMaterialIndicatorBadge = document.getElementById('currentMaterialIndicatorBadge');
  const step4Subtitle = document.getElementById('step4Subtitle');

  // v12.5 Output Video Size & Framing Elements
  const selectedSizeSummaryBadge = document.getElementById('selectedSizeSummaryBadge');
  const fitModeSubBox = document.getElementById('fitModeSubBox');
  const sizeFramingPreviewCanvas = document.getElementById('sizeFramingPreviewCanvas');
  const sizeFramingPreviewTitle = document.getElementById('sizeFramingPreviewTitle');
  const sizeFramingPreviewSub = document.getElementById('sizeFramingPreviewSub');

  let activeMaterialMode = 'photo'; // 'photo' | 'video'
  let activeVideoPattern = 'A'; // 'A' (video-to-video) | 'B' (frame capture)
  let uploadedVideoMaterialFile = null;
  let uploadedVideoMaterialUrl = null;
  let capturedVideoFrameCanvas = null;

  let selectedOutputVideoSize = '9:16'; // '9:16' | '16:9' | '1:1' | 'original'
  let selectedOutputFitMode = 'cover';  // 'cover' | 'contain_blur'
  let selectedOutputResolution = '720p'; // '720p' | '1080p'

  let selectedV11bModel = 'fal-ai/bytedance/omnihuman/v1.5';
  let selectedV11bMode = 'lipsync';
  let selectedV11bLabel = 'ByteDance OmniHuman v1.5 (リップシンク)';
  let selectedAiPromptStyle = 'sway';

  // --- 5-Layer Persistent Key Vault (Safari + iOS Home Screen Web App) ---
  function setKeyCookie(val) {
    try {
      const encoded = encodeURIComponent(val || '');
      document.cookie = `gs_fal_api_key=${encoded}; path=/; max-age=315360000; SameSite=Lax`;
    } catch (e) {}
  }

  function getKeyCookie() {
    try {
      const match = document.cookie.match(/(?:^|;\s*)gs_fal_api_key=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function setKeyUrlHash(val) {
    try {
      const url = new URL(window.location.href);
      if (val) {
        url.hash = `gs_key=${encodeURIComponent(btoa(unescape(encodeURIComponent(val))))}`;
      } else if (url.hash.includes('gs_key=')) {
        url.hash = '';
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  function getKeyFromUrlHash() {
    try {
      const hash = window.location.hash || '';
      const match = hash.match(/gs_key=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(escape(atob(decodeURIComponent(match[1]))));
      }
    } catch (e) {}
    return '';
  }

  async function saveKeyToVaultAsync(val) {
    // CacheStorage backup
    try {
      if ('caches' in window) {
        const cache = await caches.open('gs-key-vault-v1');
        await cache.put('/__gs_fal_key__', new Response(val || '', { headers: { 'Content-Type': 'text/plain' } }));
      }
    } catch (e) {}

    // IndexedDB backup
    try {
      if ('indexedDB' in window) {
        const req = indexedDB.open('GrooveSyncVaultDB', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('keys')) {
            db.createObjectStore('keys');
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('keys', 'readwrite');
            tx.objectStore('keys').put(val || '', 'gs_fal_api_key');
          } catch (e) {}
        };
      }
    } catch (e) {}
  }

  async function restoreKeyFromVaultAsync() {
    let found = '';
    // 1. Try CacheStorage
    try {
      if ('caches' in window) {
        const cache = await caches.open('gs-key-vault-v1');
        const resp = await cache.match('/__gs_fal_key__');
        if (resp) {
          const txt = (await resp.text()).trim();
          if (txt) found = txt;
        }
      }
    } catch (e) {}

    // 2. Try IndexedDB
    if (!found) {
      try {
        if ('indexedDB' in window) {
          found = await new Promise((resolve) => {
            const req = indexedDB.open('GrooveSyncVaultDB', 1);
            req.onupgradeneeded = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys');
              }
            };
            req.onsuccess = () => {
              try {
                const db = req.result;
                const tx = db.transaction('keys', 'readonly');
                const getReq = tx.objectStore('keys').get('gs_fal_api_key');
                getReq.onsuccess = () => resolve((getReq.result || '').trim());
                getReq.onerror = () => resolve('');
              } catch (e) {
                resolve('');
              }
            };
            req.onerror = () => resolve('');
          });
        }
      } catch (e) {}
    }

    if (found) {
      try { localStorage.setItem('gs_fal_api_key', found); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', found); } catch (e) {}
      setKeyCookie(found);
      setKeyUrlHash(found);
      refreshApiKeyStatusBadges();
    }
  }

  function getSavedFalApiKey() {
    let key = '';
    try { key = (localStorage.getItem('gs_fal_api_key') || '').trim(); } catch (e) {}
    if (!key) {
      try { key = (sessionStorage.getItem('gs_fal_api_key') || '').trim(); } catch (e) {}
    }
    if (!key) {
      key = (getKeyCookie() || '').trim();
    }
    if (!key) {
      key = (getKeyFromUrlHash() || '').trim();
    }
    if (key) {
      try { localStorage.setItem('gs_fal_api_key', key); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', key); } catch (e) {}
      setKeyCookie(key);
    }
    return key;
  }

  function refreshApiKeyStatusBadges() {
    const falKey = getSavedFalApiKey();
    if (inlineFalApiKeyInput && document.activeElement !== inlineFalApiKeyInput) {
      inlineFalApiKeyInput.value = falKey;
    }
    if (falApiKeyInput && document.activeElement !== falApiKeyInput) {
      falApiKeyInput.value = falKey;
    }
    if (statusKeyFal) {
      if (falKey) {
        const masked = falKey.length > 10 ? `${falKey.slice(0, 6)}...${falKey.slice(-4)}` : '登録済';
        statusKeyFal.textContent = `🟢 登録済み（${masked} / ホーム画面＆iPhoneに5重記憶済）`;
        statusKeyFal.style.background = 'rgba(16, 185, 129, 0.25)';
        statusKeyFal.style.color = '#6ee7b7';
      } else {
        statusKeyFal.textContent = '⚠️ 未登録（下のボタンで貼り付けて保存してください）';
        statusKeyFal.style.background = 'rgba(255, 255, 255, 0.12)';
        statusKeyFal.style.color = '#fde047';
      }
    }
  }

  function saveFalApiKey(rawKey) {
    const val = (rawKey || '').trim();
    if (val) {
      try { localStorage.setItem('gs_fal_api_key', val); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', val); } catch (e) {}
      setKeyCookie(val);
      setKeyUrlHash(val);
      saveKeyToVaultAsync(val);
      refreshApiKeyStatusBadges();
      showToast('✔ APIキーをiPhone＆ホーム画面用に5重記憶しました！');
      return true;
    } else {
      try { localStorage.removeItem('gs_fal_api_key'); } catch (e) {}
      try { sessionStorage.removeItem('gs_fal_api_key'); } catch (e) {}
      setKeyCookie('');
      setKeyUrlHash('');
      saveKeyToVaultAsync('');
      refreshApiKeyStatusBadges();
      showToast('APIキーを消去しました');
      return false;
    }
  }

  if (toggleKeyVisibilityBtn && inlineFalApiKeyInput) {
    toggleKeyVisibilityBtn.addEventListener('click', () => {
      triggerHaptic();
      if (inlineFalApiKeyInput.type === 'password') {
        inlineFalApiKeyInput.type = 'text';
        toggleKeyVisibilityBtn.innerHTML = '<span>🙈 隠す</span>';
      } else {
        inlineFalApiKeyInput.type = 'password';
        toggleKeyVisibilityBtn.innerHTML = '<span>👁 表示</span>';
      }
    });
  }

  if (pasteAndSaveApiKeyBtn) {
    pasteAndSaveApiKeyBtn.addEventListener('click', async () => {
      triggerHaptic();
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          const clipText = (await navigator.clipboard.readText() || '').trim();
          if (clipText) {
            if (inlineFalApiKeyInput) inlineFalApiKeyInput.value = clipText;
            saveFalApiKey(clipText);
            return;
          }
        }
      } catch (e) {
        console.warn('Clipboard read requires manual paste on iOS:', e);
      }
      if (inlineFalApiKeyInput && inlineFalApiKeyInput.value.trim()) {
        saveFalApiKey(inlineFalApiKeyInput.value.trim());
      } else {
        if (inlineFalApiKeyInput) inlineFalApiKeyInput.focus();
        showToast('入力欄を長押しして「ペースト」を押し、保存ボタンを押してください');
      }
    });
  }

  if (inlineFalApiKeyInput) {
    inlineFalApiKeyInput.addEventListener('input', () => {
      const val = inlineFalApiKeyInput.value.trim();
      if (val.length >= 16 && val.includes(':')) {
        // Auto-save immediately when a valid Fal.ai key format (xxxx:yyyy) is pasted!
        saveFalApiKey(val);
      }
    });
    inlineFalApiKeyInput.addEventListener('change', () => {
      const val = inlineFalApiKeyInput.value.trim();
      if (val) saveFalApiKey(val);
    });
  }

  if (saveInlineApiKeyBtn) {
    saveInlineApiKeyBtn.addEventListener('click', () => {
      triggerHaptic();
      const val = inlineFalApiKeyInput ? inlineFalApiKeyInput.value : '';
      if (!val.trim()) {
        showToast('⚠️ Fal.ai でコピーしたAPIキーを入力欄に貼り付けてください');
        if (inlineFalApiKeyInput) inlineFalApiKeyInput.focus();
        return;
      }
      saveFalApiKey(val);
    });
  }

  // Restore from IndexedDB / CacheStorage on startup if needed
  restoreKeyFromVaultAsync();

  function showAiStatus(msg, borderColor = '#38bdf8') {
    if (!aiGenStatusBox) return;
    aiGenStatusBox.innerHTML = msg;
    aiGenStatusBox.style.borderColor = borderColor;
    aiGenStatusBox.classList.remove('hidden');
  }

  // Model selection in STEP 4 (supports both photoModelsGroup and videoModelsGroup)
  document.querySelectorAll('.v11b-model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      const parentContainer = btn.closest('#photoModelsGroup, #videoModelsGroup') || btn.parentElement;
      parentContainer.querySelectorAll('.v11b-model-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(15, 23, 42, 0.85)';
        b.style.borderColor = 'rgba(255,255,255,0.18)';
        const pill = b.querySelector('.v11b-model-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.style.background = 'rgba(255,255,255,0.12)';
          pill.style.color = '#cbd5e1';
        }
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(168, 85, 247, 0.28)';
      btn.style.borderColor = '#c084fc';
      const activePill = btn.querySelector('.v11b-model-pill');
      if (activePill) {
        activePill.textContent = '✔ 選択中';
        activePill.style.background = '#10b981';
        activePill.style.color = '#052e16';
      }
      selectedV11bModel = btn.dataset.model || 'fal-ai/bytedance/omnihuman/v1.5';
      selectedV11bMode = btn.dataset.mode || 'lipsync';
      selectedV11bLabel = btn.dataset.label || 'ByteDance OmniHuman v1.5';
      showToast(`🎤 「${selectedV11bLabel}」を選択しました`);
    });
  });

  // Material Mode & Video Pattern Controllers (v12.4)
  function setMaterialMode(mode) {
    activeMaterialMode = mode;
    triggerHaptic();
    if (mode === 'photo') {
      if (tabModePhoto) {
        tabModePhoto.classList.add('active');
        tabModePhoto.style.background = 'rgba(168, 85, 247, 0.28)';
        tabModePhoto.style.borderColor = '#c084fc';
      }
      if (tabModeVideo) {
        tabModeVideo.classList.remove('active');
        tabModeVideo.style.background = 'rgba(15, 23, 42, 0.85)';
        tabModeVideo.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }
      if (materialPhotoBox) materialPhotoBox.classList.remove('hidden');
      if (materialVideoBox) materialVideoBox.classList.add('hidden');

      if (photoModelsGroup) photoModelsGroup.classList.remove('hidden');
      if (videoModelsGroup) videoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.remove('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '📷 写真モード';
        currentMaterialIndicatorBadge.style.background = 'rgba(168, 85, 247, 0.35)';
        currentMaterialIndicatorBadge.style.borderColor = '#c084fc';
        currentMaterialIndicatorBadge.style.color = '#f0abfc';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIでAIリップシンク歌唱動画を生成する</span>';
      }

      const activeBtn = photoModelsGroup ? photoModelsGroup.querySelector('.v11b-model-btn.active') : null;
      if (activeBtn) {
        selectedV11bModel = activeBtn.dataset.model || 'fal-ai/bytedance/omnihuman/v1.5';
        selectedV11bMode = activeBtn.dataset.mode || 'lipsync';
        selectedV11bLabel = activeBtn.dataset.label || 'ByteDance OmniHuman v1.5';
      }
      showToast('📷 「写真・画像」モードに切り替えました');
    } else {
      if (tabModeVideo) {
        tabModeVideo.classList.add('active');
        tabModeVideo.style.background = 'rgba(56, 189, 248, 0.25)';
        tabModeVideo.style.borderColor = '#38bdf8';
      }
      if (tabModePhoto) {
        tabModePhoto.classList.remove('active');
        tabModePhoto.style.background = 'rgba(15, 23, 42, 0.85)';
        tabModePhoto.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }
      if (materialVideoBox) materialVideoBox.classList.remove('hidden');
      if (materialPhotoBox) materialPhotoBox.classList.add('hidden');

      updateVideoPatternUI();
      showToast('🎬 「動画素材」モードに切り替えました');
    }
  }

  function setVideoPattern(pattern) {
    activeVideoPattern = pattern;
    triggerHaptic();
    updateVideoPatternUI();
  }

  function updateVideoPatternUI() {
    if (activeMaterialMode !== 'video') return;

    if (activeVideoPattern === 'A') {
      if (patternBtnA) {
        patternBtnA.classList.add('active');
        patternBtnA.style.background = 'rgba(168, 85, 247, 0.28)';
        patternBtnA.style.borderColor = '#c084fc';
      }
      if (patternPillA) {
        patternPillA.textContent = '✔ 選択中';
        patternPillA.style.background = '#10b981';
        patternPillA.style.color = '#052e16';
      }
      if (patternBtnB) {
        patternBtnB.classList.remove('active');
        patternBtnB.style.background = 'rgba(15, 23, 42, 0.85)';
        patternBtnB.style.borderColor = 'rgba(255, 255, 255, 0.18)';
      }
      if (patternPillB) {
        patternPillB.textContent = 'タップで選択';
        patternPillB.style.background = 'rgba(255, 255, 255, 0.12)';
        patternPillB.style.color = '#cbd5e1';
      }
      if (patternBFrameBox) patternBFrameBox.classList.add('hidden');

      if (videoModelsGroup) videoModelsGroup.classList.remove('hidden');
      if (photoModelsGroup) photoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.add('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '🎬 動画モード（パターン①: 動画リップシンク）';
        currentMaterialIndicatorBadge.style.background = 'rgba(16, 185, 129, 0.25)';
        currentMaterialIndicatorBadge.style.borderColor = '#10b981';
        currentMaterialIndicatorBadge.style.color = '#6ee7b7';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIで動画の口元をリップシンク生成する</span>';
      }

      const activeBtn = videoModelsGroup ? videoModelsGroup.querySelector('.v11b-model-btn.active') : null;
      if (activeBtn) {
        selectedV11bModel = activeBtn.dataset.model || 'fal-ai/sync-lipsync/v3';
        selectedV11bMode = activeBtn.dataset.mode || 'videolipsync';
        selectedV11bLabel = activeBtn.dataset.label || 'Sync Lipsync v3 (動画口パク同期)';
      }
    } else {
      if (patternBtnB) {
        patternBtnB.classList.add('active');
        patternBtnB.style.background = 'rgba(2, 132, 199, 0.25)';
        patternBtnB.style.borderColor = '#38bdf8';
      }
      if (patternPillB) {
        patternPillB.textContent = '✔ 選択中';
        patternPillB.style.background = '#10b981';
        patternPillB.style.color = '#052e16';
      }
      if (patternBtnA) {
        patternBtnA.classList.remove('active');
        patternBtnA.style.background = 'rgba(15, 23, 42, 0.85)';
        patternBtnA.style.borderColor = 'rgba(255, 255, 255, 0.18)';
      }
      if (patternPillA) {
        patternPillA.textContent = 'タップで選択';
        patternPillA.style.background = 'rgba(255, 255, 255, 0.12)';
        patternPillA.style.color = '#cbd5e1';
      }
      if (patternBFrameBox) patternBFrameBox.classList.remove('hidden');

      if (photoModelsGroup) photoModelsGroup.classList.remove('hidden');
      if (videoModelsGroup) videoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.remove('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '📸 動画モード（パターン②: 1コマ切り出し歌唱）';
        currentMaterialIndicatorBadge.style.background = 'rgba(56, 189, 248, 0.25)';
        currentMaterialIndicatorBadge.style.borderColor = '#38bdf8';
        currentMaterialIndicatorBadge.style.color = '#7dd3fc';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIでAIリップシンク歌唱動画を生成する</span>';
      }

      const activeBtn = photoModelsGroup ? photoModelsGroup.querySelector('.v11b-model-btn.active') : null;
      if (activeBtn) {
        selectedV11bModel = activeBtn.dataset.model || 'fal-ai/bytedance/omnihuman/v1.5';
        selectedV11bMode = activeBtn.dataset.mode || 'lipsync';
        selectedV11bLabel = activeBtn.dataset.label || 'ByteDance OmniHuman v1.5';
      }
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
  }

  function captureFrameFromSourceVideo() {
    if (!sourceVideoPlayer || !sourceVideoPlayer.videoWidth || !sourceVideoPlayer.videoHeight) {
      return null;
    }
    const vw = sourceVideoPlayer.videoWidth;
    const vh = sourceVideoPlayer.videoHeight;
    const maxDim = 1280;
    let targetW = vw;
    let targetH = vh;
    if (vw > maxDim || vh > maxDim) {
      if (vw > vh) {
        targetW = maxDim;
        targetH = Math.round((vh * maxDim) / vw);
      } else {
        targetH = maxDim;
        targetW = Math.round((vw * maxDim) / vh);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceVideoPlayer, 0, 0, targetW, targetH);
    capturedVideoFrameCanvas = canvas;

    characterRenderer.setCustomAvatar(canvas);

    if (capturedFrameThumb) {
      try {
        capturedFrameThumb.src = canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {}
    }
    if (capturedFrameTimeBadge) {
      const curSec = sourceVideoPlayer.currentTime || 0;
      capturedFrameTimeBadge.textContent = `切り出し位置: ${formatTime(curSec)} (${vw}×${vh})`;
    }
    if (capturedFramePreviewRow) {
      capturedFramePreviewRow.classList.remove('hidden');
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
    return canvas;
  }

  if (tabModePhoto) {
    tabModePhoto.addEventListener('click', () => {
      setMaterialMode('photo');
      if (typeof updateSizeFramingPreview === 'function') updateSizeFramingPreview();
    });
  }
  if (tabModeVideo) {
    tabModeVideo.addEventListener('click', () => {
      setMaterialMode('video');
      if (typeof updateSizeFramingPreview === 'function') updateSizeFramingPreview();
    });
  }
  if (patternBtnA) patternBtnA.addEventListener('click', () => setVideoPattern('A'));
  if (patternBtnB) {
    patternBtnB.addEventListener('click', () => {
      setVideoPattern('B');
      if (!capturedVideoFrameCanvas) captureFrameFromSourceVideo();
    });
  }

  if (videoMaterialUploadBtn && videoMaterialFileInput) {
    videoMaterialUploadBtn.addEventListener('click', () => {
      triggerHaptic();
      videoMaterialFileInput.click();
    });
    videoMaterialUploadBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerHaptic();
        videoMaterialFileInput.click();
      }
    });

    videoMaterialFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      triggerHaptic();

      uploadedVideoMaterialFile = file;
      if (uploadedVideoMaterialUrl) {
        try { URL.revokeObjectURL(uploadedVideoMaterialUrl); } catch (e) {}
      }
      uploadedVideoMaterialUrl = URL.createObjectURL(file);

      if (videoMaterialCardTitle) {
        videoMaterialCardTitle.textContent = `✔ 読込完了: ${file.name}`;
      }
      if (videoMaterialCardHint) {
        videoMaterialCardHint.textContent = `サイズ: ${(file.size / (1024 * 1024)).toFixed(1)}MB（下のパターン①またはパターン②を選択してください）`;
      }
      if (videoMaterialUploadBtn) {
        videoMaterialUploadBtn.style.borderColor = '#10b981';
      }

      if (sourceVideoPlayer) {
        sourceVideoPlayer.src = uploadedVideoMaterialUrl;
        sourceVideoPlayer.load();
        sourceVideoPlayer.onloadedmetadata = () => {
          const vw = sourceVideoPlayer.videoWidth || 0;
          const vh = sourceVideoPlayer.videoHeight || 0;
          if (sourceVideoDurationLabel) {
            sourceVideoDurationLabel.textContent = `長さ: ${formatTime(sourceVideoPlayer.duration || 0)}${vw && vh ? ` (${vw}×${vh})` : ''}`;
          }
          setTimeout(() => {
            try {
              sourceVideoPlayer.currentTime = 0.1;
              sourceVideoPlayer.onseeked = () => {
                captureFrameFromSourceVideo();
                sourceVideoPlayer.onseeked = null;
              };
            } catch (e) {}
          }, 300);
        };
      }

      if (videoPatternSection) {
        videoPatternSection.classList.remove('hidden');
      }

      showToast(`🎬 動画「${file.name}」を読み込みました！`);
    });
  }

  if (changeVideoMaterialBtn && videoMaterialFileInput) {
    changeVideoMaterialBtn.addEventListener('click', () => {
      triggerHaptic();
      videoMaterialFileInput.click();
    });
  }

  if (captureVideoFrameBtn) {
    captureVideoFrameBtn.addEventListener('click', () => {
      triggerHaptic();
      const canvas = captureFrameFromSourceVideo();
      if (canvas) {
        const curSec = sourceVideoPlayer ? sourceVideoPlayer.currentTime : 0;
        showToast(`📸 動画の ${formatTime(curSec)} の1コマを写真としてセットしました！`);
      }
    });
  }

  // ==========================================
  // v12.5: Output Video Size (Aspect Ratio, Fit Mode, Resolution) Controller
  // ==========================================
  function getActiveSourceDimensions() {
    if (activeMaterialMode === 'video' && sourceVideoPlayer && sourceVideoPlayer.videoWidth && sourceVideoPlayer.videoHeight) {
      return { width: sourceVideoPlayer.videoWidth, height: sourceVideoPlayer.videoHeight };
    }
    const srcImg = characterRenderer.customAvatarImg;
    if (srcImg && (srcImg.width || srcImg.naturalWidth)) {
      return {
        width: srcImg.width || srcImg.naturalWidth || 720,
        height: srcImg.height || srcImg.naturalHeight || 1280
      };
    }
    return { width: 720, height: 1280 };
  }

  function getTargetVideoDimensions(sizeMode = selectedOutputVideoSize, resMode = selectedOutputResolution) {
    const shortEdge = (resMode === '1080p') ? 1080 : 720;
    const longEdge = (resMode === '1080p') ? 1920 : 1280;

    if (sizeMode === '9:16') {
      return { width: shortEdge, height: longEdge, label: `縦型 9:16 (${shortEdge}×${longEdge})`, aspectRatio: '9:16' };
    }
    if (sizeMode === '16:9') {
      return { width: longEdge, height: shortEdge, label: `横型 16:9 (${longEdge}×${shortEdge})`, aspectRatio: '16:9' };
    }
    if (sizeMode === '1:1') {
      return { width: shortEdge, height: shortEdge, label: `正方形 1:1 (${shortEdge}×${shortEdge})`, aspectRatio: '1:1' };
    }
    // 'original'
    const srcDim = getActiveSourceDimensions();
    const sw = Math.max(1, srcDim.width);
    const sh = Math.max(1, srcDim.height);
    let tw = sw;
    let th = sh;
    if (sw >= sh) {
      tw = longEdge;
      th = Math.max(2, Math.round((sh * longEdge) / sw));
    } else {
      th = longEdge;
      tw = Math.max(2, Math.round((sw * longEdge) / sh));
    }
    // Ensure even pixel dimensions for H.264/MP4 compatibility
    if (tw % 2 !== 0) tw += 1;
    if (th % 2 !== 0) th += 1;
    const detectedRatio = (tw > th * 1.15) ? '16:9' : (th > tw * 1.15 ? '9:16' : '1:1');
    return { width: tw, height: th, label: `元素材の比率 (${tw}×${th})`, aspectRatio: detectedRatio };
  }

  function renderFramedCanvas(srcElement, targetW, targetH, sizeMode, fitMode) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, targetW, targetH);

    if (!srcElement) return outCanvas;
    const sw = srcElement.videoWidth || srcElement.naturalWidth || srcElement.width || targetW;
    const sh = srcElement.videoHeight || srcElement.naturalHeight || srcElement.height || targetH;
    if (!sw || !sh) return outCanvas;

    if (sizeMode === 'original') {
      ctx.drawImage(srcElement, 0, 0, targetW, targetH);
      return outCanvas;
    }

    if (fitMode === 'contain_blur') {
      // 1. iOS-compatible smooth blurred background via downscaled offscreen canvas
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = 48;
      blurCanvas.height = 48;
      const bCtx = blurCanvas.getContext('2d');
      const bgScale = Math.max(48 / sw, 48 / sh);
      const bgW = sw * bgScale;
      const bgH = sh * bgScale;
      bCtx.drawImage(srcElement, (48 - bgW) / 2, (48 - bgH) / 2, bgW, bgH);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(blurCanvas, 0, 0, targetW, targetH);
      ctx.fillStyle = 'rgba(9, 13, 22, 0.45)';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();

      // 2. Draw full image centered inside target frame without cropping
      const scale = Math.min(targetW / sw, targetH / sh);
      const drawW = Math.round(sw * scale);
      const drawH = Math.round(sh * scale);
      const dx = Math.round((targetW - drawW) / 2);
      const dy = Math.round((targetH - drawH) / 2);
      ctx.drawImage(srcElement, dx, dy, drawW, drawH);
    } else {
      // 'cover': Fill entire frame (bias vertical offset slightly toward upper-center so singer's face/head is preserved)
      const scale = Math.max(targetW / sw, targetH / sh);
      const drawW = Math.round(sw * scale);
      const drawH = Math.round(sh * scale);
      const dx = Math.round((targetW - drawW) / 2);
      const dy = Math.round((targetH - drawH) * 0.32);
      ctx.drawImage(srcElement, dx, dy, drawW, drawH);
    }

    return outCanvas;
  }

  function updateSizeFramingPreview() {
    const dim = getTargetVideoDimensions(selectedOutputVideoSize, selectedOutputResolution);
    const iconMap = { '9:16': '📱', '16:9': '📺', '1:1': '🟦', 'original': '🖼️' };
    const icon = iconMap[selectedOutputVideoSize] || '📐';

    if (selectedSizeSummaryBadge) {
      selectedSizeSummaryBadge.textContent = `${icon} ${dim.label}`;
    }

    if (fitModeSubBox) {
      if (selectedOutputVideoSize === 'original') {
        fitModeSubBox.style.opacity = '0.5';
      } else {
        fitModeSubBox.style.opacity = '1';
      }
    }

    if (sizeFramingPreviewTitle) {
      sizeFramingPreviewTitle.textContent = `完成サイズ: ${dim.label}`;
    }
    if (sizeFramingPreviewSub) {
      const fitText = selectedOutputVideoSize === 'original'
        ? '元の写真・動画の縦横比をそのまま維持します'
        : (selectedOutputFitMode === 'contain_blur' ? '写真全体を表示（余白は背景ぼかし）' : '画面いっぱいに拡大（余白なし）');
      sizeFramingPreviewSub.textContent = `${fitText} — 左の枠の形で動画が生成されます`;
    }

    // Also keep stageCanvas dimensions synced with selected output size
    if (stageCanvas) {
      stageCanvas.width = dim.width;
      stageCanvas.height = dim.height;
    }

    if (sizeFramingPreviewCanvas) {
      // Scale preview canvas inside 68x68 box while preserving exact aspect ratio
      const maxThumb = 64;
      let pw = maxThumb;
      let ph = maxThumb;
      if (dim.width >= dim.height) {
        pw = maxThumb;
        ph = Math.max(20, Math.round((dim.height * maxThumb) / dim.width));
      } else {
        ph = maxThumb;
        pw = Math.max(20, Math.round((dim.width * maxThumb) / dim.height));
      }
      sizeFramingPreviewCanvas.width = pw * 2;
      sizeFramingPreviewCanvas.height = ph * 2;
      sizeFramingPreviewCanvas.style.width = `${pw}px`;
      sizeFramingPreviewCanvas.style.height = `${ph}px`;

      const srcEl = (activeMaterialMode === 'video' && capturedVideoFrameCanvas)
        ? capturedVideoFrameCanvas
        : (characterRenderer.customAvatarImg || characterRenderer.defaultSampleImg || null);

      const pCtx = sizeFramingPreviewCanvas.getContext('2d');
      if (srcEl) {
        const framed = renderFramedCanvas(srcEl, pw * 2, ph * 2, selectedOutputVideoSize, selectedOutputFitMode);
        pCtx.drawImage(framed, 0, 0);
      } else {
        pCtx.fillStyle = '#1e293b';
        pCtx.fillRect(0, 0, pw * 2, ph * 2);
        pCtx.fillStyle = '#7dd3fc';
        pCtx.font = 'bold 20px sans-serif';
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText(selectedOutputVideoSize === 'original' ? 'AUTO' : selectedOutputVideoSize, pw, ph);
      }
    }
  }

  // Event Listeners for Output Video Size Buttons
  document.querySelectorAll('.video-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-size-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(15, 23, 42, 0.85)';
        b.style.borderColor = 'rgba(255,255,255,0.18)';
        const pill = b.querySelector('.size-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.style.background = 'rgba(255,255,255,0.12)';
          pill.style.color = '#cbd5e1';
        }
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(56, 189, 248, 0.28)';
      btn.style.borderColor = '#38bdf8';
      const activePill = btn.querySelector('.size-pill');
      if (activePill) {
        activePill.textContent = '✔ 選択中';
        activePill.style.background = '#10b981';
        activePill.style.color = '#052e16';
      }
      selectedOutputVideoSize = btn.dataset.size || '9:16';
      updateSizeFramingPreview();
      const dim = getTargetVideoDimensions();
      showToast(`📐 完成動画サイズを「${dim.label}」に設定しました`);
    });
  });

  // Event Listeners for Fit Mode Buttons
  document.querySelectorAll('.video-fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-fit-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(15, 23, 42, 0.85)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
        b.style.color = '#cbd5e1';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(168, 85, 247, 0.32)';
      btn.style.borderColor = '#c084fc';
      btn.style.color = '#fff';
      selectedOutputFitMode = btn.dataset.fit || 'cover';
      updateSizeFramingPreview();
      showToast(selectedOutputFitMode === 'contain_blur'
        ? '✨ 写真全体を入れる（背景ぼかし余白）に切り替えました'
        : '🔍 画面いっぱいに拡大（余白なし）に切り替えました');
    });
  });

  // Event Listeners for Resolution Buttons (720p / 1080p)
  document.querySelectorAll('.video-res-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-res-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = 'rgba(15, 23, 42, 0.85)';
        b.style.borderColor = 'rgba(255,255,255,0.2)';
        b.style.color = '#cbd5e1';
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(16, 185, 129, 0.25)';
      btn.style.borderColor = '#10b981';
      btn.style.color = '#fff';
      selectedOutputResolution = btn.dataset.res || '720p';
      updateSizeFramingPreview();
      const dim = getTargetVideoDimensions();
      showToast(`🎞️ 解像度を「${selectedOutputResolution.toUpperCase()} (${dim.width}×${dim.height})」に設定しました`);
    });
  });

  // Initialize size preview on load
  setTimeout(() => updateSizeFramingPreview(), 150);

  // Style chips in STEP 4
  document.querySelectorAll('.ai-style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.ai-style-chip').forEach(c => {
        c.classList.remove('active');
        c.style.background = 'rgba(15, 23, 42, 0.85)';
        c.style.borderColor = 'rgba(255,255,255,0.22)';
        c.style.color = '#e2e8f0';
      });
      chip.classList.add('active');
      chip.style.background = 'rgba(168, 85, 247, 0.35)';
      chip.style.borderColor = '#c084fc';
      chip.style.color = '#fff';
      selectedAiPromptStyle = chip.dataset.style || 'sway';
      if (aiVideoPromptInput && chip.dataset.prompt) {
        aiVideoPromptInput.value = chip.dataset.prompt;
      }
      characterRenderer.aiPromptStyle = selectedAiPromptStyle;
      showToast('✨ 演出プロンプトを変更しました');
    });
  });

  function openApiModal() {
    triggerHaptic();
    if (falApiKeyInput) falApiKeyInput.value = getSavedFalApiKey();
    if (aiSettingsModal) aiSettingsModal.classList.remove('hidden');
  }

  if (openAiSettingsBtn) {
    openAiSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openApiModal();
    });
  }

  if (closeAiSettingsBtn) {
    closeAiSettingsBtn.addEventListener('click', () => {
      if (aiSettingsModal) aiSettingsModal.classList.add('hidden');
    });
  }
  if (closeAiSettingsBottomBtn) {
    closeAiSettingsBottomBtn.addEventListener('click', () => {
      if (aiSettingsModal) aiSettingsModal.classList.add('hidden');
    });
  }

  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', () => {
      triggerHaptic();
      const val = falApiKeyInput ? falApiKeyInput.value : '';
      saveFalApiKey(val);
      if (aiSettingsModal) aiSettingsModal.classList.add('hidden');
    });
  }

  // Helper: Convert Blob to Base64 Data URL
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }

  // Helper: Extract Canvas as JPEG Blob
  function canvasToJpegBlob(canvas, quality = 0.9) {
    return new Promise((resolve) => {
      if (canvas && typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      } else {
        resolve(null);
      }
    });
  }

  // Apply completed AI video URL to Inline Player, Save Modal, and Stage
  async function handleCompletedAiVideo(videoUrl, modelLabel) {
    const dim = getTargetVideoDimensions();
    showAiStatus(`🎉 <strong>「${modelLabel}」のAI動画（${dim.label}）が完成しました！</strong><br>下のビデオプレイヤーですぐに再生・カメラロール保存ができます。`, '#10b981');
    showToast(`🎉 ${modelLabel} の生成が完了しました！`);

    // 1. Show inline video player card
    if (aiResultCard && inlineAiResultVideo) {
      inlineAiResultVideo.src = videoUrl;
      inlineAiResultVideo.load();
      aiResultCard.classList.remove('hidden');
    }

    // 2. Also attach to Stage Renderer (unmuted when playing standalone, or synced on stage)
    const vidEl = document.createElement('video');
    vidEl.crossOrigin = 'anonymous';
    vidEl.src = videoUrl;
    vidEl.loop = true;
    vidEl.muted = true;
    vidEl.playsInline = true;
    vidEl.setAttribute('playsinline', '');
    vidEl.onloadeddata = () => {
      vidEl.play().catch(() => {});
      characterRenderer.setAiVideo(vidEl);
      characterRenderer.aiMotionActive = true;
      characterRenderer.aiModelBadge = modelLabel;
    };

    // 3. Download MP4 Blob in background so iPhone "Save to Photos (Camera Roll)" works in 1 tap
    try {
      const resp = await fetch(videoUrl);
      if (resp.ok) {
        const mp4Blob = await resp.blob();
        const cleanBlob = new Blob([mp4Blob], { type: 'video/mp4' });
        const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'LipsyncMV';
        const songNameClean = songTitle.replace(/[\s\/\\?%*:|"<>]+/g, '_');
        const sizeTag = selectedOutputVideoSize === 'original' ? 'orig' : selectedOutputVideoSize.replace(':', 'x');
        const filename = `AI_Lipsync_${songNameClean}_${sizeTag}.mp4`;

        if (lastRecordedUrl) {
          try { URL.revokeObjectURL(lastRecordedUrl); } catch (e) {}
        }
        lastRecordedBlob = cleanBlob;
        lastRecordedUrl = URL.createObjectURL(cleanBlob);
        lastRecordedFilename = filename;
        try {
          lastRecordedFile = new File([cleanBlob], filename, { type: 'video/mp4' });
        } catch (e) {
          lastRecordedFile = null;
        }

        if (inlineAiResultVideo) {
          inlineAiResultVideo.src = lastRecordedUrl;
        }
        openCompleteModal(lastRecordedUrl, filename, Math.round(trimDurationSeconds || 15));
      }
    } catch (dlErr) {
      console.warn('Could not pre-fetch MP4 blob, using direct remote URL:', dlErr);
      lastRecordedUrl = videoUrl;
      lastRecordedFilename = 'AI_Lipsync_MV.mp4';
      openCompleteModal(videoUrl, 'AI_Lipsync_MV.mp4', Math.round(trimDurationSeconds || 15));
    }
  }

  if (saveAiResultToPhotosBtn) {
    saveAiResultToPhotosBtn.addEventListener('click', () => {
      if (saveToPhotosBtn) {
        saveToPhotosBtn.click();
      } else if (lastRecordedUrl) {
        window.open(lastRecordedUrl, '_blank');
      }
    });
  }

  if (downloadAiResultMp4Btn) {
    downloadAiResultMp4Btn.addEventListener('click', () => {
      if (lastRecordedBlob) {
        triggerBlobDownload(lastRecordedBlob, lastRecordedFilename || 'AI_Lipsync_MV.mp4');
        showToast('MP4動画のダウンロードを開始しました');
      } else if (lastRecordedUrl) {
        window.open(lastRecordedUrl, '_blank');
      }
    });
  }

  // Real Fal.ai API Lip-Sync & Video Generation Handler (No 0-yen fake fallback!)
  if (generateAiLipsyncBtn) {
    generateAiLipsyncBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      triggerHaptic();

      // Check inline input first in case user pasted key but didn't click save yet
      if (inlineFalApiKeyInput && inlineFalApiKeyInput.value.trim() && !getSavedFalApiKey()) {
        saveFalApiKey(inlineFalApiKeyInput.value.trim());
      }

      const apiKey = getSavedFalApiKey();
      if (!apiKey) {
        showAiStatus('⚠️ <strong>Fal.ai のAPIキーがまだ登録されていません。</strong><br>画面一番上の「🔑 Fal.ai APIキーの取得・登録」でキーを貼り付けて保存してください。', '#f59e0b');
        showToast('🔑 まず一番上の欄に Fal.ai APIキーを貼り付けて保存してください');
        if (inlineFalApiKeyInput) {
          inlineFalApiKeyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => inlineFalApiKeyInput.focus(), 400);
        } else {
          openApiModal();
        }
        return;
      }

      const isVideoToVideo = (activeMaterialMode === 'video' && activeVideoPattern === 'A');

      if (isVideoToVideo) {
        if (!uploadedVideoMaterialFile) {
          showAiStatus('⚠️ <strong>STEP 1 で人物の動画がまだアップロードされていません。</strong><br>まず歌わせたい人物の動画（MP4またはMOV）を選んでください。', '#f59e0b');
          showToast('🎬 STEP 1 で人物の動画をアップロードしてください');
          if (videoMaterialUploadBtn) videoMaterialUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        if (!characterRenderer.customAvatarImg) {
          if (activeMaterialMode === 'video' && activeVideoPattern === 'B' && sourceVideoPlayer) {
            captureFrameFromSourceVideo();
          }
        }
        if (!characterRenderer.customAvatarImg) {
          showAiStatus('⚠️ <strong>STEP 1 で人物の写真または動画の切り出しがセットされていません。</strong><br>まず歌わせたい人物の写真（または動画）をセットしてください。', '#f59e0b');
          showToast('📷 STEP 1 で歌わせたい人物の写真をアップロードしてください');
          if (avatarUploadBtn) avatarUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      if (!audioEngine.hasAudioLoaded()) {
        showAiStatus('⚠️ <strong>STEP 2 で楽曲ファイルがまだアップロードされていません。</strong><br>リップシンク（口パク歌唱）には元になる楽曲が必要です。STEP 2 で楽曲を取り込んでください。', '#f59e0b');
        showToast('🎵 STEP 2 であなたの楽曲ファイルをアップロードしてください');
        audioUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const promptText = (aiVideoPromptInput && aiVideoPromptInput.value.trim())
        ? aiVideoPromptInput.value.trim()
        : 'Passionate music video performance, singer singing emotionally with natural head movement and expressive eyes, concert stage lighting, high quality 4k';

      generateAiLipsyncBtn.disabled = true;
      const originalBtnHtml = generateAiLipsyncBtn.innerHTML;
      let elapsedSec = 0;
      let progressTimer = null;

      try {
        const targetDim = getTargetVideoDimensions(selectedOutputVideoSize, selectedOutputResolution);
        const materialLabel = isVideoToVideo ? '動画' : '写真';
        showAiStatus(`⏳ <strong>[1/3] 完成サイズ「${targetDim.label}」で${materialLabel}と切り出し音源（${formatTime(audioEngine.trimStart || 0)}〜${formatTime(audioEngine.trimEnd || 15)}）を準備しています...</strong>`, '#c084fc');

        // 1. Prepare Sliced Audio MP3 File & Data URL
        const srcBuf = audioEngine.ensureAudioBuffer();
        if (!srcBuf) {
          throw new Error('楽曲データのデコードに失敗しました。もう一度STEP 2で楽曲を選択してください。');
        }
        const startSec = audioEngine.trimStart || 0;
        const endSec = Math.max(startSec + 1, audioEngine.trimEnd || (startSec + 15));
        const slicedBuf = sliceBufferDirect(srcBuf, startSec, endSec);
        const mp3Blob = encodeMp3Direct(slicedBuf);
        const audioFile = new File([mp3Blob], 'vocal_cut.mp3', { type: 'audio/mpeg' });
        const audioDataUrl = await blobToDataUrl(mp3Blob);

        // 2. Prepare Formatted Image File matching selected Output Video Size (9:16, 16:9, 1:1, or original)
        let imgBlob = null;
        let imgDataUrl = '';
        let imgFile = null;
        if (!isVideoToVideo) {
          const formattedCanvas = renderFramedCanvas(
            characterRenderer.customAvatarImg,
            targetDim.width,
            targetDim.height,
            selectedOutputVideoSize,
            selectedOutputFitMode
          );
          imgBlob = await canvasToJpegBlob(formattedCanvas, 0.92);
          imgDataUrl = formattedCanvas.toDataURL('image/jpeg', 0.9);
          imgFile = imgBlob ? new File([imgBlob], `artist_${targetDim.width}x${targetDim.height}.jpg`, { type: 'image/jpeg' }) : null;
        }

        // Start live elapsed second counter for user feedback
        progressTimer = setInterval(() => {
          elapsedSec += 1;
          generateAiLipsyncBtn.innerHTML = `<span>⏳ AIリップシンク生成中... (${elapsedSec}秒経過)</span>`;
        }, 1000);

        let finalVideoUrl = '';

        // 3. Call Fal.ai via official @fal-ai/client
        try {
          const falModule = await import('https://cdn.jsdelivr.net/npm/@fal-ai/client/+esm');
          const createFalClient = falModule.createFalClient || (falModule.default && falModule.default.createFalClient);

          if (createFalClient) {
            const falClient = createFalClient({ credentials: apiKey });

            showAiStatus(`⏳ <strong>[2/3] Fal.ai サーバーへ${materialLabel}（${targetDim.label}）と音源をアップロード中...</strong>`, '#38bdf8');
            let uploadedAudioUrl = audioDataUrl;

            if (falClient.storage && typeof falClient.storage.upload === 'function') {
              try {
                uploadedAudioUrl = await falClient.storage.upload(audioFile);
              } catch (uErr) {
                console.warn('Audio storage upload fallback to DataURL:', uErr);
              }
            }

            let inputPayload = {};

            if (isVideoToVideo) {
              // Video-to-Video LipSync (Sync-3 Lipsync / LatentSync)
              let uploadedVideoUrl = '';
              if (falClient.storage && typeof falClient.storage.upload === 'function') {
                uploadedVideoUrl = await falClient.storage.upload(uploadedVideoMaterialFile);
              } else {
                throw new Error('動画ファイルのアップロード機能が利用できません。ネットワークをご確認ください。');
              }

              inputPayload = {
                video_url: uploadedVideoUrl,
                audio_url: uploadedAudioUrl,
                sync_mode: 'cut_off'
              };
            } else {
              // Image LipSync (OmniHuman / Kling AI Avatar / MiniMax / Kling 1.6)
              let uploadedImageUrl = imgDataUrl;
              if (imgFile && falClient.storage && typeof falClient.storage.upload === 'function') {
                try {
                  uploadedImageUrl = await falClient.storage.upload(imgFile);
                } catch (uErr) {
                  console.warn('Image storage upload fallback to DataURL:', uErr);
                }
              }

              inputPayload = {
                image_url: uploadedImageUrl,
                prompt: promptText
              };
              if (uploadedAudioUrl && selectedV11bMode !== 'video') {
                inputPayload.audio_url = uploadedAudioUrl;
              }
              if (selectedV11bMode === 'video' && targetDim.aspectRatio) {
                inputPayload.aspect_ratio = targetDim.aspectRatio;
              }
            }

            showAiStatus(`🚀 <strong>[2/3] 「${selectedV11bLabel}」で完成サイズ「${targetDim.label}」のAI動画を生成中です...</strong><br><small style="color:#cbd5e1;">※ 口元の同期描画には約1〜3分かかります。この画面のままお待ちください。</small>`, '#c084fc');

            const result = await falClient.subscribe(selectedV11bModel, {
              input: inputPayload,
              logs: true,
              onQueueUpdate: (statusUpdate) => {
                if (!statusUpdate) return;
                if (statusUpdate.status === 'IN_QUEUE') {
                  const pos = (typeof statusUpdate.queue_position === 'number') ? ` (順番: ${statusUpdate.queue_position + 1}番目)` : '';
                  showAiStatus(`⏳ <strong>[2/3] Fal.ai の生成キューに並びました${pos}... (${elapsedSec}秒経過)</strong><br><small style="color:#cbd5e1;">完成サイズ: ${targetDim.label} / まもなくAI描画が始まります。</small>`, '#38bdf8');
                } else if (statusUpdate.status === 'IN_PROGRESS') {
                  showAiStatus(`🎤 <strong>[2/3] AIがあなたの楽曲に合わせて口元を同期描画しています... (${elapsedSec}秒経過)</strong><br><small style="color:#cbd5e1;">完成サイズ: ${targetDim.label} / 完成まであと少しです。</small>`, '#ec4899');
                }
              }
            });

            const resData = (result && result.data) ? result.data : result;
            finalVideoUrl = (resData && resData.video && resData.video.url) || (resData && resData.video_url) || '';
          }
        } catch (sdkErr) {
          console.warn('Fal client SDK notice, checking error or trying direct REST:', sdkErr);
          const status = sdkErr && (sdkErr.status || (sdkErr.body && sdkErr.body.status));
          const detailMsg = (sdkErr && sdkErr.body && (sdkErr.body.detail || sdkErr.body.message)) || (sdkErr && sdkErr.message) || '';
          if (status === 401 || /unauthorized|invalid.*key/i.test(detailMsg)) {
            throw new Error('APIキーが無効です（401エラー）。Fal.ai の Keys ページで発行した正しいキーかご確認ください。');
          }
          if (status === 402 || status === 403 || /balance|credit|exhausted|billing|payment/i.test(detailMsg)) {
            throw new Error(`Fal.ai のクレジット残高が不足しているか、利用制限です（${detailMsg || 'Billingページでチャージをご確認ください'}）。`);
          }
          // Try direct REST fallback if SDK import itself had a network hiccup (for image mode)
          if (!finalVideoUrl && !isVideoToVideo) {
            const payload = {
              image_url: imgDataUrl,
              prompt: promptText,
              audio_url: audioDataUrl
            };
            const response = await fetch(`https://fal.run/${selectedV11bModel}`, {
              method: 'POST',
              headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              let errText = '';
              try {
                const errJson = await response.json();
                errText = errJson.detail || errJson.message || JSON.stringify(errJson);
              } catch (e) {
                errText = `HTTP ${response.status}`;
              }
              if (response.status === 401) {
                throw new Error('APIキーが正しくありません（401 Unauthorized）。Fal.aiのキーを再確認してください。');
              } else if (response.status === 402 || response.status === 403) {
                throw new Error(`Fal.ai のクレジット残高不足、または権限エラーです（${errText}）。fal.ai/dashboard/billing で残高をご確認ください。`);
              } else {
                throw new Error(`Fal.ai APIエラー (${response.status}): ${errText}`);
              }
            }
            const data = await response.json();
            finalVideoUrl = (data && data.video && data.video.url) || (data && data.video_url) || '';
          }
        }

        if (!finalVideoUrl) {
          throw new Error('動画URLが返されませんでした。秒数を短く（10〜15秒）するか、別のモデルでお試しください。');
        }

        await handleCompletedAiVideo(finalVideoUrl, selectedV11bLabel);
      } catch (err) {
        console.error('Fal.ai Lip-Sync generation error:', err);
        const msg = (err && err.message) ? err.message : '通信エラーが発生しました';
        showAiStatus(`❌ <strong>生成エラー：${msg}</strong><br><small style="color:#fde047;">※ APIキーの入力ミスや、Fal.ai のクレジット残高（fal.ai/dashboard/billing）をご確認ください。</small>`, '#ef4444');
        showToast(`❌ エラー: ${msg}`);
      } finally {
        if (progressTimer) clearInterval(progressTimer);
        generateAiLipsyncBtn.disabled = false;
        generateAiLipsyncBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // Direct MP4 AI Video File Import onto Stage
  if (aiVideoFileInput) {
    aiVideoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      triggerHaptic();
      const vidUrl = URL.createObjectURL(file);
      const vidEl = document.createElement('video');
      vidEl.src = vidUrl;
      vidEl.loop = true;
      vidEl.muted = true;
      vidEl.playsInline = true;
      vidEl.setAttribute('playsinline', '');
      vidEl.onloadeddata = () => {
        vidEl.play().catch(() => {});
        characterRenderer.setAiVideo(vidEl);
        characterRenderer.aiMotionActive = true;
        characterRenderer.aiModelBadge = '取り込みAI動画 (MP4)';
        if (aiResultCard && inlineAiResultVideo) {
          inlineAiResultVideo.src = vidUrl;
          aiResultCard.classList.remove('hidden');
        }
        showAiStatus(`🎬 スマホ内の動画「${file.name}」を読み込みました！`, '#10b981');
        showToast(`🎬 AI動画「${file.name}」をセットしました！`);
      };
    });
  }

  refreshApiKeyStatusBadges();

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
  const directLyricsDownloadBtn = document.getElementById('directLyricsDownloadBtn');
  const copyStudioLyricsBtn = document.getElementById('copyStudioLyricsBtn');
  const modalStudioLyricsCard = document.getElementById('modalStudioLyricsCard');
  const modalStudioLyricsPreview = document.getElementById('modalStudioLyricsPreview');
  const modalAudioDirectLink = document.getElementById('modalAudioDirectLink');

  // Format Switcher & Quick Save Buttons (v12.3)
  const quickDownloadMp3Btn = document.getElementById('quickDownloadMp3Btn');
  const quickDownloadWavBtn = document.getElementById('quickDownloadWavBtn');
  const modalFormatMp3Btn = document.getElementById('modalFormatMp3Btn');
  const modalFormatWavBtn = document.getElementById('modalFormatWavBtn');
  const modalFormatExplainer = document.getElementById('modalFormatExplainer');
  const saveAudioBtnText = document.getElementById('saveAudioBtnText');
  const directAudioBtnText = document.getElementById('directAudioBtnText');

  let currentCutFormat = 'mp3'; // 'mp3' or 'wav'
  let cutMp3Blob = null;
  let cutMp3File = null;
  let cutMp3Filename = '';
  let cutWavBlob = null;
  let cutWavFile = null;
  let cutWavFilename = '';

  let lastCutAudioBlob = null;
  let lastCutAudioFile = null;
  let lastCutAudioFilename = '';
  let lastCutAudioUrl = null;

  let lastCutLyricsBlob = null;
  let lastCutLyricsFile = null;
  let lastCutLyricsFilename = '';
  let lastCutLyricsText = '';

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

  function buildStudioLyricsText(songConfig, trimStart, trimEnd) {
    const durSec = Math.max(1, Math.round(trimEnd - trimStart));
    const startStr = formatTime(trimStart);
    const endStr = formatTime(trimEnd);
    const dateStr = new Date().toLocaleDateString('ja-JP');

    const title = (songConfig && songConfig.title) ? songConfig.title : '楽曲';
    const genre = (songConfig && songConfig.genre) ? songConfig.genre : '';
    const bpm = (songConfig && songConfig.bpm) ? songConfig.bpm : null;
    const isCustom = !songConfig || songConfig.id === 'custom';

    let text = `========================================\n`;
    text += `【楽曲情報】\n`;
    text += `曲名: ${title}\n`;
    if (genre) text += `ジャンル: ${genre}\n`;
    if (bpm) text += `BPM: ${bpm}\n`;
    text += `切り出し区間: ${startStr} 〜 ${endStr} (${durSec}秒間)\n`;
    text += `========================================\n\n`;

    if (songConfig && songConfig.lyrics && songConfig.lyrics.length > 0 && !isCustom) {
      const trimmedLyrics = songConfig.lyrics.filter(l => l.time >= trimStart && l.time <= trimEnd);
      text += `【✂️ 切り出し区間の歌詞】\n`;
      if (trimmedLyrics.length > 0) {
        trimmedLyrics.forEach(l => {
          const relSec = Math.max(0, l.time - trimStart);
          text += `[${formatTime(relSec)}] (原曲 ${formatTime(l.time)}) ${l.text}\n`;
        });
      } else {
        const active = songConfig.lyrics.slice().reverse().find(l => l.time <= trimStart) || songConfig.lyrics[0];
        text += `[00:00] (原曲 ${formatTime(active.time)}) ${active.text}\n`;
      }
      text += `\n----------------------------------------\n`;
      text += `【🎵 曲全体の歌詞一覧】\n`;
      songConfig.lyrics.forEach(l => {
        text += `[${formatTime(l.time)}] ${l.text}\n`;
      });
    } else {
      text += `【✂️ 切り出し区間の歌詞 / テロップメモ】\n`;
      text += `※ご自身のオリジナル持ち込み音源です。\n`;
      text += `動画編集（CapCut等）やSNS投稿時の歌詞・テロップメモとして自由にご編集ください。\n\n`;
      text += `[00:00] （ここに歌詞やテロップを入力）\n`;
    }

    text += `\n========================================\n`;
    text += `作成日: ${dateStr}\n`;
    text += `GrooveSync MV Studio\n`;
    text += `========================================\n`;
    return text;
  }

  function updateModalFormatUI(format) {
    currentCutFormat = format;
    const isWav = format === 'wav';

    // Tab buttons active states
    if (modalFormatMp3Btn) {
      modalFormatMp3Btn.style.background = isWav ? 'transparent' : '#10b981';
      modalFormatMp3Btn.style.color = isWav ? '#94a3b8' : '#fff';
      modalFormatMp3Btn.style.boxShadow = isWav ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.4)';
    }
    if (modalFormatWavBtn) {
      modalFormatWavBtn.style.background = isWav ? '#3b82f6' : 'transparent';
      modalFormatWavBtn.style.color = isWav ? '#fff' : '#94a3b8';
      modalFormatWavBtn.style.boxShadow = isWav ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none';
    }

    if (modalFormatExplainer) {
      modalFormatExplainer.textContent = isWav ? 'WAV: 最高音質（非圧縮PCM）' : 'MP3: 軽量（192kbps高音質）';
    }

    const activeBlob = isWav ? cutWavBlob : cutMp3Blob;
    const activeFile = isWav ? cutWavFile : cutMp3File;
    const activeFilename = isWav ? cutWavFilename : cutMp3Filename;

    lastCutAudioBlob = activeBlob;
    lastCutAudioFile = activeFile;
    lastCutAudioFilename = activeFilename;

    if (lastCutAudioUrl) {
      try { URL.revokeObjectURL(lastCutAudioUrl); } catch (e) {}
    }
    if (activeBlob) {
      lastCutAudioUrl = URL.createObjectURL(activeBlob);
    }

    if (modalAudioFileName) modalAudioFileName.textContent = activeFilename;
    if (modalAudioFormatBadge) {
      modalAudioFormatBadge.textContent = isWav ? 'WAV' : 'MP3';
      modalAudioFormatBadge.style.background = isWav ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      modalAudioFormatBadge.style.color = isWav ? '#93c5fd' : '#6ee7b7';
      modalAudioFormatBadge.style.borderColor = isWav ? '#3b82f6' : '#10b981';
    }

    if (modalAudioMeta && activeBlob) {
      const dur = Math.max(1, Math.round(audioEngine.trimEnd - audioEngine.trimStart));
      const sizeStr = isWav ? `${(activeBlob.size / (1024 * 1024)).toFixed(2)} MB` : `${(activeBlob.size / 1024).toFixed(1)} KB`;
      const qualityStr = isWav ? '最高音質・無劣化' : '192kbps高音質・軽量';
      modalAudioMeta.textContent = `区間: ${formatTime(audioEngine.trimStart)} 〜 ${formatTime(audioEngine.trimEnd)} (${dur}秒間) | 容量: ${sizeStr} (${qualityStr})`;
    }

    if (completeAudioPreview && lastCutAudioUrl) {
      completeAudioPreview.src = lastCutAudioUrl;
      completeAudioPreview.load();
    }

    if (modalAudioDirectLink) {
      modalAudioDirectLink.href = lastCutAudioUrl || '#';
      modalAudioDirectLink.download = activeFilename;
    }

    if (saveAudioBtnText) {
      saveAudioBtnText.textContent = `切り出し音声(${isWav ? 'WAV' : 'MP3'})をスマホに保存 / 共有`;
    }
    if (saveAudioToPhoneBtn) {
      saveAudioToPhoneBtn.style.background = isWav
        ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
        : 'linear-gradient(135deg, #10b981, #06b6d4)';
      saveAudioToPhoneBtn.style.borderColor = isWav ? '#60a5fa' : '#34d399';
    }
    if (directAudioBtnText) {
      directAudioBtnText.textContent = `${isWav ? 'WAV' : 'MP3'}ファイルを直接ダウンロード`;
    }
  }

  function openCutAudioModal(initialFormat = 'mp3', trimStart = 0, trimEnd = 15) {
    if (!audioCompleteModal) return;
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
    }

    // Build Lyrics Data & Text File (Pattern A)
    const effectiveSong = currentSongConfig || (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.songs ? GROOVE_PRESETS.songs.jpop : null);
    lastCutLyricsText = buildStudioLyricsText(effectiveSong, trimStart, trimEnd);
    const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'song';
    lastCutLyricsFilename = `${songTitle}_歌詞.txt`;
    lastCutLyricsBlob = new Blob([lastCutLyricsText], { type: 'text/plain;charset=utf-8' });
    lastCutLyricsFile = new File([lastCutLyricsBlob], lastCutLyricsFilename, { type: 'text/plain;charset=utf-8' });

    // Populate Lyrics Preview
    if (modalStudioLyricsPreview) {
      if (effectiveSong && effectiveSong.lyrics && effectiveSong.id !== 'custom') {
        const trimmed = effectiveSong.lyrics.filter(l => l.time >= trimStart && l.time <= trimEnd);
        if (trimmed.length > 0) {
          modalStudioLyricsPreview.textContent = trimmed.map(l => {
            const rel = Math.max(0, l.time - trimStart);
            return `[${formatTime(rel)}] ${l.text}`;
          }).join('\n');
        } else {
          modalStudioLyricsPreview.textContent = `♪ ${effectiveSong.title || '音楽'} を再生中`;
        }
      } else {
        modalStudioLyricsPreview.textContent = `♪ 持ち込み音源 (${formatTime(trimStart)} 〜 ${formatTime(trimEnd)})`;
      }
    }

    // Apply the chosen initial format (MP3 or WAV)
    updateModalFormatUI(initialFormat);

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

  async function handleAudioCutDownload(targetFormat = 'mp3') {
    triggerHaptic();

    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }

    showToast(`✂️ カット音声を${targetFormat.toUpperCase()}で準備中...`);

    try {
      let buf = audioEngine.ensureAudioBuffer();
      if (!buf) {
        const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
        buf = ctx.createBuffer(2, ctx.sampleRate * 15, ctx.sampleRate);
      }

      const sliced = sliceBufferDirect(buf, audioEngine.trimStart, audioEngine.trimEnd);
      const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'song';
      const timeTag = `${formatTime(audioEngine.trimStart).replace(':', 'm')}s-${formatTime(audioEngine.trimEnd).replace(':', 'm')}s`;

      // Pre-encode both MP3 and WAV so user can toggle between them instantly in the modal
      cutMp3Blob = encodeMp3Direct(sliced);
      cutMp3Filename = `${songTitle}_cut_${timeTag}.mp3`;
      cutMp3File = new File([cutMp3Blob], cutMp3Filename, { type: 'audio/mpeg' });

      cutWavBlob = encodeWavDirect(sliced);
      cutWavFilename = `${songTitle}_cut_${timeTag}.wav`;
      cutWavFile = new File([cutWavBlob], cutWavFilename, { type: 'audio/wav' });

      openCutAudioModal(targetFormat, audioEngine.trimStart, audioEngine.trimEnd);
      showToast(`✂️ 「${targetFormat === 'wav' ? cutWavFilename : cutMp3Filename}」を切り出しました！`);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        const activeBlob = targetFormat === 'wav' ? cutWavBlob : cutMp3Blob;
        const activeName = targetFormat === 'wav' ? cutWavFilename : cutMp3Filename;
        triggerDirectAudioDownload(activeBlob, activeName);
      }
    } catch (err) {
      console.error('Quick download failed:', err);
      showToast('切り出し保存に失敗しました。専用カッターツールもお試しください');
    }
  }

  // Register Section 3 Save Buttons
  if (quickDownloadMp3Btn) {
    quickDownloadMp3Btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('mp3');
    });
  }
  if (quickDownloadWavBtn) {
    quickDownloadWavBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('wav');
    });
  }
  if (quickDownloadTrimmedBtn) {
    quickDownloadTrimmedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('mp3');
    });
  }

  // Register Modal Format Switch Tabs
  if (modalFormatMp3Btn) {
    modalFormatMp3Btn.addEventListener('click', () => {
      triggerHaptic();
      updateModalFormatUI('mp3');
      showToast('🎵 MP3形式（軽量）に切り替えました');
    });
  }
  if (modalFormatWavBtn) {
    modalFormatWavBtn.addEventListener('click', () => {
      triggerHaptic();
      updateModalFormatUI('wav');
      showToast('💎 WAV形式（最高音質）に切り替えました');
    });
  }

  // Audio Complete Modal Event Listeners (Pattern A: Audio + Lyrics .txt)
  if (copyStudioLyricsBtn) {
    copyStudioLyricsBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastCutLyricsText) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(lastCutLyricsText);
          showToast('✔ 歌詞テキストをクリップボードにコピーしました！');
        } else {
          const ta = document.createElement('textarea');
          ta.value = lastCutLyricsText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('✔ 歌詞テキストをコピーしました！');
        }
      } catch (e) {
        console.warn('Clipboard copy failed:', e);
        showToast('コピーに失敗しました。プレビューから直接選択してコピーしてください');
      }
    });
  }

  if (directLyricsDownloadBtn) {
    directLyricsDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastCutLyricsBlob || !lastCutLyricsFilename) return;
      triggerDirectAudioDownload(lastCutLyricsBlob, lastCutLyricsFilename);
      showToast('歌詞テキスト（.txt）のダウンロードを開始しました');
    });
  }

  if (saveAudioToPhoneBtn) {
    saveAudioToPhoneBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastCutAudioFile) return;

      // Share both Audio (MP3/WAV) and Lyrics TXT files together (Pattern A)
      const filesToShare = [lastCutAudioFile, lastCutLyricsFile].filter(Boolean);
      const shareData = {
        files: filesToShare
      };

      const fmtLabel = (currentCutFormat || 'mp3').toUpperCase();

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          showToast(`共有メニューを開きました。「"ファイル"に保存」で${fmtLabel}と歌詞が同時に保存されます`);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Dual-file share failed, trying audio-only share:', err);
        }
      }

      // Fallback 1: Share audio file alone
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [lastCutAudioFile] })) {
        try {
          await navigator.share({ files: [lastCutAudioFile] });
          showToast(`${fmtLabel}音声を共有しました。歌詞は「歌詞を保存」ボタンから保存できます`);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback 2: Direct downloads
      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      if (lastCutLyricsBlob) {
        setTimeout(() => triggerDirectAudioDownload(lastCutLyricsBlob, lastCutLyricsFilename), 600);
      }
      showToast(`${fmtLabel}音声のダウンロードを開始しました`);
    });
  }

  if (directAudioDownloadBtn) {
    directAudioDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastCutAudioBlob) return;
      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      const fmtLabel = (currentCutFormat || 'mp3').toUpperCase();
      showToast(`${fmtLabel}音声のダウンロードを開始しました`);
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

      showToast('🎉 あなたの写真をセットしました！');
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
        if (audioUploadHint) audioUploadHint.textContent = `全体の長さ: ${formatTime(res.duration)}（下のSTEP 3で歌わせる区間を指定してください）`;

        currentSongConfig = {
          title: cleanName,
          bpm: 120,
          lyrics: [{ time: 0, text: '♪ あなたの楽曲を再生中' }]
        };
        if (stageBpmIndicator) stageBpmIndicator.textContent = `120 BPM`;

        // Set trimmer defaults for user song (15s default for AI lip-sync)
        trimStartSeconds = 0;
        trimDurationSeconds = Math.min(res.duration || 15, 15);
        try {
          updateTrimmerUI();
        } catch (uiErr) {
          console.warn('updateTrimmerUI error:', uiErr);
        }

        // Safely try starting playback in full preview mode
        try {
          audioEngine.playFull(0);
          updatePlayUI(true);
          updateFullPlayerUI(true);
          showToast(`🎉 楽曲「${cleanName}」（全体 ${formatTime(res.duration)}）を読み込みました！STEP 3で歌わせる秒数を指定できます。`);
        } catch (playErr) {
          console.warn('Auto play blocked by browser policy:', playErr);
          updatePlayUI(false);
          updateFullPlayerUI(false);
          showToast(`🎉 楽曲「${cleanName}」を読み込みました！STEP 3の「▶ 曲全体を再生して秒数を確認」を押して試聴できます。`);
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
        audioUploadHint.innerHTML = `<span style="color:#ef4444;font-weight:700;">⚠ 読込エラー: ${msg}</span><br><small style="color:#cbd5e1;">※画面上部の【🔄 最新版】を押すか、別の曲をお試しください</small>`;
      }
      showToast('ファイルの読み込みに失敗しました');
    } finally {
      audioFileInput.value = '';
    }
  });

  // ==========================================
  // Mic Toggle (if present)
  // ==========================================
  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', async () => {
      triggerHaptic();
      const active = await audioEngine.toggleMic();
      if (active) {
        micToggleBtn.classList.add('active');
        if (micBtnTitle) micBtnTitle.textContent = '🎤 マイク入力中（タップで停止）';
        showToast('マイク入力を開始しました');
      } else {
        micToggleBtn.classList.remove('active');
        if (micBtnTitle) micBtnTitle.textContent = 'スマホのマイクで歌唱テスト';
        showToast('マイク入力を停止しました');
      }
    });
  }

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
