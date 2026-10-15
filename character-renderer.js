/**
 * Next-Gen MV Studio - High-End Stage Visualizer & Beat-Sync Performance Renderer (v11)
 * Features dynamic concert stage lighting, beat-synchronized audio visualization,
 * 3D-depth perspective floor, floating laser beams, and flawless portrait presentation
 * without any unnatural face distortion or glitched cuts.
 */

class CharacterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Rendering parameters
    this.aspectRatio = '9:16';
    this.motionPreset = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.motions) ? GROOVE_PRESETS.motions.guitar : {};
    this.stageTheme = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.stages) ? GROOVE_PRESETS.stages.livehouse : {
      name: 'Live House',
      bgGradient: ['#0b0817', '#1a0f35', '#06040d'],
      lasers: ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b']
    };
    this.cameraMode = 'dynamic';

    // Sliders & sensitivities
    this.lipsyncSens = 0.85;
    this.grooveStrength = 0.70;
    this.expressionLevel = 0.80;
    this.headbobStrength = 0.75;

    // Visual effects toggles
    this.showLasers = true;
    this.showParticles = true;
    this.showVisualizer = true;

    // Custom user/sample photo avatar
    this.customAvatarImg = null;
    this.aiVideoElement = null; // When AI video is loaded/generated
    this.aiMotionActive = false; // Step 1 non-lipsync AI video motion mode
    this.aiModelBadge = '';
    this.aiPromptStyle = 'sway';

    // Simulation states
    this.time = 0;
    this.particles = [];
    this.lasers = [];
    this.cameraShake = { zoom: 1, tilt: 0 };
    this.frequencyBars = new Float32Array(32);

    // Offscreen mask canvas for seamless cinematic edge blending
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.initStage();
  }

  initStage() {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * (this.canvas.width || 720),
        y: Math.random() * (this.canvas.height || 1280),
        r: Math.random() * 2.8 + 1.2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1.2 - 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.5 ? '#a855f7' : (Math.random() > 0.5 ? '#06b6d4' : '#ec4899')
      });
    }

    this.lasers = [];
    for (let i = 0; i < 7; i++) {
      this.lasers.push({
        angle: (i / 6) * Math.PI - Math.PI / 2,
        speed: (Math.random() * 0.02 + 0.012) * (i % 2 === 0 ? 1 : -1),
        width: 14 + Math.random() * 14
      });
    }
  }

  setMotion(id) {
    if (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.motions && GROOVE_PRESETS.motions[id]) {
      this.motionPreset = GROOVE_PRESETS.motions[id];
    }
  }

  setCustomAvatar(imageElement) {
    this.customAvatarImg = imageElement;
  }

  setAiVideo(videoElement) {
    this.aiVideoElement = videoElement;
  }

  setStage(id) {
    if (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.stages && GROOVE_PRESETS.stages[id]) {
      this.stageTheme = GROOVE_PRESETS.stages[id];
    }
  }

  // Main Render Loop
  render(audioEngine) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.time += 0.016;

    // Retrieve audio analysis data
    const isPlaying = audioEngine ? audioEngine.isPlaying : false;
    let beatPulse = 0;
    let bpm = 128;

    if (audioEngine) {
      beatPulse = audioEngine.beatPulse || 0;
      bpm = audioEngine.bpm || 128;

      // Update frequency bars for visualizer
      if (audioEngine.freqData) {
        const binCount = audioEngine.freqData.length;
        const step = Math.floor(binCount / 32);
        for (let i = 0; i < 32; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += audioEngine.freqData[i * step + j] || 0;
          }
          const val = sum / (step * 255);
          this.frequencyBars[i] += (val - this.frequencyBars[i]) * 0.35;
        }
      }
    }

    // Dynamic camera punch on kick beats
    const targetZoom = 1.0 + beatPulse * 0.04;
    this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.2;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraShake.zoom, this.cameraShake.zoom);
    ctx.translate(-w / 2, -h / 2);

    // 1. Stage Background
    this.drawStageBackground(w, h, beatPulse);

    // 2. Perspective Floor & Neon Grid
    this.drawStageFloor(w, h, beatPulse);

    // 3. Stage Lasers
    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }

    // 4. Circular Audio Visualizer Ring
    if (this.showVisualizer) {
      this.drawAudioSpectrumRing(w, h, beatPulse);
    }

    // 5. Main Center Artist Display (Clean & Flawless)
    if (this.aiVideoElement && !this.aiVideoElement.paused && this.aiVideoElement.readyState >= 2) {
      this.drawAiVideoPerformance(w, h, beatPulse);
    } else if (this.customAvatarImg) {
      this.drawArtistPortrait(w, h, { isPlaying, beatPulse, bpm });
    } else {
      this.drawEmptyStageState(w, h, beatPulse);
    }

    // 6. Floating Ambient Particles
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 7. Equalizer Bars at bottom
    this.drawBottomEqualizer(w, h, beatPulse);

    // 8. Stage Atmosphere & Vignette
    this.drawVignette(w, h, beatPulse);

    ctx.restore();
  }

  // Background Gradient & Glow
  drawStageBackground(w, h, beatPulse) {
    const ctx = this.ctx;
    const theme = this.stageTheme || {};
    const bg = theme.bgGradient || ['#0b0817', '#1a0f35', '#06040d'];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(0.5, bg[1] || bg[0]);
    grad.addColorStop(1, bg[2] || bg[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Center Stage Spotlight
    const spotX = w / 2;
    const spotY = h * 0.40;
    const spotRad = (w * 0.58) + beatPulse * 45;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 20, spotX, spotY, spotRad);
    spotGrad.addColorStop(0, `rgba(168, 85, 247, ${0.35 + beatPulse * 0.25})`);
    spotGrad.addColorStop(0.5, `rgba(236, 72, 153, ${0.16 + beatPulse * 0.15})`);
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Perspective Concert Floor
  drawStageFloor(w, h, beatPulse) {
    const ctx = this.ctx;
    const floorY = h * 0.72;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
    floorGrad.addColorStop(1, 'rgba(2, 6, 23, 0.99)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Neon Horizon Beam
    ctx.save();
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12 + beatPulse * 15;
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.6 + beatPulse * 0.4})`;
    ctx.lineWidth = 3 + beatPulse * 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();
    ctx.restore();

    // Perspective floor lines
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + beatPulse * 0.05})`;
    ctx.lineWidth = 1.5;
    for (let x = -w * 0.3; x <= w * 1.3; x += w * 0.14) {
      ctx.beginPath();
      ctx.moveTo(w / 2, floorY - 50);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  // Laser Beams
  drawStageLasers(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const originY = -40;
    const lasersColors = (this.stageTheme && this.stageTheme.lasers) || ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b'];
    this.lasers.forEach((laser, idx) => {
      laser.angle += laser.speed;
      if (Math.abs(laser.angle) > Math.PI * 0.45) laser.speed *= -1;

      const originX = w * (0.12 + (idx / 6) * 0.76);
      const targetX = originX + Math.sin(laser.angle + Math.sin(this.time * 0.5)) * (w * 0.85);
      const targetY = h * 0.82;

      const laserColor = lasersColors[idx % lasersColors.length];
      const alpha = (0.25 + beatPulse * 0.5);

      const lGrad = ctx.createLinearGradient(originX, originY, targetX, targetY);
      lGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
      lGrad.addColorStop(0.3, laserColor);
      lGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = lGrad;
      ctx.lineWidth = laser.width + beatPulse * 8;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    });

    ctx.restore();
  }

  // Audio Spectrum Ring (Hologram Visualizer behind artist)
  drawAudioSpectrumRing(w, h, beatPulse) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h * 0.42;
    const baseRad = w * 0.36;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const barCount = this.frequencyBars.length;
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 + this.time * 0.2;
      const mag = this.frequencyBars[i] || 0;
      const barLen = 10 + mag * 65 + beatPulse * 20;

      const x1 = cx + Math.cos(angle) * (baseRad);
      const y1 = cy + Math.sin(angle) * (baseRad);
      const x2 = cx + Math.cos(angle) * (baseRad + barLen);
      const y2 = cy + Math.sin(angle) * (baseRad + barLen);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      grad.addColorStop(1, `rgba(6, 182, 212, ${0.5 + mag * 0.5})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Flawless High-Res Artist Portrait (NO cutting or face deformation)
  drawArtistPortrait(w, h, params) {
    const ctx = this.ctx;
    const img = this.customAvatarImg;
    if (!img) return;

    const isPlaying = params.isPlaying;
    const bpm = params.bpm || 128;
    const beatPulse = params.beatPulse || 0;

    // Organic singer motion & breathing
    let bodySwayX = 0;
    let smoothNodY = 0;
    let breathScale = 1.0;
    let bodyTilt = 0;

    if (isPlaying || this.aiMotionActive) {
      const swayRate = (bpm / 60) * Math.PI * 0.75;
      if (this.aiMotionActive) {
        // Cinematic AI Video style motion (smooth 3D camera pan, parallax zoom, natural body groove)
        if (this.aiPromptStyle === 'zoom') {
          bodySwayX = Math.sin(this.time * 0.8) * 10.0;
          smoothNodY = Math.cos(this.time * 0.6) * 6.0;
          breathScale = 1.04 + Math.sin(this.time * 0.7) * 0.045 + (beatPulse * 0.02);
          bodyTilt = Math.sin(this.time * 0.5) * 0.018;
        } else if (this.aiPromptStyle === 'dynamic') {
          bodySwayX = Math.sin(this.time * swayRate) * 14.0;
          smoothNodY = Math.sin(this.time * swayRate * 2) * 7.0 + (beatPulse * 6.0);
          breathScale = 1.02 + Math.sin(this.time * 1.8) * 0.025 + (beatPulse * 0.03);
          bodyTilt = bodySwayX / 380;
        } else {
          bodySwayX = Math.sin(this.time * swayRate * 0.85) * 9.5;
          smoothNodY = Math.sin(this.time * swayRate * 1.7) * 5.0 + (beatPulse * 4.5);
          breathScale = 1.02 + Math.sin(this.time * 1.2) * 0.022 + (beatPulse * 0.022);
          bodyTilt = bodySwayX / 450;
        }
      } else {
        bodySwayX = Math.sin(this.time * swayRate) * 6.0;
        smoothNodY = Math.sin(this.time * swayRate * 2) * 3.5 + (beatPulse * 4.0);
        breathScale = 1.0 + Math.sin(this.time * 1.5) * 0.01 + (beatPulse * 0.02);
        bodyTilt = bodySwayX / 550;
      }
    } else {
      breathScale = 1.0 + Math.sin(this.time * 0.9) * 0.006;
    }

    // Ambient glow behind artist
    const imgW = img.width || 512;
    const imgH = img.height || 512;
    ctx.save();
    ctx.globalAlpha = 0.28 + beatPulse * 0.16;
    ctx.filter = 'blur(40px)';
    const bgScale = Math.max(w / imgW, h / imgH) * 1.15;
    const bgW = imgW * bgScale;
    const bgH = imgH * bgScale;
    ctx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
    ctx.restore();

    // Main Artist Presentation Card / Hologram
    const maxPortraitW = w * 0.84;
    const maxPortraitH = h * 0.68;
    const aspect = imgW / imgH;

    let renderW, renderH;
    if (aspect > maxPortraitW / maxPortraitH) {
      renderW = maxPortraitW;
      renderH = maxPortraitW / aspect;
    } else {
      renderH = maxPortraitH;
      renderW = maxPortraitH * aspect;
    }

    const centerX = w / 2;
    const centerY = h * 0.44;

    ctx.save();
    ctx.translate(centerX + bodySwayX, centerY + smoothNodY);
    ctx.rotate(bodyTilt);
    ctx.scale(breathScale, breathScale);

    const drawX = -renderW / 2;
    const drawY = -renderH / 2;

    // Render photo with seamless soft edge mask (dissolves cleanly into dark stage)
    this.renderFeatheredPortrait(img, drawX, drawY, renderW, renderH);

    // Dynamic Beat Aura Glow Frame
    ctx.save();
    ctx.strokeStyle = this.aiMotionActive
      ? `rgba(56, 189, 248, ${0.55 + beatPulse * 0.45})`
      : `rgba(168, 85, 247, ${0.4 + beatPulse * 0.5})`;
    ctx.lineWidth = 2 + beatPulse * 3;
    ctx.shadowColor = this.aiMotionActive ? '#06b6d4' : '#ec4899';
    ctx.shadowBlur = 15 + beatPulse * 20;

    // Rounded subtle border around the portrait area
    const rad = 24;
    ctx.beginPath();
    ctx.roundRect(drawX + 8, drawY + 8, renderW - 16, renderH - 16, rad);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // If AI video mode is active, display sleek badge at top-right of stage
    if (this.aiMotionActive && this.aiModelBadge) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      const badgeW = 310;
      const badgeH = 38;
      const bx = (w - badgeW) / 2;
      const by = h * 0.10;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 19);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🎬 AI動画モード: ${this.aiModelBadge}`, w / 2, by + 24);
      ctx.restore();
    }
  }

  // Draw AI Lip-Sync Generated Video
  drawAiVideoPerformance(w, h, beatPulse) {
    const ctx = this.ctx;
    const vid = this.aiVideoElement;
    if (!vid) return;

    const vidW = vid.videoWidth || 720;
    const vidH = vid.videoHeight || 1280;
    const aspect = vidW / vidH;

    const maxW = w * 0.90;
    const maxH = h * 0.74;

    let renderW, renderH;
    if (aspect > maxW / maxH) {
      renderW = maxW;
      renderH = maxW / aspect;
    } else {
      renderH = maxH;
      renderW = maxH * aspect;
    }

    const cx = w / 2;
    const cy = h * 0.44;

    ctx.save();
    ctx.translate(cx, cy);
    const drawX = -renderW / 2;
    const drawY = -renderH / 2;

    // Draw video
    ctx.drawImage(vid, drawX, drawY, renderW, renderH);

    // Glowing border
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 + beatPulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(drawX, drawY, renderW, renderH);

    ctx.restore();
  }

  // Render photo with seamless feathered mask (completely removes hard square borders)
  renderFeatheredPortrait(img, drawX, drawY, renderW, renderH) {
    const ctx = this.ctx;
    const mw = Math.ceil(renderW);
    const mh = Math.ceil(renderH);

    if (this.maskCanvas.width !== mw || this.maskCanvas.height !== mh) {
      this.maskCanvas.width = mw;
      this.maskCanvas.height = mh;
    }
    const mCtx = this.maskCtx;
    mCtx.clearRect(0, 0, mw, mh);

    // 1. Draw raw photo
    mCtx.drawImage(img, 0, 0, mw, mh);

    // 2. Apply feathered alpha mask
    mCtx.globalCompositeOperation = 'destination-in';

    const radX = mw * 0.48;
    const radY = mh * 0.48;
    const maskGrad = mCtx.createRadialGradient(mw / 2, mh / 2, Math.min(radX, radY) * 0.65, mw / 2, mh / 2, Math.max(radX, radY));
    maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    maskGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0.96)');
    maskGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0.6)');
    maskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = maskGrad;
    mCtx.fillRect(0, 0, mw, mh);

    // Soft fade at bottom
    const bottomGrad = mCtx.createLinearGradient(0, mh * 0.70, 0, mh);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = bottomGrad;
    mCtx.fillRect(0, mh * 0.70, mw, mh * 0.30);

    mCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.maskCanvas, drawX, drawY, renderW, renderH);
  }

  // Particles
  drawParticles(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.particles.forEach(p => {
      p.y += p.vy - beatPulse * 1.5;
      p.x += p.vx + Math.sin(this.time + p.y * 0.01) * 0.4;
      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * (0.6 + beatPulse * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + beatPulse * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Bottom Equalizer
  drawBottomEqualizer(w, h, beatPulse) {
    const ctx = this.ctx;
    const barCount = 24;
    const barWidth = (w * 0.8) / barCount;
    const startX = w * 0.1;
    const baseY = h * 0.88;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < barCount; i++) {
      const mag = this.frequencyBars[i % this.frequencyBars.length] || 0;
      const barH = 4 + mag * 40 + (beatPulse * 15 * (1 - Math.abs(i - barCount / 2) / (barCount / 2)));
      const x = startX + i * barWidth;
      const y = baseY - barH;

      const grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.6, '#a855f7');
      grad.addColorStop(1, '#ec4899');

      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y, barWidth - 4, barH);
    }

    ctx.restore();
  }

  // Vignette & Beat Strobe
  drawVignette(w, h, beatPulse) {
    const ctx = this.ctx;
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.78);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    if (beatPulse > 0.88) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse - 0.88) * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Empty Stage (When no photo uploaded yet)
  drawEmptyStageState(w, h, beatPulse) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h * 0.44;

    ctx.save();
    ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + beatPulse * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(cx - w * 0.32, cy - h * 0.22, w * 0.64, h * 0.44);
    ctx.setLineDash([]);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📷 写真・人物を設定してください', cx, cy - 10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Noto Sans JP", sans-serif';
    ctx.fillText('操作画面からあなたの写真を取り込むと', cx, cy + 22);
    ctx.fillText('このステージの主役として華麗に歌い踊ります', cx, cy + 44);

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.CharacterRenderer = CharacterRenderer;
}
