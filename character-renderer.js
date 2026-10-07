/**
 * GrooveSync MV - High Expressive Character & Stage Renderer
 * Renders full human/anime performance, guitar/keyboard playing, dancing, beat sway, and viseme lip-sync
 */

class CharacterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Rendering parameters
    this.aspectRatio = '9:16';
    this.motionPreset = GROOVE_PRESETS.motions.guitar;
    this.characterPreset = null;
    this.stageTheme = GROOVE_PRESETS.stages.livehouse;
    this.cameraMode = 'dynamic';

    // Sliders & sensitivities
    this.lipsyncSens = 0.85;
    this.grooveStrength = 0.70;
    this.expressionLevel = 0.80;
    this.headbobStrength = 0.75;

    // Toggles
    this.showLasers = true;
    this.showParticles = true;

    // Custom user image avatar & lip-sync settings
    this.customAvatarImg = null;
    this.mouthPosYRatio = 0.45; // Default 45% (human portrait mouth location)

    // Simulation states
    this.time = 0;
    this.blinkTimer = 0;
    this.isBlinking = false;
    this.particles = [];
    this.lasers = [];
    this.cameraShake = { x: 0, y: 0, zoom: 1 };

    this.initStage();
  }

  initStage() {
    this.particles = [];
    for (let i = 0; i < 45; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
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
    if (GROOVE_PRESETS.motions[id]) {
      this.motionPreset = GROOVE_PRESETS.motions[id];
    }
  }

  setCharacter(id) {
    if (GROOVE_PRESETS.characters[id]) {
      this.characterPreset = GROOVE_PRESETS.characters[id];
      this.customAvatarImg = null;
    }
  }

  setCustomAvatar(imageElement) {
    this.customAvatarImg = imageElement;
  }

  setMouthPosY(ratio) {
    this.mouthPosYRatio = Math.max(0.15, Math.min(0.85, ratio));
  }

  setStage(id) {
    if (GROOVE_PRESETS.stages[id]) {
      this.stageTheme = GROOVE_PRESETS.stages[id];
    }
  }

  setCamera(mode) {
    this.cameraMode = mode;
  }

  // Main Render Loop
  render(audioEngine) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.time += 0.032;

    // Blink timer
    this.blinkTimer += 0.032;
    if (this.blinkTimer > 3.6) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.76) {
        this.isBlinking = false;
        this.blinkTimer = Math.random() * 1.5;
      }
    }

    // Audio reactive metrics
    const beatPulse = audioEngine ? audioEngine.beatPulse : 0;
    const groove = audioEngine ? audioEngine.grooveLevel : 0.2;
    const mouthOpen = audioEngine ? (audioEngine.mouthOpen * this.lipsyncSens) : 0;
    const mouthWidth = audioEngine ? audioEngine.mouthWidth : 0.5;
    const dominantVowel = audioEngine ? audioEngine.currentChar : 'A';
    const bpm = audioEngine ? audioEngine.bpm : 120;

    // Camera punch on kick
    const targetZoom = 1.0 + beatPulse * 0.07;
    this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.25;
    this.cameraShake.x = Math.sin(this.time * 2) * 5;
    this.cameraShake.y = Math.cos(this.time * 2.5) * 3 + beatPulse * 4;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraShake.zoom, this.cameraShake.zoom);
    ctx.translate(-w / 2 + this.cameraShake.x, -h / 2 + this.cameraShake.y);

    // If NO photo uploaded yet: draw empty stage with instruction card
    if (!this.customAvatarImg) {
      this.drawEmptyStageState(w, h, beatPulse);
      ctx.restore();
      return;
    }

    // Photo MV performance:
    this.drawPhotoMVPerformance(w, h, {
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
    const theme = this.stageTheme;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, theme.bgGradient[0]);
    grad.addColorStop(0.55, theme.bgGradient[1]);
    grad.addColorStop(1, theme.bgGradient[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Back spotlight glow
    const spotX = w / 2;
    const spotY = h * 0.38;
    const spotRad = (w * 0.5) + beatPulse * 50;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 15, spotX, spotY, spotRad);
    spotGrad.addColorStop(0, `rgba(168, 85, 247, ${0.35 + beatPulse * 0.25})`);
    spotGrad.addColorStop(0.55, `rgba(236, 72, 153, ${0.15 + beatPulse * 0.15})`);
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
    this.lasers.forEach((laser, idx) => {
      laser.angle += laser.speed;
      if (Math.abs(laser.angle) > Math.PI * 0.45) laser.speed *= -1;

      const originX = w * (0.15 + (idx / 5) * 0.7);
      const targetX = originX + Math.sin(laser.angle + Math.sin(this.time)) * (w * 0.85);
      const targetY = h * 0.85;

      const laserColor = this.stageTheme.lasers[idx % this.stageTheme.lasers.length];
      const alpha = (0.25 + beatPulse * 0.45);

      const lGrad = ctx.createLinearGradient(originX, originY, targetX, targetY);
      lGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
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
      ctx.globalAlpha = p.alpha * (0.7 + beatPulse * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + beatPulse * 1.2, 0, Math.PI * 2);
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
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse - 0.85) * 0.3})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ==========================================
  // Character Performance & Skeletal Animation
  // ==========================================
  drawCharacterPerformance(w, h, params) {
    const ctx = this.ctx;
    const motion = this.motionPreset;
    const char = this.characterPreset;

    const centerX = w / 2;
    const baseY = h * 0.70;

    // Body sway & bounce
    const swayRate = (params.bpm / 60) * Math.PI * motion.swayFreq;
    const bodySwayX = Math.sin(this.time * swayRate) * motion.swayAmp * this.grooveStrength;
    const bodyBounceY = -Math.abs(Math.sin(this.time * swayRate * 2)) * 14 * this.grooveStrength - (params.beatPulse * 20);
    const bodyTilt = (bodySwayX / 220);

    // Head bob
    const headbobRate = (params.bpm / 60) * Math.PI * 2;
    const headbobY = Math.sin(this.time * headbobRate) * motion.headbobAmp * this.headbobStrength;
    const headTilt = -bodyTilt * 1.4 + (Math.sin(this.time * swayRate * 0.5) * 0.08);

    ctx.save();
    ctx.translate(centerX + bodySwayX, baseY + bodyBounceY);
    ctx.rotate(bodyTilt);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 40 - bodyBounceY * 0.6, 130, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Lower Body / Legs
    this.drawLegs(motion);

    // 2. Torso & Stylish Clothes
    this.drawTorso(char, motion);

    // 3. Instruments
    if (motion.instrument === 'electric_guitar' || motion.instrument === 'acoustic_guitar') {
      this.drawGuitar(motion.instrument, char, params);
    } else if (motion.instrument === 'keyboard') {
      this.drawKeyboard(params);
    } else if (motion.instrument === 'dj_deck') {
      this.drawDJConsole(params);
    }

    // 4. Arms & Hands
    this.drawArmsAndHands(char, motion, params);

    // 5. Head & Anime Singing Face
    ctx.save();
    ctx.translate(0, -220 + headbobY);
    ctx.rotate(headTilt);

    this.drawHeadAndFace(char, params);

    ctx.restore();

    ctx.restore();
  }

  // Draw Legs (Slim black skinny pants & white sneakers)
  drawLegs(motion) {
    const ctx = this.ctx;
    const legSpread = motion.id === 'dance' ? 44 : 32;
    const stepOffset = motion.id === 'dance' ? Math.sin(this.time * 5) * 14 : 0;

    // Left leg
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-legSpread - 12, -45);
    ctx.lineTo(-legSpread - 2, 40 + stepOffset);
    ctx.lineTo(-legSpread + 22, 40 + stepOffset);
    ctx.lineTo(-legSpread + 16, -45);
    ctx.closePath();
    ctx.fill();

    // Left sneaker
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(-legSpread - 10, 36 + stepOffset, 36, 16, 5);
    ctx.fill();

    // Right leg
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(legSpread - 16, -45);
    ctx.lineTo(legSpread - 22, 40 - stepOffset);
    ctx.lineTo(legSpread + 2, 40 - stepOffset);
    ctx.lineTo(legSpread + 12, -45);
    ctx.closePath();
    ctx.fill();

    // Right sneaker
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(legSpread - 24, 36 - stepOffset, 36, 16, 5);
    ctx.fill();
  }

  // Draw Torso (Slim silhouette with jacket)
  drawTorso(char, motion) {
    const ctx = this.ctx;

    // Inner top
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(-36, -170, 72, 130, 8);
    ctx.fill();

    // Outer stage jacket
    ctx.fillStyle = char.outfitColor || '#312e81';
    // Left jacket flap
    ctx.beginPath();
    ctx.moveTo(-54, -180);
    ctx.lineTo(-20, -180);
    ctx.lineTo(-12, -45);
    ctx.lineTo(-44, -45);
    ctx.closePath();
    ctx.fill();

    // Right jacket flap
    ctx.beginPath();
    ctx.moveTo(20, -180);
    ctx.lineTo(54, -180);
    ctx.lineTo(44, -45);
    ctx.lineTo(12, -45);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = char.skinTone;
    ctx.beginPath();
    ctx.roundRect(-15, -195, 30, 30, 4);
    ctx.fill();

    // Guitar strap
    if (motion.instrument.includes('guitar')) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-48, -180);
      ctx.lineTo(40, -90);
      ctx.stroke();

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw Realistic Electric / Acoustic Guitar
  drawGuitar(type, char, params) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(6, -100);
    ctx.rotate(-0.35 + Math.sin(this.time * 3) * 0.04);

    const isElectric = (type === 'electric_guitar');
    const bodyColor = isElectric ? (char.guitarColor || '#e11d48') : '#b45309';

    // Guitar Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    if (isElectric) {
      // Stratocaster sleek curves
      ctx.moveTo(-75, -28);
      ctx.bezierCurveTo(-95, -45, -85, 55, -42, 70);
      ctx.bezierCurveTo(-10, 80, 45, 70, 80, 42);
      ctx.bezierCurveTo(95, 18, 85, -35, 55, -32);
      ctx.bezierCurveTo(32, -22, 12, -38, 0, -38);
      ctx.bezierCurveTo(-22, -38, -55, -12, -75, -28);
    } else {
      ctx.ellipse(0, 10, 68, 52, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // White Pickguard
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-10, 6, 28, 24, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pickups / Knobs
    if (isElectric) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-24, -8, 34, 6);
      ctx.fillRect(-24, 9, 34, 6);
      ctx.fillRect(-24, 26, 34, 6);

      // Volume knobs
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(38, 24, 5, 0, Math.PI * 2);
      ctx.arc(48, 38, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(-8, 6, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fretboard & Neck
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-175, -12, 155, 15);

    // Frets
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let f = -170; f < -25; f += 14) {
      ctx.beginPath();
      ctx.moveTo(f, -12);
      ctx.lineTo(f, 3);
      ctx.stroke();
    }

    // Headstock
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-200, -16, 26, 22);

    // Strings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    for (let s = -8; s <= 0; s += 2.5) {
      ctx.beginPath();
      ctx.moveTo(-195, s);
      ctx.lineTo(45, s);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Keyboard
  drawKeyboard(params) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, -90);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-75, 95);
    ctx.lineTo(0, 0);
    ctx.lineTo(75, 95);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-115, -15, 230, 32, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    for (let k = -100; k < 100; k += 11) {
      ctx.fillRect(k, -10, 9, 24);
    }
    ctx.fillStyle = '#000000';
    for (let k = -95; k < 95; k += 11) {
      if (Math.abs(k) % 33 !== 0) {
        ctx.fillRect(k, -10, 6, 14);
      }
    }

    ctx.restore();
  }

  // Draw DJ Console
  drawDJConsole(params) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, -85);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-125, -10, 250, 38, 6);
    ctx.fill();

    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(-70, 6, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(70, 6, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ec4899';
    ctx.stroke();

    ctx.restore();
  }

  // Draw Arms and Hands (Natural curves and fingers)
  drawArmsAndHands(char, motion, params) {
    const ctx = this.ctx;
    const skin = char.skinTone;
    const outfit = char.outfitColor;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (motion.instrument.includes('guitar')) {
      // LEFT ARM: Holds guitar neck & slides on frets
      const fretSlide = Math.sin(this.time * 2.5) * 22;
      ctx.strokeStyle = outfit;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-50, -170);
      ctx.quadraticCurveTo(-115, -135, -125 + fretSlide, -122);
      ctx.stroke();

      // Hand on neck
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-125 + fretSlide, -122, 12, 0, Math.PI * 2);
      ctx.fill();

      // RIGHT ARM: Strumming action (rhythmic up/down)
      const strumRate = (params.bpm / 60) * Math.PI * motion.strumSpeed;
      const strumOffset = Math.sin(this.time * strumRate) * 18;
      ctx.strokeStyle = outfit;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(50, -170);
      ctx.quadraticCurveTo(90, -115, 12, -85 + strumOffset);
      ctx.stroke();

      // Strumming hand
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(12, -85 + strumOffset, 12, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'keyboard') {
      const leftKey = Math.sin(this.time * 6) * 10;
      const rightKey = Math.cos(this.time * 6.5) * 10;

      ctx.strokeStyle = outfit;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-72, -125, -52 + leftKey, -88);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-52 + leftKey, -88, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(72, -125, 52 + rightKey, -88);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(52 + rightKey, -88, 11, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.id === 'dance') {
      const danceL = Math.sin(this.time * 4) * 36;
      const danceR = Math.cos(this.time * 4) * 36;

      ctx.strokeStyle = outfit;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-50, -170);
      ctx.quadraticCurveTo(-85, -190 + danceL, -95, -150 + danceL);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-95, -150 + danceL, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(50, -170);
      ctx.quadraticCurveTo(85, -190 - danceR, 95, -150 - danceR);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(95, -150 - danceR, 11, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'mic_hand' || motion.id === 'sway') {
      // Holding microphone near chin
      ctx.strokeStyle = outfit;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-76, -165, -16, -198);
      ctx.stroke();

      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-16, -198, 11, 0, Math.PI * 2);
      ctx.fill();

      // Mic
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-19, -218, 11, 24);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-14, -220, 10, 0, Math.PI * 2);
      ctx.fill();

      // Free arm swaying
      const gesture = Math.sin(this.time * 2) * 22;
      ctx.strokeStyle = outfit;
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(86, -130 + gesture, 72, -90 + gesture);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(72, -90 + gesture, 11, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'mic_stand' || motion.id === 'headbang') {
      ctx.strokeStyle = outfit;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.lineTo(-12, -180);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.lineTo(12, -180);
      ctx.stroke();

      // Mic Stand
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, -225);
      ctx.lineTo(0, 35);
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -226, 11, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'dj_deck') {
      ctx.strokeStyle = outfit;
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-78, -200, -38, -225);
      ctx.stroke();

      const scratch = Math.sin(this.time * 8) * 16;
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(75, -120, 68 + scratch, -80);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(68 + scratch, -80, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // Head, Face & Expressive Singing Face (Anime / Human Style)
  // ==========================================
  drawHeadAndFace(char, params) {
    const ctx = this.ctx;
    const skin = char.skinTone;
    const hair = char.hairColor;

    if (this.customAvatarImg) {
      this.drawCustomAvatarFace(char, params);
      return;
    }

    // 1. Back flowing hair
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();

    const hairSway = Math.sin(this.time * 4) * 15;
    ctx.beginPath();
    ctx.ellipse(-56 + hairSway * 0.4, 32, 18, 65, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(56 + hairSway * 0.4, 32, 18, 65, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Soft, curved anime face
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-38, -10);
    ctx.bezierCurveTo(-40, 26, -26, 48, 0, 54); // Soft chin
    ctx.bezierCurveTo(26, 48, 40, 26, 38, -10);
    ctx.bezierCurveTo(36, -42, -36, -42, -38, -10);
    ctx.closePath();
    ctx.fill();

    // Soft blush cheeks
    ctx.fillStyle = 'rgba(244, 63, 94, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-23, 14, 9, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(23, 14, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Eyes & Eyebrows
    this.drawEyesAndBrows(char, params);

    // 4. Cute nose dot
    ctx.fillStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 13, 2, 0, Math.PI * 2);
    ctx.fill();

    // 5. High-Precision Expressive Lip-Sync Mouth Mesh (Visemes)
    this.drawExpressiveMouth(params);

    // 6. Styled Front Bangs with highlights
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-45, -24);
    ctx.quadraticCurveTo(-22, -6, -16, 8);
    ctx.quadraticCurveTo(-6, -10, 0, 10);
    ctx.quadraticCurveTo(16, -8, 26, 7);
    ctx.quadraticCurveTo(36, -10, 45, -24);
    ctx.quadraticCurveTo(0, -60, -45, -24);
    ctx.closePath();
    ctx.fill();

    // Hair shine highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -32, 28, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEyesAndBrows(char, params) {
    const ctx = this.ctx;
    const eyeColor = char.eyeColor || '#f43f5e';
    const isSingingHigh = params.mouthOpen > 0.6;

    const browLift = isSingingHigh ? -5 * this.expressionLevel : 0;
    ctx.strokeStyle = char.hairColor;
    ctx.lineWidth = 2.5;

    // Eyebrows
    ctx.beginPath();
    ctx.moveTo(-28, -13 + browLift);
    ctx.quadraticCurveTo(-18, -17 + browLift, -8, -13 + browLift);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, -13 + browLift);
    ctx.quadraticCurveTo(18, -17 + browLift, 28, -13 + browLift);
    ctx.stroke();

    // Eyes
    if (this.isBlinking) {
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, 2);
      ctx.quadraticCurveTo(-19, 6, -10, 2);
      ctx.moveTo(10, 2);
      ctx.quadraticCurveTo(19, 6, 28, 2);
      ctx.stroke();
    } else {
      [-19, 19].forEach(x => {
        // Eye white
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, 1, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(x, 1, 7.5, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x, 1, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle highlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 3, -2, 2.8, 0, Math.PI * 2);
        ctx.arc(x + 2.5, 3, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyelash upper line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, -1, 10, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      });
    }
  }

  // Draw Mouth with Viseme Shapes (A, I, U, E, O)
  drawExpressiveMouth(params) {
    const ctx = this.ctx;
    const mouthY = 32;
    const open = params.mouthOpen;
    const vowel = params.dominantVowel;

    ctx.save();
    ctx.translate(0, mouthY);

    if (open < 0.12) {
      // Resting smile
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(0, 3, 8, 0);
      ctx.stroke();
    } else {
      let mw = 13;
      let mh = 14;

      if (vowel === 'A') {
        mw = 15 + open * 7;
        mh = 13 + open * 18;
      } else if (vowel === 'I') {
        mw = 20 + open * 7;
        mh = 7 + open * 8;
      } else if (vowel === 'U') {
        mw = 9 + open * 4;
        mh = 9 + open * 11;
      } else if (vowel === 'E') {
        mw = 18 + open * 5;
        mh = 10 + open * 11;
      } else if (vowel === 'O') {
        mw = 11 + open * 5;
        mh = 15 + open * 20;
      }

      // Oral cavity
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.ellipse(0, mh * 0.4, mw, mh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper teeth
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-mw * 0.75, 0, mw * 1.5, Math.min(mh * 0.28, 6), 2);
      ctx.fill();

      // Tongue
      if (mh > 10) {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.ellipse(0, mh * 0.65, mw * 0.7, mh * 0.26, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lip outline
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, mh * 0.4, mw, mh * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==========================================
  // Custom Photo MV & Empty Stage Methods
  // ==========================================
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
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Draw Empty Stage State (when no photo is selected yet)
  drawEmptyStageState(w, h, beatPulse) {
    const ctx = this.ctx;

    // Deep concert stage background & floor
    this.drawStageBackground(w, h, beatPulse);
    this.drawStageFloor(w, h, beatPulse);

    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // Central elegant placeholder card
    ctx.save();
    const cardW = Math.min(w * 0.86, 560);
    const cardH = 340;
    const cardX = (w - cardW) / 2;
    const cardY = (h - cardH) / 2 - 20;

    ctx.fillStyle = 'rgba(17, 24, 39, 0.88)';
    ctx.shadowColor = 'rgba(139, 92, 246, 0.4)';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2.5;

    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Camera Icon
    ctx.font = '64px sans-serif';
    ctx.fillText('📷', w / 2, cardY + 75);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Noto Sans JP", sans-serif';
    ctx.fillText('写真がまだ選択されていません', w / 2, cardY + 160);

    // Subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px "Noto Sans JP", sans-serif';
    ctx.fillText('【STEP 1: 写真を取り込む】から', w / 2, cardY + 215);
    ctx.fillText('人物やアーティストの写真を選択してください', w / 2, cardY + 250);

    // Tag
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
    ctx.fillText('あなたの写真が主役のMVになります', w / 2, cardY + 295);

    ctx.restore();

    this.drawVignette(w, h, beatPulse);
  }

  // Draw Photo MV Performance (Your uploaded photo is 100% the star!)
  drawPhotoMVPerformance(w, h, params) {
    const ctx = this.ctx;
    const img = this.customAvatarImg;
    if (!img) return;

    const bpm = params.bpm || 120;
    const beatPulse = params.beatPulse || 0;
    const mouthOpen = params.mouthOpen || 0;

    // 1. Organic Singer Motion (Smooth, gentle rhythm — NO jerky robot bounce!)
    const swayRate = (bpm / 60) * Math.PI * 0.85;
    const bodySwayX = Math.sin(this.time * swayRate) * 8.0;
    // Gentle breathing & musical groove
    const breathScale = 1.0 + Math.sin(this.time * 1.6) * 0.012 + (beatPulse * 0.02);
    const smoothNodY = Math.sin(this.time * swayRate * 2) * 4.5 + (beatPulse * 3.5);
    const bodyTilt = (bodySwayX / 450);

    // 2. Stage Lighting & Background
    this.drawStageBackground(w, h, beatPulse);
    this.drawStageFloor(w, h, beatPulse);

    // 3. Ambient atmospheric glow behind the artist
    const imgW = img.width || 512;
    const imgH = img.height || 512;
    ctx.save();
    ctx.globalAlpha = 0.22 + beatPulse * 0.12;
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

    // 5. Main Photo Portrait: Cinematic Seamless Integration (NO HARD SQUARE BORDER!)
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
    const centerY = h * 0.45;

    ctx.save();
    ctx.translate(centerX + bodySwayX, centerY + smoothNodY);
    ctx.rotate(bodyTilt);
    ctx.scale(breathScale, breathScale);

    const drawX = -renderW / 2;
    const drawY = -renderH / 2;

    // Draw photo with soft vignette blend (blends seamlessly into dark stage, no paper-card look)
    ctx.save();
    ctx.drawImage(img, drawX, drawY, renderW, renderH);

    // Soft feathered vignette so the photo boundaries dissolve naturally into stage lighting
    const edgeGrad = ctx.createRadialGradient(0, 0, Math.min(renderW, renderH) * 0.36, 0, 0, Math.max(renderW, renderH) * 0.56);
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(0.75, 'rgba(10, 15, 30, 0.4)');
    edgeGrad.addColorStop(1, 'rgba(2, 6, 23, 0.95)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(drawX - 2, drawY - 2, renderW + 4, renderH + 4);
    ctx.restore();

    // 6. REALISTIC LIP-SYNC & JAW MOVEMENT (歌声に合わせて人物の口・顎が開閉)
    const mouthY = drawY + renderH * (this.mouthPosYRatio || 0.45);
    const mouthX = 0;

    this.drawPhotoSingingMouth(ctx, img, drawX, drawY, renderW, renderH, mouthX, mouthY, params);

    // 7. Subtle Natural Blink (around 32% from top)
    if (this.isBlinking) {
      const eyeY = drawY + renderH * ((this.mouthPosYRatio || 0.45) * 0.72);
      ctx.save();
      ctx.fillStyle = 'rgba(20, 20, 35, 0.6)';
      ctx.beginPath();
      ctx.ellipse(mouthX - renderW * 0.14, eyeY, renderW * 0.08, 3.5, 0, 0, Math.PI * 2);
      ctx.ellipse(mouthX + renderW * 0.14, eyeY, renderW * 0.08, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // 8. Floating Stage Particles
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 9. Stage Atmosphere & Vignette
    this.drawVignette(w, h, beatPulse);
  }

  // Draw organic singing mouth directly on user's photo with jaw descent and vowel visemes
  drawPhotoSingingMouth(ctx, img, drawX, drawY, renderW, renderH, mouthX, mouthY, params) {
    const open = Math.min(1.0, Math.max(0, params.mouthOpen || 0));
    if (open < 0.03) return; // Keep original natural photo when not singing

    const vowel = params.dominantVowel || 'A';
    const faceScale = renderW / 400;

    let mw = (26 + (params.mouthWidth || 0.5) * 22) * faceScale;
    let mh = (open * 22 + 4) * faceScale;

    if (vowel === 'A') {
      mh *= 1.35;
      mw *= 1.05;
    } else if (vowel === 'O' || vowel === 'U') {
      mh *= 1.15;
      mw *= 0.8;
    } else if (vowel === 'I' || vowel === 'E') {
      mh *= 0.85;
      mw *= 1.35;
    }

    ctx.save();
    ctx.translate(mouthX, mouthY);

    // A. JAW / CHIN DESCENT (下唇・顎を下に少し引き下げるモーション)
    const chinShift = open * 7 * faceScale;
    if (chinShift > 1.2 && img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-renderW * 0.35, mh * 0.25, renderW * 0.7, renderH * (1 - (this.mouthPosYRatio || 0.45)));
      ctx.clip();
      ctx.translate(0, chinShift);
      ctx.drawImage(img, drawX, drawY, renderW, renderH);
      ctx.restore();
    }

    // B. NATURAL ORAL CAVITY & LIP-SYNC (自然な口腔と唇)
    // Soft feathered outer shadow that blends with photo skin tone
    const shadowGrad = ctx.createRadialGradient(0, 0, mw * 0.3, 0, 0, mw * 0.85);
    shadowGrad.addColorStop(0, 'rgba(40, 10, 18, 0.85)');
    shadowGrad.addColorStop(0.7, 'rgba(90, 30, 45, 0.4)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.75, mh * 0.75 + 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep oral cavity (Dark inside of mouth)
    ctx.fillStyle = '#1c070c';
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.55, mh * 0.55 + 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper teeth (visible when open)
    if (open > 0.15) {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -mh * 0.28, mw * 0.42, mh * 0.18, 0, 0, Math.PI);
      ctx.fill();

      // Tooth separation line
      ctx.strokeStyle = 'rgba(150, 120, 130, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -mh * 0.38);
      ctx.lineTo(0, -mh * 0.12);
      ctx.stroke();
    }

    // Tongue (visible on wide open / vowels)
    if (open > 0.35) {
      const tongueGrad = ctx.createLinearGradient(0, mh * 0.1, 0, mh * 0.55);
      tongueGrad.addColorStop(0, '#f472b6');
      tongueGrad.addColorStop(1, '#db2777');
      ctx.fillStyle = tongueGrad;
      ctx.beginPath();
      ctx.ellipse(0, mh * 0.3, mw * 0.32, mh * 0.22, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // Natural Lip Contours (ソフトな唇のフチ)
    ctx.strokeStyle = 'rgba(219, 39, 119, 0.45)';
    ctx.lineWidth = 2.2 * faceScale;
    ctx.beginPath();
    ctx.ellipse(0, 0, mw * 0.56, mh * 0.56 + 1.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

window.CharacterRenderer = CharacterRenderer;
