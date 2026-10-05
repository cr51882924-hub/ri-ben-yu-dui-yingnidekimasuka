/**
 * GrooveSync MV - High Expressive Character & Stage Renderer
 * Renders full body performance, instrument playing, dancing, beat sway, and viseme lip-sync
 */

class CharacterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Rendering parameters
    this.aspectRatio = '9:16';
    this.motionPreset = GROOVE_PRESETS.motions.guitar;
    this.characterPreset = GROOVE_PRESETS.characters['anime-rock'];
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
    // Generate floating stage particles
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: Math.random() * 2.5 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.2,
        alpha: Math.random() * 0.7 + 0.2,
        color: Math.random() > 0.5 ? '#8b5cf6' : '#06b6d4'
      });
    }

    // Generate stage laser lights
    this.lasers = [];
    for (let i = 0; i < 6; i++) {
      this.lasers.push({
        angle: (i / 5) * Math.PI - Math.PI / 2,
        speed: (Math.random() * 0.02 + 0.01) * (i % 2 === 0 ? 1 : -1),
        width: 14 + Math.random() * 10
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

  setAspectRatio(ratio) {
    this.aspectRatio = ratio;
    if (ratio === '16:9') {
      this.canvas.width = 1280;
      this.canvas.height = 720;
    } else {
      this.canvas.width = 720;
      this.canvas.height = 1280;
    }
    this.initStage();
  }

  // Main Render Loop
  render(audioEngine) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.time += 0.03;

    // Blink timer
    this.blinkTimer += 0.03;
    if (this.blinkTimer > 3.5) {
      this.isBlinking = true;
      if (this.blinkTimer > 3.65) {
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

    // Camera calculations
    this.updateCamera(beatPulse);

    ctx.save();
    // Apply camera transform
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraShake.zoom, this.cameraShake.zoom);
    ctx.translate(-w / 2 + this.cameraShake.x, -h / 2 + this.cameraShake.y);

    // 1. Draw Stage Background & Lighting
    this.drawStageBackground(w, h, beatPulse);

    // 2. Draw Stage Floor & Grid Reflections
    this.drawStageFloor(w, h, beatPulse);

    // 3. Draw Stage Lasers
    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }

    // 4. Draw Expressive Performer Body & Instruments
    this.drawCharacterPerformance(w, h, {
      beatPulse,
      groove,
      mouthOpen,
      mouthWidth,
      dominantVowel,
      bpm
    });

    // 5. Draw Floating Stage Particles
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 6. Draw Stage Foreground Glow & Vignette
    this.drawVignette(w, h, beatPulse);

    ctx.restore();
  }

  updateCamera(beatPulse) {
    if (this.cameraMode === 'dynamic') {
      // Zoom punch on kick drums
      const targetZoom = 1.0 + beatPulse * 0.08;
      this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.25;
      this.cameraShake.x = Math.sin(this.time * 2) * 5;
      this.cameraShake.y = Math.cos(this.time * 2.5) * 3 + beatPulse * 4;
    } else if (this.cameraMode === 'closeup') {
      const targetZoom = 1.25 + beatPulse * 0.04;
      this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.15;
      this.cameraShake.x = Math.sin(this.time * 1.2) * 3;
      this.cameraShake.y = (this.aspectRatio === '16:9' ? 60 : 120);
    } else if (this.cameraMode === 'orbit') {
      this.cameraShake.zoom = 1.04;
      this.cameraShake.x = Math.sin(this.time * 0.8) * 24;
      this.cameraShake.y = Math.cos(this.time * 1.1) * 8;
    } else if (this.cameraMode === 'handheld') {
      this.cameraShake.zoom = 1.02;
      this.cameraShake.x = (Math.sin(this.time * 3.5) + Math.cos(this.time * 1.8)) * 6;
      this.cameraShake.y = (Math.cos(this.time * 2.8) + Math.sin(this.time * 4.2)) * 5;
    }
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

    // Pulse back spotlight
    const spotX = w / 2;
    const spotY = h * 0.35;
    const spotRad = (w * 0.45) + beatPulse * 40;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 10, spotX, spotY, spotRad);
    spotGrad.addColorStop(0, 'rgba(139, 92, 246, ' + (0.28 + beatPulse * 0.2) + ')');
    spotGrad.addColorStop(0.6, 'rgba(236, 72, 153, ' + (0.12 + beatPulse * 0.1) + ')');
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotRad, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStageFloor(w, h, beatPulse) {
    const ctx = this.ctx;
    const floorY = h * 0.76;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
    floorGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, 0 + floorY, w, h - floorY);

    // Stage edge neon line
    ctx.strokeStyle = `rgba(139, 92, 246, ${0.4 + beatPulse * 0.5})`;
    ctx.lineWidth = 3 + beatPulse * 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();

    // Perspective stage lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = -w * 0.2; x <= w * 1.2; x += w * 0.15) {
      ctx.beginPath();
      ctx.moveTo(w / 2, floorY - 50);
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
      const targetX = originX + Math.sin(laser.angle + Math.sin(this.time)) * (w * 0.8);
      const targetY = h * 0.85;

      const laserColor = this.stageTheme.lasers[idx % this.stageTheme.lasers.length];
      const alpha = (0.2 + beatPulse * 0.4);

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
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(3, 7, 18, 0.75)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle flash on heavy beat
    if (beatPulse > 0.8) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse - 0.8) * 0.25})`;
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

    // Performer base center position
    const centerX = w / 2;
    const baseY = h * 0.72;

    // Body sway & bounce calculations
    const swayRate = (params.bpm / 60) * Math.PI * motion.swayFreq;
    const bodySwayX = Math.sin(this.time * swayRate) * motion.swayAmp * this.grooveStrength;
    const bodyBounceY = -Math.abs(Math.sin(this.time * swayRate * 2)) * 14 * this.grooveStrength - (params.beatPulse * 18);
    const bodyTilt = (bodySwayX / 200);

    // Head bob calculation
    const headbobRate = (params.bpm / 60) * Math.PI * 2;
    const headbobY = Math.sin(this.time * headbobRate) * motion.headbobAmp * this.headbobStrength;
    const headTilt = -bodyTilt * 1.3 + (Math.sin(this.time * swayRate * 0.5) * 0.08);

    // Scaling for stage
    const scale = this.aspectRatio === '16:9' ? 0.75 : 1.0;

    ctx.save();
    ctx.translate(centerX + bodySwayX, baseY + bodyBounceY);
    ctx.scale(scale, scale);
    ctx.rotate(bodyTilt);

    // Draw Performer Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 30 - bodyBounceY * 0.6, 120, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // 1. Lower Body / Legs & Shoes
    this.drawLegs(motion, bodySwayX);

    // 2. Torso & Clothes
    this.drawTorso(char, motion);

    // 3. Instrument (Behind right arm, in front of torso)
    if (motion.instrument === 'electric_guitar' || motion.instrument === 'acoustic_guitar') {
      this.drawGuitar(motion.instrument, char, params);
    } else if (motion.instrument === 'keyboard') {
      this.drawKeyboard(params);
    } else if (motion.instrument === 'dj_deck') {
      this.drawDJConsole(params);
    }

    // 4. Arms & Hands
    this.drawArmsAndHands(char, motion, params);

    // 5. Head, Face & Expressive Lip-sync
    ctx.save();
    ctx.translate(0, -220 + headbobY);
    ctx.rotate(headTilt);

    this.drawHeadAndFace(char, params);

    ctx.restore();

    ctx.restore();
  }

  // Draw Legs
  drawLegs(motion, bodySwayX) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a'; // Dark pants / jeans

    const legSpread = motion.id === 'dance' ? 42 : 30;
    const stepOffset = motion.id === 'dance' ? Math.sin(this.time * 5) * 12 : 0;

    // Left leg
    ctx.beginPath();
    ctx.roundRect(-legSpread - 10, -50, 24, 75 + stepOffset, 6);
    ctx.fill();
    // Left shoe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-legSpread - 14, 20 + stepOffset, 32, 14, 4);
    ctx.fill();

    // Right leg
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(legSpread - 14, -50, 24, 75 - stepOffset, 6);
    ctx.fill();
    // Right shoe
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(legSpread - 18, 20 - stepOffset, 32, 14, 4);
    ctx.fill();
  }

  // Draw Torso & Stage Outfit
  drawTorso(char, motion) {
    const ctx = this.ctx;

    // Torso base shape
    ctx.fillStyle = char.outfitColor || '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(-52, -180);
    ctx.lineTo(52, -180);
    ctx.lineTo(40, -45);
    ctx.lineTo(-40, -45);
    ctx.closePath();
    ctx.fill();

    // Outfit highlights / collar / zipper
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -170);
    ctx.lineTo(0, -50);
    ctx.stroke();

    // Inner shirt / neck
    ctx.fillStyle = char.skinTone;
    ctx.beginPath();
    ctx.moveTo(-16, -182);
    ctx.lineTo(16, -182);
    ctx.lineTo(12, -165);
    ctx.lineTo(-12, -165);
    ctx.closePath();
    ctx.fill();

    // Guitar Strap
    if (motion.instrument.includes('guitar')) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(-45, -175);
      ctx.lineTo(40, -90);
      ctx.stroke();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Draw Guitar
  drawGuitar(type, char, params) {
    const ctx = this.ctx;
    ctx.save();

    // Guitar position over body
    ctx.translate(5, -100);
    ctx.rotate(-0.35 + Math.sin(this.time * 3) * 0.05);

    const isElectric = (type === 'electric_guitar');
    const bodyColor = isElectric ? (char.guitarColor || '#e11d48') : '#b45309';

    // Guitar Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    if (isElectric) {
      // Stratocaster / Double cutaway shape
      ctx.moveTo(-70, -25);
      ctx.bezierCurveTo(-90, -45, -80, 50, -40, 65);
      ctx.bezierCurveTo(-10, 75, 40, 65, 75, 40);
      ctx.bezierCurveTo(90, 15, 80, -35, 50, -30);
      ctx.bezierCurveTo(30, -20, 10, -35, 0, -35);
      ctx.bezierCurveTo(-20, -35, -50, -10, -70, -25);
    } else {
      // Acoustic rounded body
      ctx.ellipse(0, 10, 65, 50, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pickguard
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-10, 5, 26, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Soundhole / Pickups
    if (!isElectric) {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(-8, 5, 15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-24, -8, 32, 6);
      ctx.fillRect(-24, 8, 32, 6);
      ctx.fillRect(-24, 24, 32, 6);
    }

    // Fretboard & Neck (reaching left towards fret hand)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-170, -12, 150, 14);

    // Frets
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let f = -165; f < -25; f += 14) {
      ctx.beginPath();
      ctx.moveTo(f, -12);
      ctx.lineTo(f, 2);
      ctx.stroke();
    }

    // Headstock
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-195, -15, 25, 20);

    // Strings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;
    for (let s = -8; s <= 0; s += 2.5) {
      ctx.beginPath();
      ctx.moveTo(-190, s);
      ctx.lineTo(40, s);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Keyboard
  drawKeyboard(params) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, -90);

    // Keyboard stand
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-70, 90);
    ctx.lineTo(0, 0);
    ctx.lineTo(70, 90);
    ctx.stroke();

    // Keyboard body
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-110, -15, 220, 30, 6);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White Keys
    ctx.fillStyle = '#ffffff';
    for (let k = -95; k < 95; k += 11) {
      ctx.fillRect(k, -10, 9, 22);
    }
    // Black Keys
    ctx.fillStyle = '#000000';
    for (let k = -90; k < 90; k += 11) {
      if (Math.abs(k) % 33 !== 0) {
        ctx.fillRect(k, -10, 6, 13);
      }
    }

    ctx.restore();
  }

  // Draw DJ Console
  drawDJConsole(params) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, -85);

    // Stand
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-120, -10, 240, 35, 6);
    ctx.fill();

    // Left Turntable Vinyl
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.arc(-65, 5, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Right Turntable Vinyl
    ctx.beginPath();
    ctx.arc(65, 5, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ec4899';
    ctx.stroke();

    // Center Mixer LEDs
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-10, -5, 4, 18);
    ctx.fillRect(6, -5, 4, 18);

    ctx.restore();
  }

  // Draw Arms and Hands (Action-synchronized)
  drawArmsAndHands(char, motion, params) {
    const ctx = this.ctx;
    const skin = char.skinTone;
    const outfit = char.outfitColor;

    ctx.fillStyle = outfit;
    ctx.strokeStyle = outfit;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (motion.instrument.includes('guitar')) {
      // LEFT ARM: Holds guitar neck & slides on frets
      const fretSlide = Math.sin(this.time * 2.5) * 20;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(-50, -170); // Shoulder
      ctx.quadraticCurveTo(-110, -130, -120 + fretSlide, -120); // Elbow to Fret hand
      ctx.stroke();

      // Left hand on neck
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-120 + fretSlide, -120, 11, 0, Math.PI * 2);
      ctx.fill();

      // RIGHT ARM: Strumming action (moves rhythmically with beat & song)
      const strumRate = (params.bpm / 60) * Math.PI * motion.strumSpeed;
      const strumOffset = Math.sin(this.time * strumRate) * 16;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(50, -170); // Shoulder
      ctx.quadraticCurveTo(85, -110, 10, -85 + strumOffset); // Strum hand
      ctx.stroke();

      // Right hand holding pick
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(10, -85 + strumOffset, 12, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'keyboard') {
      // Both arms playing piano keys
      const leftKey = Math.sin(this.time * 6) * 10;
      const rightKey = Math.cos(this.time * 6.5) * 10;

      ctx.lineWidth = 18;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-70, -120, -50 + leftKey, -85);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-50 + leftKey, -85, 10, 0, Math.PI * 2);
      ctx.fill();

      // Right arm
      ctx.fillStyle = outfit;
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(70, -120, 50 + rightKey, -85);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(50 + rightKey, -85, 10, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.id === 'dance') {
      // Expressive dance poses
      const danceL = Math.sin(this.time * 4) * 35;
      const danceR = Math.cos(this.time * 4) * 35;

      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-50, -170);
      ctx.quadraticCurveTo(-85, -190 + danceL, -95, -150 + danceL);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-95, -150 + danceL, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = outfit;
      ctx.beginPath();
      ctx.moveTo(50, -170);
      ctx.quadraticCurveTo(85, -190 - danceR, 95, -150 - danceR);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(95, -150 - danceR, 10, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'mic_hand' || motion.id === 'sway') {
      // One hand holding microphone to mouth, one hand gesturing
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-75, -160, -15, -195); // Holding mic near chin
      ctx.stroke();

      // Hand & Mic
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(-15, -195, 11, 0, Math.PI * 2);
      ctx.fill();

      // Metallic Stage Mic
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-18, -215, 10, 22);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(-13, -218, 9, 0, Math.PI * 2);
      ctx.fill();

      // Free hand swaying
      const gesture = Math.sin(this.time * 2) * 20;
      ctx.fillStyle = outfit;
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(85, -130 + gesture, 70, -90 + gesture);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(70, -90 + gesture, 10, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'mic_stand' || motion.id === 'headbang') {
      // Both hands gripping center mic stand
      ctx.lineWidth = 18;
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
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, -220);
      ctx.lineTo(0, 30);
      ctx.stroke();

      // Mic Head
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, -222, 10, 0, Math.PI * 2);
      ctx.fill();

    } else if (motion.instrument === 'dj_deck') {
      // One hand on headphone, one hand on turntable
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(-48, -170);
      ctx.quadraticCurveTo(-75, -200, -38, -225); // Headphone hand
      ctx.stroke();

      // Turntable scratch hand
      const scratch = Math.sin(this.time * 8) * 15;
      ctx.beginPath();
      ctx.moveTo(48, -170);
      ctx.quadraticCurveTo(75, -120, 65 + scratch, -80);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(65 + scratch, -80, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // Head, Face & Expressive Lip-sync Vowels
  // ==========================================
  drawHeadAndFace(char, params) {
    const ctx = this.ctx;
    const skin = char.skinTone;
    const hair = char.hairColor;

    // If user uploaded a custom photo/avatar, draw it with dynamic lipsync over it!
    if (this.customAvatarImg) {
      this.drawCustomAvatarFace(char, params);
      return;
    }

    // 1. Back hair
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();

    // Twin tails / side hair swaying with motion
    const hairSway = Math.sin(this.time * 4) * 14;
    ctx.beginPath();
    ctx.ellipse(-55 + hairSway * 0.5, 30, 16, 60, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(55 + hairSway * 0.5, 30, 16, 60, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Face shape
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-36, -10);
    ctx.bezierCurveTo(-38, 25, -25, 45, 0, 52); // Chin
    ctx.bezierCurveTo(25, 45, 38, 25, 36, -10);
    ctx.bezierCurveTo(34, -40, -34, -40, -36, -10);
    ctx.closePath();
    ctx.fill();

    // Blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
    ctx.beginPath();
    ctx.ellipse(-22, 14, 8, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(22, 14, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Eyes & Eyebrows (Expressive blinking & emotional singing)
    this.drawEyesAndBrows(char, params);

    // 4. Nose
    ctx.fillStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 12, 2, 0, Math.PI * 2);
    ctx.fill();

    // 5. High-Precision Expressive Lip-Sync Mouth Mesh (Visemes)
    this.drawExpressiveMouth(params);

    // 6. Front Bangs / Hair Style
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.moveTo(-42, -22);
    ctx.quadraticCurveTo(-20, -5, -15, 6);
    ctx.quadraticCurveTo(-5, -10, 0, 8);
    ctx.quadraticCurveTo(15, -8, 25, 5);
    ctx.quadraticCurveTo(35, -10, 42, -22);
    ctx.quadraticCurveTo(0, -55, -42, -22);
    ctx.closePath();
    ctx.fill();
  }

  drawEyesAndBrows(char, params) {
    const ctx = this.ctx;
    const eyeColor = char.eyeColor || '#f43f5e';
    const isSingingHigh = params.mouthOpen > 0.6;

    // Eyebrows arch when singing emotionally
    const browLift = isSingingHigh ? -5 * this.expressionLevel : 0;
    ctx.strokeStyle = char.hairColor;
    ctx.lineWidth = 2.5;

    // Left eyebrow
    ctx.beginPath();
    ctx.moveTo(-28, -12 + browLift);
    ctx.quadraticCurveTo(-18, -16 + browLift, -8, -12 + browLift);
    ctx.stroke();

    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(8, -12 + browLift);
    ctx.quadraticCurveTo(18, -16 + browLift, 28, -12 + browLift);
    ctx.stroke();

    // Eyes
    if (this.isBlinking) {
      // Closed / Blinking line
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-26, 0);
      ctx.lineTo(-10, 0);
      ctx.moveTo(10, 0);
      ctx.lineTo(26, 0);
      ctx.stroke();
    } else {
      // Open / Sparkling Eyes
      [-18, 18].forEach(x => {
        // Sclera (White)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(x, 0, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.ellipse(x, 0, 6.5, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(x, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eye catch highlight sparkle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - 2.5, -3, 2.5, 0, Math.PI * 2);
        ctx.arc(x + 2, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyelash line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, -2, 9, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      });
    }
  }

  // Draw Mouth with True Viseme Shapes (A, I, U, E, O)
  drawExpressiveMouth(params) {
    const ctx = this.ctx;
    const mouthY = 32;
    const open = params.mouthOpen; // 0 to 1
    const vowel = params.dominantVowel;

    ctx.save();
    ctx.translate(0, mouthY);

    if (open < 0.12) {
      // Closed / Resting Mouth (Subtle cute smile line)
      ctx.strokeStyle = '#e11d48';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(0, 2, 7, 0);
      ctx.stroke();
    } else {
      // Open Singing Mouth - Shape depends on Viseme vowel!
      let mw = 12; // mouth width
      let mh = 14; // mouth height

      if (vowel === 'A') {
        // Wide open, tall & wide
        mw = 14 + open * 6;
        mh = 12 + open * 16;
      } else if (vowel === 'I') {
        // Stretched smile, wide but thin
        mw = 18 + open * 6;
        mh = 6 + open * 8;
      } else if (vowel === 'U') {
        // Pursed round small lips
        mw = 8 + open * 4;
        mh = 8 + open * 10;
      } else if (vowel === 'E') {
        // Medium open smile
        mw = 16 + open * 4;
        mh = 9 + open * 10;
      } else if (vowel === 'O') {
        // Tall oval, narrow width
        mw = 10 + open * 4;
        mh = 14 + open * 18;
      }

      // Outer mouth cavity (dark reddish oral interior)
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.ellipse(0, mh * 0.4, mw, mh * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper white teeth line
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-mw * 0.75, 0, mw * 1.5, Math.min(mh * 0.28, 5), 2);
      ctx.fill();

      // Tongue (pink arch at the bottom of mouth)
      if (mh > 10) {
        ctx.fillStyle = '#fb7185';
        ctx.beginPath();
        ctx.ellipse(0, mh * 0.65, mw * 0.7, mh * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lip outline
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
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

    // Draw circular framed avatar with glowing border
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, -55, -55, 110, 110);
    ctx.restore();

    // Glowing border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Overlay expressive singing mouth mesh on the avatar!
    this.drawExpressiveMouth(params);
  }
}

window.CharacterRenderer = CharacterRenderer;
