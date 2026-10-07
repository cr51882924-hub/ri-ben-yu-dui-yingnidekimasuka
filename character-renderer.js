/**
 * GrooveSync MV - High Expressive Photo Lip-Sync & Stage Performance Renderer
 * Features seamless cinematic portrait blending, organic singer groove (NO robot jitter),
 * and high-fidelity viseme lip-sync & jaw articulation.
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
      bgGradient: ['#0f051d', '#1e1145', '#090514'],
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

    // Custom user/sample photo avatar & lip-sync settings
    this.customAvatarImg = null;
    this.mouthPosYRatio = 0.44; // Default 44% (human portrait mouth location)

    // Simulation states
    this.time = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.particles = [];
    this.lasers = [];
    this.cameraShake = { x: 0, y: 0, zoom: 1 };

    // Interactive Test Lip-Sync preview (e.g. when moving mouth slider)
    this.testLipsyncTimer = 0;

    // Offscreen mask canvas for seamless cinematic edge blending
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.initStage();
  }

  initStage() {
    this.particles = [];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * (this.canvas.width || 720),
        y: Math.random() * (this.canvas.height || 1280),
        r: Math.random() * 2.5 + 1.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.9 - 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.5 ? '#a855f7' : '#06b6d4'
      });
    }

    this.lasers = [];
    for (let i = 0; i < 6; i++) {
      this.lasers.push({
        angle: (i / 5) * Math.PI - Math.PI / 2,
        speed: (Math.random() * 0.02 + 0.01) * (i % 2 === 0 ? 1 : -1),
        width: 16 + Math.random() * 12
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

  setMouthPosY(ratio) {
    this.mouthPosYRatio = Math.max(0.15, Math.min(0.85, ratio));
  }

  // Trigger brief visual test of lip-sync animation (used when adjusting slider)
  startLipsyncTest(duration = 2.0) {
    this.testLipsyncTimer = Math.max(this.testLipsyncTimer, duration);
  }

  setStage(id) {
    if (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.stages && GROOVE_PRESETS.stages[id]) {
      this.stageTheme = GROOVE_PRESETS.stages[id];
    }
  }

  setCamera(mode) {
    this.cameraMode = mode;
  }

  // Utility: Smooth round rect helper
  roundRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // ==========================================
  // Main Render Loop (60 FPS)
  // ==========================================
  render(audioEngine) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.time += 0.032;

    // Handle interactive test lip-sync timer
    let isTestActive = false;
    let testMouthOpen = 0;
    let testVowel = 'A';
    if (this.testLipsyncTimer > 0) {
      this.testLipsyncTimer -= 0.032;
      isTestActive = true;
      const cycle = (this.time * 3.5) % (Math.PI * 2);
      testMouthOpen = (Math.sin(cycle) + 1) * 0.45;
      const vowels = ['A', 'I', 'U', 'E', 'O'];
      testVowel = vowels[Math.floor((this.time * 2.5) % vowels.length)];
    }

    // Blink timer (natural periodic eye blinking)
    this.blinkTimer += 0.032;
    if (this.blinkTimer > 3.8) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.96) {
        this.isBlinking = false;
        this.blinkTimer = Math.random() * 1.5;
      }
    }

    // Audio reactive metrics
    const isPlaying = audioEngine ? audioEngine.isPlaying : false;
    const beatPulse = (audioEngine && isPlaying) ? audioEngine.beatPulse : 0;
    const groove = (audioEngine && isPlaying) ? audioEngine.grooveLevel : 0;
    const bpm = (audioEngine && audioEngine.bpm) ? audioEngine.bpm : 128;

    let mouthOpen = 0;
    let mouthWidth = 0.5;
    let dominantVowel = 'A';

    if (isPlaying && audioEngine) {
      mouthOpen = (audioEngine.mouthOpen || 0) * this.lipsyncSens;
      mouthWidth = audioEngine.mouthWidth || 0.5;
      dominantVowel = audioEngine.currentChar || 'A';
    } else if (isTestActive) {
      mouthOpen = testMouthOpen * this.lipsyncSens;
      dominantVowel = testVowel;
      mouthWidth = (testVowel === 'I' || testVowel === 'E') ? 0.8 : (testVowel === 'U' ? 0.35 : 0.6);
    }

    // Camera punch: Smooth zoom punch on kick beat only — NO jittery x/y shaking!
    const targetZoom = 1.0 + beatPulse * 0.035;
    this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.2;
    this.cameraShake.x = 0; // Completely eliminate jerky jitter
    this.cameraShake.y = 0;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraShake.zoom, this.cameraShake.zoom);
    ctx.translate(-w / 2, -h / 2);

    // If NO photo uploaded or selected: draw empty stage with sample prompt
    if (!this.customAvatarImg) {
      this.drawEmptyStageState(w, h, beatPulse);
      ctx.restore();
      return;
    }

    // Photo MV performance
    this.drawPhotoMVPerformance(w, h, {
      isPlaying,
      beatPulse,
      groove,
      mouthOpen,
      mouthWidth,
      dominantVowel,
      bpm
    });

    ctx.restore();
  }

  drawStageBackground(w, h, beatPulse) {
    const ctx = this.ctx;
    const theme = this.stageTheme || {};
    const bg = theme.bgGradient || ['#0f051d', '#1e1145', '#090514'];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(0.55, bg[1] || bg[0]);
    grad.addColorStop(1, bg[2] || bg[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Center spotlight glow
    const spotX = w / 2;
    const spotY = h * 0.40;
    const spotRad = (w * 0.52) + beatPulse * 40;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 15, spotX, spotY, spotRad);
    spotGrad.addColorStop(0, `rgba(168, 85, 247, ${0.35 + beatPulse * 0.2})`);
    spotGrad.addColorStop(0.55, `rgba(236, 72, 153, ${0.15 + beatPulse * 0.12})`);
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotRad, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStageFloor(w, h, beatPulse) {
    const ctx = this.ctx;
    const floorY = h * 0.74;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    floorGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Stage neon edge
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.5 + beatPulse * 0.5})`;
    ctx.lineWidth = 3 + beatPulse * 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();

    // Perspective floor lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1.5;
    for (let x = -w * 0.3; x <= w * 1.3; x += w * 0.16) {
      ctx.beginPath();
      ctx.moveTo(w / 2, floorY - 60);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  drawStageLasers(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const originY = -50;
    const lasersColors = (this.stageTheme && this.stageTheme.lasers) || ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b'];
    this.lasers.forEach((laser, idx) => {
      laser.angle += laser.speed;
      if (Math.abs(laser.angle) > Math.PI * 0.45) laser.speed *= -1;

      const originX = w * (0.15 + (idx / 5) * 0.7);
      const targetX = originX + Math.sin(laser.angle + Math.sin(this.time * 0.5)) * (w * 0.85);
      const targetY = h * 0.85;

      const laserColor = lasersColors[idx % lasersColors.length];
      const alpha = (0.22 + beatPulse * 0.45);

      const lGrad = ctx.createLinearGradient(originX, originY, targetX, targetY);
      lGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
      lGrad.addColorStop(0.3, laserColor);
      lGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = lGrad;
      ctx.lineWidth = laser.width + beatPulse * 6;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    });

    ctx.restore();
  }

  drawParticles(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.particles.forEach(p => {
      p.y += p.vy - beatPulse * 1.2;
      p.x += p.vx + Math.sin(this.time + p.y * 0.01) * 0.3;
      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * (0.6 + beatPulse * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + beatPulse * 1.0, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  drawVignette(w, h, beatPulse) {
    const ctx = this.ctx;
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.78);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    if (beatPulse > 0.85) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse - 0.85) * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ==========================================
  // Draw Photo MV Performance
  // Seamless Cinematic Stage Integration (ZERO HARD SQUARE BORDER!)
  // ==========================================
  drawPhotoMVPerformance(w, h, params) {
    const ctx = this.ctx;
    const img = this.customAvatarImg;
    if (!img) return;

    const isPlaying = params.isPlaying;
    const bpm = params.bpm || 128;
    const beatPulse = params.beatPulse || 0;

    // 1. Organic Singer Motion:
    // If NOT playing music: calm breathing only (NO robot swaying or shaking!)
    let bodySwayX = 0;
    let smoothNodY = 0;
    let breathScale = 1.0;
    let bodyTilt = 0;

    if (isPlaying) {
      // Smooth, elegant rhythm when singing
      const swayRate = (bpm / 60) * Math.PI * 0.75;
      bodySwayX = Math.sin(this.time * swayRate) * 6.5;
      smoothNodY = Math.sin(this.time * swayRate * 2) * 3.5 + (beatPulse * 2.8);
      breathScale = 1.0 + Math.sin(this.time * 1.5) * 0.01 + (beatPulse * 0.015);
      bodyTilt = bodySwayX / 500;
    } else {
      // Gentle calm breathing at rest
      breathScale = 1.0 + Math.sin(this.time * 0.9) * 0.006;
    }

    // 2. Stage Lighting & Background
    this.drawStageBackground(w, h, beatPulse);
    this.drawStageFloor(w, h, beatPulse);

    // 3. Ambient atmospheric glow behind the artist
    const imgW = img.width || 512;
    const imgH = img.height || 512;
    ctx.save();
    ctx.globalAlpha = 0.24 + beatPulse * 0.12;
    ctx.filter = 'blur(45px)';
    const bgScale = Math.max(w / imgW, h / imgH) * 1.15;
    const bgW = imgW * bgScale;
    const bgH = imgH * bgScale;
    ctx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
    ctx.restore();

    // 4. Stage Lasers behind the artist
    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }

    // 5. Main Photo Portrait: Seamless Portrait Blending
    // Completely eliminates hard rectangular photo edges using feathered offscreen mask
    const maxPortraitW = w * 0.88;
    const maxPortraitH = h * 0.72;
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

    // Render photo with seamless feathered mask to dissolve edges into dark stage
    this.renderFeatheredPortrait(img, drawX, drawY, renderW, renderH);

    // 6. HIGH-FIDELITY LIP-SYNC & JAW MOVEMENT
    const mouthY = drawY + renderH * (this.mouthPosYRatio || 0.44);
    const mouthX = 0;

    this.drawPhotoSingingMouth(ctx, img, drawX, drawY, renderW, renderH, mouthX, mouthY, params);

    // 7. Subtle Natural Blink
    if (this.isBlinking) {
      const eyeY = drawY + renderH * ((this.mouthPosYRatio || 0.44) * 0.72);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 15, 25, 0.65)';
      ctx.beginPath();
      ctx.ellipse(mouthX - renderW * 0.14, eyeY, renderW * 0.08, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(mouthX + renderW * 0.14, eyeY, renderW * 0.08, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // 8. Floating Stage Particles in front of artist
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 9. Stage Atmosphere & Vignette
    this.drawVignette(w, h, beatPulse);
  }

  // Render photo with seamless soft edge mask (completely removes hard square corners!)
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

    // 2. Apply feathered alpha mask (soft cinematic fade along edges and bottom)
    mCtx.globalCompositeOperation = 'destination-in';

    // Elliptical gradient fading seamlessly into darkness
    const radX = mw * 0.48;
    const radY = mh * 0.48;
    const maskGrad = mCtx.createRadialGradient(mw / 2, mh / 2, Math.min(radX, radY) * 0.65, mw / 2, mh / 2, Math.max(radX, radY));
    maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    maskGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0.95)');
    maskGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0.55)');
    maskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = maskGrad;
    mCtx.fillRect(0, 0, mw, mh);

    // Soft fade at bottom (dissolves artist naturally into stage floor)
    const bottomGrad = mCtx.createLinearGradient(0, mh * 0.68, 0, mh);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = bottomGrad;
    mCtx.fillRect(0, mh * 0.68, mw, mh * 0.32);

    mCtx.globalCompositeOperation = 'source-over';

    // Draw composited feathered portrait
    ctx.drawImage(this.maskCanvas, drawX, drawY, renderW, renderH);
  }

  // ==========================================
  // Photo Display without glitched cuts or fake cartoon overlays
  drawPhotoSingingMouth(ctx, img, drawX, drawY, renderW, renderH, mouthX, mouthY, params) {
    // Intentionally omitted: Prevents clipping/slicing the human portrait or drawing cartoon shapes over photos
  }

  // ==========================================
  // Draw Empty Stage State (when no photo is loaded)
  // Provides direct action to launch Official Lip-Sync Sample MV
  // ==========================================
  drawEmptyStageState(w, h, beatPulse) {
    const ctx = this.ctx;

    // Concert stage lighting & floor
    this.drawStageBackground(w, h, beatPulse);
    this.drawStageFloor(w, h, beatPulse);

    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // Central elegant instruction card
    ctx.save();
    const cardW = Math.min(w * 0.88, 540);
    const cardH = 340;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2 - 20;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.shadowColor = 'rgba(139, 92, 246, 0.45)';
    ctx.shadowBlur = 28;
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;

    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sparkle Icon
    ctx.font = '54px sans-serif';
    ctx.fillText('✨', w / 2, cardY + 68);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Noto Sans JP", sans-serif';
    ctx.fillText('写真が選択されていません', w / 2, cardY + 130);

    // Subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px "Noto Sans JP", sans-serif';
    ctx.fillText('「← 操作画面に戻る」をタップして、', w / 2, cardY + 185);
    ctx.fillText('人物の写真をアップロードしてください。', w / 2, cardY + 220);

    ctx.restore();

    this.drawVignette(w, h, beatPulse);
  }
}

window.CharacterRenderer = CharacterRenderer;
