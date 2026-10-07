/**
 * GrooveSync MV - Presets & Data Configuration
 */

const MOTION_PRESETS = {
  guitar: {
    id: 'guitar',
    name: 'エレキギター演奏',
    desc: 'リフを弾きながら熱唱',
    icon: '🎸',
    instrument: 'electric_guitar',
    swayFreq: 1.0,
    swayAmp: 18,
    headbobAmp: 15,
    strumSpeed: 2.0,
    cameraBias: 'dynamic',
    promptSnippet: 'playing an electric guitar vigorously, energetic rock guitar performance on stage, singing passionately into the camera, dynamic guitar riffs, body grooving to the beat'
  },
  acoustic: {
    id: 'acoustic',
    name: 'アコギ弾き語り',
    desc: 'コードをかき鳴らし体でリズム',
    icon: '🪕',
    instrument: 'acoustic_guitar',
    swayFreq: 0.8,
    swayAmp: 14,
    headbobAmp: 10,
    strumSpeed: 1.2,
    cameraBias: 'closeup',
    promptSnippet: 'acoustic guitar singer songwriter, fingerpicking and strumming acoustic guitar, gentle rhythmic swaying, warm intimate singing, emotional facial expressions'
  },
  keyboard: {
    id: 'keyboard',
    name: 'キーボード/ピアノ',
    desc: '鍵盤を演奏しながら歌唱',
    icon: '🎹',
    instrument: 'keyboard',
    swayFreq: 0.9,
    swayAmp: 12,
    headbobAmp: 12,
    strumSpeed: 1.5,
    cameraBias: 'closeup',
    promptSnippet: 'performing at an electric keyboard synthesizer, hands playing keys smoothly, expressive head bobbing to rhythm, singing heartfelt vocals'
  },
  dance: {
    id: 'dance',
    name: 'ダンス＆ステップ',
    desc: 'リズムに合わせた軽快な振付',
    icon: '💃',
    instrument: 'none',
    swayFreq: 1.3,
    swayAmp: 28,
    headbobAmp: 20,
    strumSpeed: 0,
    cameraBias: 'orbit',
    promptSnippet: 'dancing with energetic pop choreography, synchronized beat bounces, arm gestures, singing while doing stylish dance steps, lively stage performance'
  },
  sway: {
    id: 'sway',
    name: 'チル・ボディスウェイ',
    desc: '曲のグルーヴに体を揺らす',
    icon: '🌊',
    instrument: 'mic_hand',
    swayFreq: 0.6,
    swayAmp: 22,
    headbobAmp: 14,
    strumSpeed: 0,
    cameraBias: 'handheld',
    promptSnippet: 'relaxed rhythmic body swaying, lo-fi chill hip-hop groove, holding vintage microphone, gentle head nodding, subtle soulful lip sync'
  },
  headbang: {
    id: 'headbang',
    name: 'ロック・熱唱',
    desc: 'マイクを握りしめ激しく歌唱',
    icon: '⚡',
    instrument: 'mic_stand',
    swayFreq: 1.4,
    swayAmp: 24,
    headbobAmp: 30,
    strumSpeed: 0,
    cameraBias: 'dynamic',
    promptSnippet: 'intense rock singing, gripping microphone tightly with two hands, passionate headbanging, emotional belting, screaming facial expressions, intense stage presence'
  },
  dj: {
    id: 'dj',
    name: 'DJ & ビートバウンス',
    desc: 'スクラッチとリズムノリ',
    icon: '🎧',
    instrument: 'dj_deck',
    swayFreq: 1.2,
    swayAmp: 20,
    headbobAmp: 22,
    strumSpeed: 1.8,
    cameraBias: 'dynamic',
    promptSnippet: 'DJ bouncing behind turntables, one hand on headphones and one hand scratching, rhythmic head nodding, pumping up the crowd, lip-syncing hype vocals'
  }
};

const CHARACTER_PRESETS = {
  'anime-rock': {
    id: 'anime-rock',
    name: 'アスカ (ロックシンガー)',
    hairColor: '#e11d48',
    eyeColor: '#f43f5e',
    skinTone: '#fde8df',
    outfitColor: '#1e1b4b',
    guitarColor: '#e11d48',
    styleName: 'Anime Rock Vocalist',
    prompt: 'Japanese anime female rock lead singer, crimson red twin tails hair, sharp vivid eyes, black leather biker jacket, stylish stage accessories, anime illustration style'
  },
  'cyber-idol': {
    id: 'cyber-idol',
    name: 'ルナ (サイバーポップ)',
    hairColor: '#06b6d4',
    eyeColor: '#38bdf8',
    skinTone: '#fef2f2',
    outfitColor: '#4f46e5',
    guitarColor: '#06b6d4',
    styleName: 'Cyberpunk VTuber Idol',
    prompt: 'futuristic cyberpunk female idol singer, cyan and violet luminous hair with glowing cyber hairclips, hologram jacket, glowing stage mic, vibrant digital aesthetic'
  },
  'indie-boy': {
    id: 'indie-boy',
    name: 'レン (シティポップ/弾き語り)',
    hairColor: '#334155',
    eyeColor: '#059669',
    skinTone: '#fcedde',
    outfitColor: '#0f766e',
    guitarColor: '#b45309',
    styleName: 'Indie Singer Songwriter',
    prompt: 'cool Japanese male indie musician, messy dark hair, thoughtful handsome face, oversized casual knit sweater, vintage acoustic guitar, warm natural cinematic lighting'
  },
  'lofi-girl': {
    id: 'lofi-girl',
    name: 'ミオ (チル/Lo-Fi)',
    hairColor: '#d97706',
    eyeColor: '#ec4899',
    skinTone: '#fff1f2',
    outfitColor: '#831843',
    guitarColor: '#f59e0b',
    styleName: 'Lo-Fi Chill Hop Singer',
    prompt: 'aesthetic lo-fi female vocalist wearing large studio headphones, warm brown bob haircut, oversized pastel hoodie, nostalgic warm tones, cozy studio atmosphere'
  }
};

const DEMO_SONGS = {
  jpop: {
    id: 'jpop',
    title: 'Shining Beat',
    genre: 'J-POP / アイドル',
    bpm: 132,
    desc: 'BPM 132 • 明るいメロディとギターカッティング',
    recommendedMotion: 'guitar',
    lyrics: [
      { time: 0, text: '輝くライトが ステージ照らし出す' },
      { time: 4, text: '胸の鼓動が リズムと重なって' },
      { time: 8, text: '世界中へ響け このメロディ！' },
      { time: 14, text: '君の手を取って 走り出そう' },
      { time: 20, text: 'Shining Beat! 奇跡を起こす瞬間へ' },
      { time: 26, text: 'どこまでも高く 歌い続けるよ' }
    ]
  },
  lofi: {
    id: 'lofi',
    title: 'Midnight Groove',
    genre: 'チル / ヒップホップ',
    bpm: 88,
    desc: 'BPM 88 • 首を揺らす重厚なビートとローズピアノ',
    recommendedMotion: 'sway',
    lyrics: [
      { time: 0, text: '深夜2時の街街 灯りが滲む' },
      { time: 6, text: '緩やかなビートに 体を預けて' },
      { time: 12, text: '誰も知らない秘密のグルーヴ' },
      { time: 18, text: '漂うように 揺れるこの夜' },
      { time: 24, text: '言葉はいらない そのままでいい' }
    ]
  },
  rock: {
    id: 'rock',
    title: 'Overdrive Ignition',
    genre: 'エモーショナル・ロック',
    bpm: 148,
    desc: 'BPM 148 • 激しいギターリフと疾走ドラム',
    recommendedMotion: 'guitar',
    lyrics: [
      { time: 0, text: '歪んだコードが 鼓膜を突き破る' },
      { time: 5, text: '限界なんて 壊して突き進め' },
      { time: 10, text: '魂の叫びを ここで解き放て！' },
      { time: 16, text: '燃え盛る情熱 Overdrive!' },
      { time: 22, text: '立ち止まる暇なんてない' },
      { time: 27, text: '響け 燃え尽きるまで！' }
    ]
  },
  cyber: {
    id: 'cyber',
    title: 'Neon Skyline',
    genre: 'フューチャー・EDM',
    bpm: 128,
    desc: 'BPM 128 • ドロップに合わせてバウンス',
    recommendedMotion: 'dance',
    lyrics: [
      { time: 0, text: 'Neon lights reflecting in the sky' },
      { time: 6, text: 'Digital dream waking up tonight' },
      { time: 12, text: 'Feel the bass drop down to the ground!' },
      { time: 18, text: 'Bounce with the frequency, higher now!' },
      { time: 24, text: 'We are limitless in cyber horizon' }
    ]
  }
};

const STAGE_THEMES = {
  livehouse: {
    id: 'livehouse',
    name: 'ライブハウス',
    bgGradient: ['#090514', '#170b2c', '#030108'],
    lasers: ['#ec4899', '#8b5cf6', '#06b6d4'],
    smokeDensity: 0.6,
    floorReflection: true
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'サイバーネオン都市',
    bgGradient: ['#020b14', '#082f49', '#030712'],
    lasers: ['#06b6d4', '#10b981', '#3b82f6'],
    smokeDensity: 0.4,
    floorReflection: true
  },
  sunset: {
    id: 'sunset',
    name: '夕暮れルーフトップ',
    bgGradient: ['#1c102a', '#701a75', '#f97316'],
    lasers: ['#f59e0b', '#fb923c', '#ec4899'],
    smokeDensity: 0.2,
    floorReflection: false
  },
  studio: {
    id: 'studio',
    name: 'スタジオ・ミニマル',
    bgGradient: ['#111827', '#1f2937', '#030712'],
    lasers: ['#64748b', '#94a3b8', '#cbd5e1'],
    smokeDensity: 0.1,
    floorReflection: false
  }
};

const OFFICIAL_SAMPLE = {
  id: 'official-vocalist',
  name: 'ミレイ (実力派女性シンガー)',
  imagePath: 'sample-vocalist.jpg',
  mouthPosYRatio: 0.44,
  song: 'jpop',
  title: 'Shining Beat',
  desc: 'クリアな歌声と母音連動の本格リップシンクMVサンプル'
};

window.GROOVE_PRESETS = {
  sample: OFFICIAL_SAMPLE,
  motions: MOTION_PRESETS,
  characters: CHARACTER_PRESETS,
  songs: DEMO_SONGS,
  stages: STAGE_THEMES
};

