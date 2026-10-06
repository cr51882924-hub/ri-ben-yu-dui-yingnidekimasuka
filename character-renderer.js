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

    // Custom user image avatar
    this.customAvatarImg = null;

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

    // 1. Stage Background
    this.drawStageBackground(w, h, beatPulse);

    // 2. Stage Floor & Reflections
    this.drawStageFloor(w, h, beatPulse);

    // 3. Stage Lasers
    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }

    // 4. Character Performance (Human / Anime Singer)
    this.drawCharacterPerformance(w, h, {
      beatPulse,
      groove,
      mouthOpen,
      mouthWidth,
      dominantVowel,
      bpm
    });

    // 5. Floating Particles
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 6. Vignette
    this.drawVignette(w, h, beatPulse);

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

  // Draw custom avatar face overlay
  drawCustomAvatarFace(char, params) {
    const ctx = this.ctx;
    const img = this.customAvatarImg;
    if (!img) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.clip();

    const sw = img.naturalWidth || img.width || 120;
    const sh = img.naturalHeight || img.height || 120;
    if (sw === sh) {
      ctx.drawImage(img, -60, -60, 120, 120);
    } else {
      let sx = 0, sy = 0, sSize = Math.min(sw, sh);
      if (sh > sw) {
        sy = Math.min(sh - sw, Math.max(0, (sh - sw) * 0.22));
      } else {
        sx = (sw - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sSize, sSize, -60, -60, 120, 120);
    }
    ctx.restore();

    // Glowing border around avatar face
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    this.drawExpressiveMouth(params);
  }
}

window.CharacterRenderer = CharacterRenderer;
