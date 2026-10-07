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
  // HIGH-FIDELITY LIP-SYNC & JAW ARTICULATION
  // Responds organically to vocal loudness and vowel visemes (A, I, U, E, O)
  // ==========================================
  drawPhotoSingingMouth(ctx, img, drawX, drawY, renderW, renderH, mouthX, mouthY, params) {
    const open = Math.min(1.0, Math.max(0, params.mouthOpen || 0));
    if (open < 0.035) return; // Keep original natural mouth when silent

    const vowel = params.dominantVowel || 'A';
    const faceScale = renderW / 400;

    let mw = (26 + (params.mouthWidth || 0.5) * 22) * faceScale;
    let mh = (open * 22 + 4) * faceScale;

    // Distinct realistic shape by vowel viseme
    if (vowel === 'A') {
      mh *= 1.35;
      mw *= 1.05;
    } else if (vowel === 'O') {
      mh *= 1.25;
      mw *= 0.85;
    } else if (vowel === 'U') {
      mh *= 0.95;
      mw *= 0.72;
    } else if (vowel === 'I') {
      mh *= 0.75;
      mw *= 1.40;
    } else if (vowel === 'E') {
      mh *= 0.90;
      mw *= 1.30;
    }

    ctx.save();
    ctx.translate(mouthX, mouthY);

    // A. ORGANIC JAW / CHIN DESCENT
    // Slips the lower jaw and chin downwards realistically during open vowels
    const chinShift = open * 8.5 * faceScale;
    if (chinShift > 1.2 && img) {
      ctx.save();
      ctx.beginPath();
      // Clip lower jaw rectangle
      ctx.rect(-renderW * 0.35, mh * 0.22, renderW * 0.7, renderH * (1 - (this.mouthPosYRatio || 0.44)));
      ctx.clip();
      ctx.translate(0, chinShift);
      ctx.drawImage(img, drawX, drawY, renderW, renderH);
      ctx.restore();
    }

    // B. NATURAL SKIN-BLENDED ORAL CAVITY & LIP CONTOURS
    // Feathered skin shadow around the mouth opening
    const shadowGrad = ctx.createRadialGradient(0, 0, mw * 0.35, 0, 0, mw * 0.90);
    shadowGrad.addColorStop(0, 'rgba(35, 12, 18, 0.85)');
    shadowGrad.addColorStop(0.70, 'rgba(80, 25, 38, 0.35)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.75, mh * 0.75 + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep oral cavity (Dark inside of mouth)
    ctx.fillStyle = '#180509';
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.55, mh * 0.55 + 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper Teeth row (naturally visible on open vowels and especially 'I' / 'E')
    if (open > 0.12 || vowel === 'I' || vowel === 'E') {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      const toothH = (vowel === 'I' || vowel === 'E') ? mh * 0.24 : mh * 0.18;
      ctx.ellipse(0, -mh * 0.26, mw * 0.42, toothH, 0, 0, Math.PI);
      ctx.fill();

      // Subtle dental shading
      ctx.strokeStyle = 'rgba(160, 130, 140, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -mh * 0.36);
      ctx.lineTo(0, -mh * 0.10);
      ctx.stroke();
    }

    // Tongue (visible on wide open vowels 'A', 'O', 'E')
    if (open > 0.32 && (vowel === 'A' || vowel === 'O' || vowel === 'E')) {
      const tongueGrad = ctx.createLinearGradient(0, mh * 0.1, 0, mh * 0.55);
      tongueGrad.addColorStop(0, '#f472b6');
      tongueGrad.addColorStop(1, '#be185d');
      ctx.fillStyle = tongueGrad;
      ctx.beginPath();
      ctx.ellipse(0, mh * 0.28, mw * 0.34, mh * 0.22, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // Natural Soft Lip Contours
    ctx.strokeStyle = 'rgba(219, 39, 119, 0.42)';
    ctx.lineWidth = 2.0 * faceScale;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.56, mh * 0.56 + 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
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
    ctx.font = 'bold 26px "Noto Sans JP", sans-serif';
    ctx.fillText('写真がまだ選択されていません', w / 2, cardY + 140);

    // Subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px "Noto Sans JP", sans-serif';
    ctx.fillText('「操作画面」からあなたの写真を取り込むか、', w / 2, cardY + 190);
    ctx.fillText('下のお手本サンプルをお試しください', w / 2, cardY + 222);

    // Sample Launch Button graphic
    const btnW = cardW * 0.78;
    const btnH = 50;
    const btnX = (w - btnW) / 2;
    const btnY = cardY + 260;

    const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
    btnGrad.addColorStop(0, '#ec4899');
    btnGrad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 25);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px "Noto Sans JP", sans-serif';
    ctx.fillText('🎬 お手本サンプルMVを再生する', w / 2, btnY + 25);

    ctx.restore();

    this.drawVignette(w, h, beatPulse);
  }
}

window.CharacterRenderer = CharacterRenderer;
