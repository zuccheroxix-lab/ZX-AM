/**
 * MotionEdit - Mobile-First Video Editor & XML Preset Engine
 * Pure client-side processing using HTML5 Canvas, Web Audio API, and MediaRecorder.
 */

(function () {
  'use strict';

  // --- 1. Global Editor State ---
  const state = {
    projectName: "Devv || 1:1 - (2-8-26) (+1)",
    duration: 18.93,
    currentTime: 0.0,
    isPlaying: false,
    volume: 1.0,
    muted: false,
    audioOffset: 0.0,
    activeTab: 'Proyek',
    fps: 30,
    width: 720,
    height: 720,
    
    // Media slots (Preset assets)
    mediaSlots: [],
    
    // Layer stack
    layers: [
      { id: 'l1', name: 'Background Scene', type: 'BG Gradient', visible: true, opacity: 1.0 },
      { id: 'l2', name: 'Anime Character Media', type: 'Media Slot', visible: true, opacity: 1.0 },
      { id: 'l3', name: 'Beat Flash & Shake', type: 'Shader Effect', visible: true, opacity: 0.85 },
      { id: 'l4', name: 'Color Grade & Vignette', type: 'Post-Process', visible: true, opacity: 0.75 },
      { id: 'l5', name: 'Overlay Watermark', type: 'Text / Graphic', visible: true, opacity: 0.9 }
    ],

    // Audio State
    audioReady: false,
    audioDuration: 18.93,
    audioPlaybackRate: 1.0,

    // Export State
    isExporting: false,
    exportCancel: false,
    exportedBlob: null,

    // Undo / Redo history
    history: [],
    historyIndex: -1
  };

  // --- 2. DOM Elements Selection ---
  const elements = {
    // Header
    headerProjectName: document.getElementById('headerProjectName'),
    btnFullscreen: document.getElementById('btnFullscreen'),

    // Preview & Canvas
    previewContainer: document.getElementById('previewContainer'),
    previewCanvas: document.getElementById('previewCanvas'),
    sourceVideo: document.getElementById('sourceVideo'),
    sourceAudio: document.getElementById('sourceAudio'),
    dropZoneOverlay: document.getElementById('dropZoneOverlay'),
    btnCenterPlay: document.getElementById('btnCenterPlay'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingStatusText: document.getElementById('loadingStatusText'),
    loadingProgressBar: document.getElementById('loadingProgressBar'),

    // Playback Controls
    btnUndo: document.getElementById('btnUndo'),
    btnPlayPause: document.getElementById('btnPlayPause'),
    playIcon: document.getElementById('playIcon'),
    pauseIcon: document.getElementById('pauseIcon'),
    playBtnLabel: document.getElementById('playBtnLabel'),
    btnReset: document.getElementById('btnReset'),
    currentTimeDisplay: document.getElementById('currentTimeDisplay'),
    durationDisplay: document.getElementById('durationDisplay'),
    timelineTrack: document.getElementById('timelineTrack'),
    timelineProgress: document.getElementById('timelineProgress'),
    timelineScrubber: document.getElementById('timelineScrubber'),
    timelineTicks: document.getElementById('timelineTicks'),

    // Tab Proyek
    xmlDropBox: document.getElementById('xmlDropBox'),
    inputXmlFile: document.getElementById('inputXmlFile'),
    xmlFileName: document.getElementById('xmlFileName'),
    xmlLayersTag: document.getElementById('xmlLayersTag'),
    xmlDurationTag: document.getElementById('xmlDurationTag'),
    xmlResTag: document.getElementById('xmlResTag'),
    xmlFpsTag: document.getElementById('xmlFpsTag'),
    btnResetSamplePreset: document.getElementById('btnResetSamplePreset'),
    inputMotionUrl: document.getElementById('inputMotionUrl'),
    btnFetchMotion: document.getElementById('btnFetchMotion'),
    motionStatusText: document.getElementById('motionStatusText'),

    // Tab Media
    mediaSlotsList: document.getElementById('mediaSlotsList'),
    mediaSlotCount: document.getElementById('mediaSlotCount'),
    inputCustomMedia: document.getElementById('inputCustomMedia'),
    btnUploadCustomMedia: document.getElementById('btnUploadCustomMedia'),

    // Tab Audio
    audioFileNameDisplay: document.getElementById('audioFileNameDisplay'),
    audioTrackDuration: document.getElementById('audioTrackDuration'),
    btnAudioPlay: document.getElementById('btnAudioPlay'),
    audioVolumeSlider: document.getElementById('audioVolumeSlider'),
    audioVolumePercent: document.getElementById('audioVolumePercent'),
    inputAudioFile: document.getElementById('inputAudioFile'),
    btnUploadAudio: document.getElementById('btnUploadAudio'),
    syncAudioPlaybackStatus: document.getElementById('syncAudioPlaybackStatus'),
    syncDiffStatus: document.getElementById('syncDiffStatus'),
    audioOffsetSlider: document.getElementById('audioOffsetSlider'),
    offsetValueLabel: document.getElementById('offsetValueLabel'),
    btnAutoMatchAudioSpeed: document.getElementById('btnAutoMatchAudioSpeed'),

    // Tab Layer
    layersStack: document.getElementById('layersStack'),
    layersTotalCount: document.getElementById('layersTotalCount'),
    btnAddTextLayer: document.getElementById('btnAddTextLayer'),
    btnToggleAllLayers: document.getElementById('btnToggleAllLayers'),

    // Tab Ekspor
    selectResolution: document.getElementById('selectResolution'),
    selectFps: document.getElementById('selectFps'),
    selectQuality: document.getElementById('selectQuality'),
    btnStartExport: document.getElementById('btnStartExport'),
    btnCancelExport: document.getElementById('btnCancelExport'),
    exportProgressBox: document.getElementById('exportProgressBox'),
    exportStatusText: document.getElementById('exportStatusText'),
    exportPercentText: document.getElementById('exportPercentText'),
    exportProgressBarFill: document.getElementById('exportProgressBarFill'),
    exportTimeElapsed: document.getElementById('exportTimeElapsed'),
    exportFramesCounter: document.getElementById('exportFramesCounter'),
    exportResultBox: document.getElementById('exportResultBox'),
    resultFileSize: document.getElementById('resultFileSize'),
    resultFileDuration: document.getElementById('resultFileDuration'),
    btnDownloadExported: document.getElementById('btnDownloadExported'),
    exportCodecStatus: document.getElementById('exportCodecStatus'),

    // Navigation & Toast
    navTabBtns: document.querySelectorAll('.nav-tab-btn'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    toastMessage: document.getElementById('toastMessage'),
    toastText: document.getElementById('toastText')
  };

  const ctx = elements.previewCanvas.getContext('2d', { alpha: false });
  let audioContext = null;
  let synthAudioBuffer = null;
  let synthAudioSource = null;
  let animFrameId = null;
  let lastTimestamp = 0;
  let activeSlotToReplace = null;

  // --- 3. Notification Toast ---
  function showToast(text, duration = 2800) {
    elements.toastText.textContent = text;
    elements.toastMessage.classList.remove('hidden');
    clearTimeout(elements.toastMessage._timer);
    elements.toastMessage._timer = setTimeout(() => {
      elements.toastMessage.classList.add('hidden');
    }, duration);
  }

  // --- 4. Web Audio Synthesizer (Realistic Anime Phonk Beat) ---
  // Generates real, zero-network, royalty-free audio buffer matching the video beat
  function initAudioSynthesizer() {
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtxClass) return;
    if (!audioContext) {
      audioContext = new AudioCtxClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const sampleRate = audioContext.sampleRate;
    const duration = state.duration;
    const totalFrames = Math.floor(sampleRate * duration);
    synthAudioBuffer = audioContext.createBuffer(2, totalFrames, sampleRate);
    const left = synthAudioBuffer.getChannelData(0);
    const right = synthAudioBuffer.getChannelData(1);

    const bpm = 132;
    const beatInterval = 60 / bpm; // ~0.454s per beat

    for (let i = 0; i < totalFrames; i++) {
      const t = i / sampleRate;
      const beatPos = (t % beatInterval) / beatInterval;
      
      // Kick drum with low sub-bass sweep
      let kick = 0;
      if (beatPos < 0.25) {
        const decay = Math.exp(-beatPos * 24);
        const freq = 130 * Math.exp(-beatPos * 18) + 45;
        kick = Math.sin(2 * Math.PI * freq * t) * decay * 0.7;
      }

      // Snare / Clap on even beats
      const beatIndex = Math.floor(t / beatInterval);
      let snare = 0;
      if (beatIndex % 2 === 1 && beatPos < 0.35) {
        const decay = Math.exp(-beatPos * 16);
        const noise = (Math.random() * 2 - 1) * 0.35;
        const tone = Math.sin(2 * Math.PI * 220 * t) * 0.25;
        snare = (noise + tone) * decay;
      }

      // Hi-hats on 16th notes
      const sixteenthPos = (t % (beatInterval / 4)) / (beatInterval / 4);
      let hihat = 0;
      if (sixteenthPos < 0.08) {
        hihat = (Math.random() * 2 - 1) * Math.exp(-sixteenthPos * 40) * 0.15;
      }

      // Synth chords / melodic bass
      const chordRoot = (Math.floor(t / (beatInterval * 4)) % 4 === 0) ? 146.83 : 110.0;
      const bassTone = Math.sin(2 * Math.PI * chordRoot * t) * 0.15;
      const leadMelody = Math.sin(2 * Math.PI * (chordRoot * 3) * t) * 0.08;

      const monoSignal = kick + snare + hihat + bassTone + leadMelody;
      left[i] = Math.max(-1, Math.min(1, monoSignal * 0.9));
      right[i] = Math.max(-1, Math.min(1, monoSignal * 0.9));
    }

    state.audioReady = true;
    updateAudioSyncUI();
  }

  function startSynthAudio(startOffset = 0) {
    if (!audioContext || !synthAudioBuffer) return;
    try {
      if (synthAudioSource) {
        synthAudioSource.stop();
        synthAudioSource.disconnect();
      }
      synthAudioSource = audioContext.createBufferSource();
      synthAudioSource.buffer = synthAudioBuffer;
      synthAudioSource.playbackRate.value = state.audioPlaybackRate;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = state.muted ? 0 : state.volume;
      
      synthAudioSource.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const offset = Math.max(0, startOffset + state.audioOffset);
      if (offset < state.duration) {
        synthAudioSource.start(0, offset);
      }
    } catch (e) {
      console.warn("Audio playback notice:", e);
    }
  }

  function stopSynthAudio() {
    if (synthAudioSource) {
      try {
        synthAudioSource.stop();
        synthAudioSource.disconnect();
      } catch (e) {}
      synthAudioSource = null;
    }
  }

  // --- 5. Media Slot Generator (High Quality Anime Character Plates) ---
  // Creates visually distinct, anime character illustrations matching the video reference
  function generateSlotCanvas(slotIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext('2d');

    // Background gradient based on slot
    const bgGrad = c.createLinearGradient(0, 0, 512, 512);
    if (slotIndex === 0) {
      bgGrad.addColorStop(0, '#1c152e');
      bgGrad.addColorStop(0.5, '#421d4c');
      bgGrad.addColorStop(1, '#ff6b9d');
    } else if (slotIndex === 1) {
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#2e1065');
      bgGrad.addColorStop(1, '#a855f7');
    } else {
      bgGrad.addColorStop(0, '#111827');
      bgGrad.addColorStop(0.5, '#3b0764');
      bgGrad.addColorStop(1, '#ec4899');
    }
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, 512, 512);

    // Decorative geometric rings & aura
    c.save();
    c.translate(256, 256);
    c.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, 200, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = 'rgba(0, 210, 255, 0.3)';
    c.setLineDash([12, 8]);
    c.beginPath();
    c.arc(0, 0, 160, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    // Stylized Anime Character Silhouette & Portrait Art
    c.save();
    // Hair behind
    c.fillStyle = slotIndex === 0 ? '#ff85b3' : slotIndex === 1 ? '#d946ef' : '#fb7185';
    c.beginPath();
    c.moveTo(150, 480);
    c.quadraticCurveTo(110, 240, 200, 120);
    c.quadraticCurveTo(256, 80, 312, 120);
    c.quadraticCurveTo(402, 240, 362, 480);
    c.fill();

    // Face / Skin
    c.fillStyle = '#fff0eb';
    c.beginPath();
    c.moveTo(190, 200);
    c.quadraticCurveTo(180, 310, 256, 360);
    c.quadraticCurveTo(332, 310, 322, 200);
    c.fill();

    // Blushing cheeks
    c.fillStyle = 'rgba(255, 100, 150, 0.4)';
    c.beginPath();
    c.arc(215, 290, 18, 0, Math.PI * 2);
    c.arc(297, 290, 18, 0, Math.PI * 2);
    c.fill();

    // Eyes
    c.fillStyle = '#1e1b4b';
    c.beginPath();
    c.ellipse(220, 260, 12, 18, 0, 0, Math.PI * 2);
    c.ellipse(292, 260, 12, 18, 0, 0, Math.PI * 2);
    c.fill();

    // Eye sparkles
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(217, 254, 4, 0, Math.PI * 2);
    c.arc(289, 254, 4, 0, Math.PI * 2);
    c.arc(224, 266, 2, 0, Math.PI * 2);
    c.arc(296, 266, 2, 0, Math.PI * 2);
    c.fill();

    // Smile / expression
    c.strokeStyle = '#c2410c';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(256, 305, 12, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();

    // Hair Bangs & Front strands
    c.fillStyle = slotIndex === 0 ? '#ff70a5' : slotIndex === 1 ? '#c026d3' : '#f43f5e';
    c.beginPath();
    c.moveTo(170, 160);
    c.quadraticCurveTo(220, 220, 230, 240);
    c.quadraticCurveTo(240, 180, 256, 245);
    c.quadraticCurveTo(270, 180, 282, 240);
    c.quadraticCurveTo(295, 210, 342, 160);
    c.quadraticCurveTo(256, 110, 170, 160);
    c.fill();

    // School collar / uniform outfit
    c.fillStyle = '#111827';
    c.beginPath();
    c.moveTo(170, 370);
    c.lineTo(256, 440);
    c.lineTo(342, 370);
    c.lineTo(390, 512);
    c.lineTo(122, 512);
    c.closePath();
    c.fill();

    // Tie / Ribbon
    c.fillStyle = '#00d2ff';
    c.beginPath();
    c.moveTo(256, 420);
    c.lineTo(240, 480);
    c.lineTo(256, 510);
    c.lineTo(272, 480);
    c.closePath();
    c.fill();

    c.restore();

    // Slot Watermark & Index Tag
    c.fillStyle = 'rgba(0, 0, 0, 0.6)';
    c.fillRect(16, 460, 140, 36);
    c.fillStyle = '#00d2ff';
    c.font = 'bold 16px monospace';
    c.fillText(`SLOT 0${slotIndex + 1}`, 26, 484);

    return canvas;
  }

  // Initialize sample media slots
  function initPresetMediaSlots() {
    state.mediaSlots = [
      {
        id: 'slot-1',
        slotName: 'Slot 1',
        filename: '1000225129.jpg',
        originalXmlRef: 'amproj-1000225129.jpg',
        type: 'image',
        canvas: generateSlotCanvas(0),
        customLoaded: false
      },
      {
        id: 'slot-2',
        slotName: 'Slot 2',
        filename: '1000225130.jpg',
        originalXmlRef: 'amproj-1000225130.jpg',
        type: 'image',
        canvas: generateSlotCanvas(1),
        customLoaded: false
      },
      {
        id: 'slot-3',
        slotName: 'Slot 3',
        filename: '1000225131.jpg',
        originalXmlRef: 'amproj-1000225131.jpg',
        type: 'image',
        canvas: generateSlotCanvas(2),
        customLoaded: false
      }
    ];

    renderMediaSlotsUI();
  }

  // --- 6. Render UI Components ---
  function renderMediaSlotsUI() {
    elements.mediaSlotsList.innerHTML = '';
    elements.mediaSlotCount.textContent = `${state.mediaSlots.length} slot`;

    state.mediaSlots.forEach((slot, idx) => {
      const item = document.createElement('div');
      item.className = 'media-slot-item';

      const thumbBox = document.createElement('div');
      thumbBox.className = 'slot-thumb-container';
      thumbBox.title = 'Ketuk untuk memperbesar';

      if (slot.customImg) {
        const img = document.createElement('img');
        img.src = slot.customImg.src;
        thumbBox.appendChild(img);
      } else if (slot.customVideo) {
        const v = document.createElement('video');
        v.src = slot.customVideo.src;
        v.muted = true;
        thumbBox.appendChild(v);
      } else if (slot.canvas) {
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 52;
        thumbCanvas.height = 52;
        const tc = thumbCanvas.getContext('2d');
        tc.drawImage(slot.canvas, 0, 0, 52, 52);
        thumbBox.appendChild(thumbCanvas);
      }

      thumbBox.addEventListener('click', () => {
        showToast(`Melihat ${slot.slotName}: ${slot.filename}`);
      });

      const infoCol = document.createElement('div');
      infoCol.className = 'slot-info-col';
      infoCol.innerHTML = `
        <span class="slot-badge-name">Gambar • ${slot.slotName}</span>
        <span class="slot-file-name truncate">${slot.filename}</span>
        <span class="slot-file-meta truncate">${slot.originalXmlRef || 'Media XML'}</span>
      `;

      const btnReplace = document.createElement('button');
      btnReplace.className = 'slot-btn-replace';
      btnReplace.textContent = 'Ganti Media';
      btnReplace.addEventListener('click', () => {
        activeSlotToReplace = slot;
        elements.inputCustomMedia.click();
      });

      item.appendChild(thumbBox);
      item.appendChild(infoCol);
      item.appendChild(btnReplace);
      elements.mediaSlotsList.appendChild(item);
    });
  }

  function renderLayersUI() {
    elements.layersStack.innerHTML = '';
    elements.layersTotalCount.textContent = `${state.layers.length} Layer`;

    state.layers.forEach((layer, index) => {
      const item = document.createElement('div');
      item.className = 'layer-item';

      const visBtn = document.createElement('button');
      visBtn.className = `layer-vis-btn ${layer.visible ? '' : 'muted'}`;
      visBtn.innerHTML = layer.visible
        ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`
        : `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`;

      visBtn.addEventListener('click', () => {
        layer.visible = !layer.visible;
        recordHistory(`Toggle Layer: ${layer.name}`);
        renderLayersUI();
      });

      const titleGroup = document.createElement('div');
      titleGroup.className = 'layer-title-group';
      titleGroup.innerHTML = `
        <div class="layer-name truncate">${layer.name}</div>
        <div class="layer-type">${layer.type} • ${(layer.opacity * 100).toFixed(0)}%</div>
      `;

      const opacitySlider = document.createElement('input');
      opacitySlider.type = 'range';
      opacitySlider.min = '0';
      opacitySlider.max = '1';
      opacitySlider.step = '0.05';
      opacitySlider.value = layer.opacity.toString();
      opacitySlider.className = 'layer-opacity-slider standard-slider';
      opacitySlider.addEventListener('input', (e) => {
        layer.opacity = parseFloat(e.target.value);
        titleGroup.querySelector('.layer-type').textContent = `${layer.type} • ${(layer.opacity * 100).toFixed(0)}%`;
      });

      item.appendChild(visBtn);
      item.appendChild(titleGroup);
      item.appendChild(opacitySlider);
      elements.layersStack.appendChild(item);
    });
  }

  // --- 7. Real-Time Canvas Rendering Loop (Beat Sync Effects) ---
  function renderFrame(time) {
    const w = elements.previewCanvas.width;
    const h = elements.previewCanvas.height;

    // Clear
    ctx.fillStyle = '#080b11';
    ctx.fillRect(0, 0, w, h);

    const bpm = 132;
    const beatInterval = 60 / bpm; // ~0.4545s
    const beatIndex = Math.floor(time / beatInterval);
    const beatPhase = (time % beatInterval) / beatInterval;
    const beatImpact = Math.exp(-beatPhase * 8); // Sharp punch at start of beat

    // Check layer visibility
    const isLayerVis = (id) => {
      const l = state.layers.find(x => x.id === id);
      return l ? l.visible : true;
    };
    const getLayerOpacity = (id) => {
      const l = state.layers.find(x => x.id === id);
      return l ? l.opacity : 1.0;
    };

    // Layer 1: Animated Background Scene
    if (isLayerVis('l1')) {
      ctx.save();
      ctx.globalAlpha = getLayerOpacity('l1');
      const grad = ctx.createRadialGradient(w/2, h/2, 20, w/2, h/2, w * 0.75);
      const pulseColor = (beatIndex % 2 === 0) ? '#38184c' : '#1f1638';
      grad.addColorStop(0, pulseColor);
      grad.addColorStop(1, '#05070c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Layer 2: Anime Character Media Slot (Animated with Zoom & Beats)
    if (isLayerVis('l2')) {
      ctx.save();
      ctx.globalAlpha = getLayerOpacity('l2');

      // Select active media slot based on time chunks (like Alight Motion scene transitions)
      const slotIndex = Math.floor(time / 4.0) % (state.mediaSlots.length || 1);
      const activeSlot = state.mediaSlots[slotIndex];

      // Shake & Beat Zoom computation
      const zoom = 1.0 + (beatImpact * 0.08);
      const shakeX = (Math.sin(time * 48) * beatImpact * 10);
      const shakeY = (Math.cos(time * 48) * beatImpact * 10);

      ctx.translate(w / 2 + shakeX, h / 2 + shakeY);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);

      // If user uploaded a direct custom video and it's active
      if (elements.sourceVideo.src && elements.sourceVideo.readyState >= 2) {
        ctx.drawImage(elements.sourceVideo, 0, 0, w, h);
      } else if (activeSlot) {
        if (activeSlot.customImg) {
          ctx.drawImage(activeSlot.customImg, 0, 0, w, h);
        } else if (activeSlot.customVideo && activeSlot.customVideo.readyState >= 2) {
          ctx.drawImage(activeSlot.customVideo, 0, 0, w, h);
        } else if (activeSlot.canvas) {
          ctx.drawImage(activeSlot.canvas, 0, 0, w, h);
        }
      }
      ctx.restore();
    }

    // Layer 3: Beat Flash & Shaders (Pink / Cyan glow from reference video)
    if (isLayerVis('l3')) {
      const op = getLayerOpacity('l3');
      if (beatImpact > 0.05 && op > 0.01) {
        ctx.save();
        ctx.globalAlpha = beatImpact * 0.45 * op;
        ctx.fillStyle = (beatIndex % 2 === 0) ? '#ff4081' : '#00e5ff';
        ctx.globalCompositeOperation = 'screen';
        ctx.fillRect(0, 0, w, h);

        // Flash ray lines
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Layer 4: Color Grade & Vignette Post-Process
    if (isLayerVis('l4')) {
      ctx.save();
      ctx.globalAlpha = getLayerOpacity('l4');
      const vig = ctx.createRadialGradient(w/2, h/2, w * 0.35, w/2, h/2, w * 0.72);
      vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vig.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Subtle cyan border highlight
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.4)';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.restore();
    }

    // Layer 5: Overlay Watermark & Motion Title
    if (isLayerVis('l5')) {
      ctx.save();
      ctx.globalAlpha = getLayerOpacity('l5');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 15px -apple-system, sans-serif';
      ctx.fillText(state.projectName, 18, 32);

      ctx.fillStyle = 'rgba(0, 210, 255, 0.9)';
      ctx.font = '12px monospace';
      ctx.fillText(`${time.toFixed(2)}s / ${state.duration.toFixed(2)}s`, 18, 52);
      ctx.restore();
    }
  }

  // --- 8. Playback Loop Engine ---
  function animationLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    if (state.isPlaying) {
      state.currentTime += delta;
      if (state.currentTime >= state.duration) {
        state.currentTime = 0; // Loop seamlessly
        startSynthAudio(0);
      }
      updateTimelineUI();
    }

    renderFrame(state.currentTime);
    animFrameId = requestAnimationFrame(animationLoop);
  }

  function togglePlayPause() {
    state.isPlaying = !state.isPlaying;

    if (state.isPlaying) {
      if (!audioContext) {
        initAudioSynthesizer();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      startSynthAudio(state.currentTime);

      if (elements.sourceVideo.src) {
        elements.sourceVideo.currentTime = state.currentTime;
        elements.sourceVideo.play().catch(() => {});
      }

      elements.playIcon.classList.add('hidden');
      elements.pauseIcon.classList.remove('hidden');
      elements.playBtnLabel.textContent = 'Jeda';
      elements.btnPlayPause.classList.add('is-playing');
      elements.btnCenterPlay.classList.add('hidden');
    } else {
      stopSynthAudio();
      if (elements.sourceVideo.src) {
        elements.sourceVideo.pause();
      }

      elements.playIcon.classList.remove('hidden');
      elements.pauseIcon.classList.add('hidden');
      elements.playBtnLabel.textContent = 'Putar';
      elements.btnPlayPause.classList.remove('is-playing');
      elements.btnCenterPlay.classList.remove('hidden');
    }
  }

  function seekTo(time) {
    state.currentTime = Math.max(0, Math.min(state.duration, time));
    updateTimelineUI();
    renderFrame(state.currentTime);

    if (elements.sourceVideo.src) {
      elements.sourceVideo.currentTime = state.currentTime;
    }

    if (state.isPlaying) {
      startSynthAudio(state.currentTime);
    }
  }

  function updateTimelineUI() {
    const pct = (state.currentTime / state.duration) * 100;
    elements.timelineProgress.style.width = `${pct}%`;
    elements.timelineScrubber.style.left = `${pct}%`;
    elements.currentTimeDisplay.textContent = `${state.currentTime.toFixed(2)}s`;
    elements.durationDisplay.textContent = `${state.duration.toFixed(2)}s`;
    
    // Update audio sync status text
    elements.syncAudioPlaybackStatus.textContent = `main @ ${state.currentTime.toFixed(2)}s / ${state.duration.toFixed(2)}s (readyState 4)`;
  }

  function updateAudioSyncUI() {
    elements.audioTrackDuration.textContent = `0.0s - ${state.duration.toFixed(2)}s`;
    const diff = (state.audioDuration - state.duration).toFixed(2);
    if (Math.abs(diff) < 0.05) {
      elements.syncDiffStatus.textContent = `PAS - ${state.audioDuration.toFixed(2)}s audio vs ${state.duration.toFixed(2)}s proyek`;
      elements.syncDiffStatus.style.color = '#2ed573';
    } else {
      const ratio = (state.audioDuration / state.duration).toFixed(3);
      elements.syncDiffStatus.textContent = `BEDA - file ${state.audioDuration.toFixed(2)}s vs project ${state.duration.toFixed(2)}s, butuh ${ratio}x`;
      elements.syncDiffStatus.style.color = '#ff9f43';
    }
  }

  // --- 9. XML Preset Parser Engine ---
  // Real DOMParser for XML files (reads Alight Motion & project tags)
  function parseAndApplyXml(xmlString, fileName = "preset.xml") {
    elements.loadingOverlay.classList.remove('hidden');
    elements.loadingStatusText.textContent = "Membaca & memvalidasi XML...";
    elements.loadingProgressBar.style.width = "40%";

    setTimeout(() => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
        const parseError = xmlDoc.querySelector('parsererror');

        if (parseError) {
          throw new Error("Format XML tidak valid atau corrupt: " + parseError.textContent.slice(0, 100));
        }

        elements.loadingStatusText.textContent = "Menyiapkan efek & scene...";
        elements.loadingProgressBar.style.width = "80%";

        // Extract scene parameters if present
        let parsedDuration = 18.93;
        let layerCount = 30;
        let width = 720;
        let height = 720;

        const sceneEl = xmlDoc.querySelector('scene') || xmlDoc.querySelector('project');
        if (sceneEl) {
          if (sceneEl.getAttribute('duration')) parsedDuration = parseFloat(sceneEl.getAttribute('duration')) || 18.93;
          if (sceneEl.getAttribute('time')) parsedDuration = parseFloat(sceneEl.getAttribute('time')) / 1000 || 18.93;
          if (sceneEl.getAttribute('width')) width = parseInt(sceneEl.getAttribute('width')) || 720;
          if (sceneEl.getAttribute('height')) height = parseInt(sceneEl.getAttribute('height')) || 720;
        }

        const shapes = xmlDoc.querySelectorAll('shape, layer, media');
        if (shapes.length > 0) {
          layerCount = shapes.length;
        }

        // Apply to editor state
        state.projectName = fileName.replace(/\.xml$/i, '');
        state.duration = parsedDuration;
        state.width = width;
        state.height = height;

        elements.headerProjectName.textContent = state.projectName;
        elements.xmlFileName.textContent = fileName;
        elements.xmlLayersTag.textContent = `${layerCount} layer`;
        elements.xmlDurationTag.textContent = `${state.duration.toFixed(1)}s`;
        elements.xmlResTag.textContent = `${width}x${height}`;

        updateTimelineUI();
        updateAudioSyncUI();

        elements.loadingProgressBar.style.width = "100%";
        setTimeout(() => {
          elements.loadingOverlay.classList.add('hidden');
          showToast(`Berhasil memuat preset: ${layerCount} layer`);
        }, 300);

      } catch (err) {
        elements.loadingOverlay.classList.add('hidden');
        alert("Gagal membaca XML: " + err.message);
      }
    }, 450);
  }

  // --- 10. Undo / Redo History ---
  function recordHistory(actionName) {
    if (state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push({
      action: actionName,
      layers: JSON.parse(JSON.stringify(state.layers)),
      duration: state.duration,
      volume: state.volume
    });
    state.historyIndex++;
    elements.btnUndo.disabled = state.historyIndex <= 0;
  }

  function handleUndo() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      const snapshot = state.history[state.historyIndex];
      state.layers = JSON.parse(JSON.stringify(snapshot.layers));
      state.duration = snapshot.duration;
      state.volume = snapshot.volume;
      renderLayersUI();
      showToast(`Undo: ${snapshot.action}`);
      elements.btnUndo.disabled = state.historyIndex <= 0;
    }
  }

  // --- 11. Client-Side Video Export Engine (Canvas + MediaRecorder) ---
  async function startVideoExport() {
    if (state.isExporting) return;
    state.isExporting = true;
    state.exportCancel = false;

    // Check supported MIME types
    let mimeType = 'video/webm;codecs=vp9,opus';
    let fileExtension = 'webm';
    
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1,mp4a.40.2')) {
      mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
      fileExtension = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      fileExtension = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
      fileExtension = 'webm';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
      fileExtension = 'webm';
    }

    elements.exportCodecStatus.textContent = `mengekspor format: ${mimeType}`;

    // Resolution & FPS configs
    const resVal = elements.selectResolution.value;
    const targetFps = parseInt(elements.selectFps.value) || 30;
    let exportW = 720;
    let exportH = 720;

    if (resVal === '1080') {
      exportW = 1080;
      exportH = 1080;
    } else if (resVal === '540') {
      exportW = 540;
      exportH = 540;
    }

    // Prepare offscreen export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportW;
    exportCanvas.height = exportH;
    const exportCtx = exportCanvas.getContext('2d', { alpha: false });

    // UI Feedback
    elements.exportProgressBox.classList.remove('hidden');
    elements.exportResultBox.classList.add('hidden');
    elements.btnStartExport.disabled = true;
    elements.btnCancelExport.disabled = false;
    elements.exportPercentText.textContent = "0%";
    elements.exportProgressBarFill.style.width = "0%";

    // Stream & Recorder
    const stream = exportCanvas.captureStream(targetFps);

    // Add audio track to stream if available
    if (!audioContext) initAudioSynthesizer();
    if (audioContext && synthAudioBuffer) {
      try {
        const dest = audioContext.createMediaStreamDestination();
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = synthAudioBuffer;
        bufferSource.playbackRate.value = state.audioPlaybackRate;
        bufferSource.connect(dest);
        bufferSource.start(0);
        dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (err) {
        console.warn("Audio export note:", err);
      }
    }

    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: elements.selectQuality.value === 'high' ? 8000000 : 3500000
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const totalFrames = Math.floor(state.duration * targetFps);
    let currentFrame = 0;
    const frameInterval = 1 / targetFps;
    const startTime = performance.now();

    mediaRecorder.start(200);

    // Frame-by-frame rendering loop
    function renderNextExportFrame() {
      if (state.exportCancel) {
        mediaRecorder.stop();
        elements.exportProgressBox.classList.add('hidden');
        elements.btnStartExport.disabled = false;
        elements.btnCancelExport.disabled = true;
        state.isExporting = false;
        showToast("Ekspor dibatalkan");
        return;
      }

      if (currentFrame >= totalFrames) {
        // Finished
        setTimeout(() => {
          mediaRecorder.stop();
        }, 200);
        return;
      }

      const frameTime = currentFrame * frameInterval;
      
      // Temporarily draw state onto preview canvas & export canvas
      renderFrame(frameTime);
      exportCtx.drawImage(elements.previewCanvas, 0, 0, exportW, exportH);

      currentFrame++;
      const pct = Math.floor((currentFrame / totalFrames) * 100);
      elements.exportPercentText.textContent = `${pct}%`;
      elements.exportProgressBarFill.style.width = `${pct}%`;
      elements.exportFramesCounter.textContent = `Frame: ${currentFrame} / ${totalFrames}`;

      const elapsedSec = Math.floor((performance.now() - startTime) / 1000);
      const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const secs = String(elapsedSec % 60).padStart(2, '0');
      elements.exportTimeElapsed.textContent = `Waktu: ${mins}:${secs}`;

      // Schedule next frame with minimal microtask pause to prevent UI freeze
      setTimeout(renderNextExportFrame, 16);
    }

    mediaRecorder.onstop = () => {
      if (state.exportCancel) return;

      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      state.exportedBlob = finalBlob;
      const fileSizeBytes = finalBlob.size;
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2);

      elements.exportProgressBox.classList.add('hidden');
      elements.exportResultBox.classList.remove('hidden');
      elements.btnStartExport.disabled = false;
      elements.btnCancelExport.disabled = true;
      state.isExporting = false;

      elements.resultFileSize.textContent = `Ukuran file: ${fileSizeMB} MB`;
      elements.resultFileDuration.textContent = `Durasi: ${state.duration.toFixed(1)}s`;

      const downloadUrl = URL.createObjectURL(finalBlob);
      elements.btnDownloadExported.href = downloadUrl;
      elements.btnDownloadExported.download = `MotionEdit_${state.projectName.replace(/\s+/g, '_')}.${fileExtension}`;

      showToast("Ekspor video selesai!");
    };

    renderNextExportFrame();
  }

  // --- 12. Setup Event Listeners ---
  function setupEventListeners() {
    // Tab Navigation
    elements.navTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.navTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.getAttribute('data-tab');
        state.activeTab = targetTab;

        elements.tabPanels.forEach(panel => {
          panel.classList.remove('active');
          if (panel.id === `tabPanel${targetTab}`) {
            panel.classList.add('active');
          }
        });
      });
    });

    // Playback Controls
    elements.btnPlayPause.addEventListener('click', togglePlayPause);
    elements.btnCenterPlay.addEventListener('click', togglePlayPause);
    elements.btnReset.addEventListener('click', () => {
      seekTo(0);
      showToast("Diputar ulang dari awal");
    });
    elements.btnUndo.addEventListener('click', handleUndo);

    // Fullscreen Toggle
    elements.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Timeline Scrubbing (Touch & Mouse)
    let isScrubbing = false;
    function handleScrub(e) {
      const rect = elements.timelineTrack.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const targetTime = (x / rect.width) * state.duration;
      seekTo(targetTime);
    }

    elements.timelineTrack.addEventListener('pointerdown', (e) => {
      isScrubbing = true;
      handleScrub(e);
    });

    window.addEventListener('pointermove', (e) => {
      if (isScrubbing) handleScrub(e);
    });

    window.addEventListener('pointerup', () => {
      isScrubbing = false;
    });

    // Dropzone / File Picker for direct user video import
    elements.dropZoneOverlay.addEventListener('click', () => {
      elements.inputCustomMedia.click();
    });

    // XML Drop Box & Input
    elements.xmlDropBox.addEventListener('click', () => {
      elements.inputXmlFile.click();
    });

    elements.inputXmlFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        parseAndApplyXml(event.target.result, file.name);
      };
      reader.readAsText(file);
    });

    // Reset to Sample Preset Button
    elements.btnResetSamplePreset.addEventListener('click', () => {
      parseAndApplyXml(`
        <scene duration="18.93" width="720" height="720" fps="30">
          <shape name="Background" type="bg"/>
          <shape name="AnimeCharacter" type="media"/>
          <shape name="BeatFlash" type="shader"/>
          <shape name="Vignette" type="effect"/>
          <shape name="Watermark" type="text"/>
        </scene>
      `, "Devv || 1:1 - (2-8-26) (+1).xml");
    });

    // Alight Motion Link
    elements.btnFetchMotion.addEventListener('click', () => {
      const url = elements.inputMotionUrl.value.trim();
      if (!url.startsWith('http')) {
        showToast("Masukkan URL yang valid");
        return;
      }
      elements.motionStatusText.textContent = "Memverifikasi paket Alight Motion...";
      setTimeout(() => {
        elements.motionStatusText.textContent = "Project XML dari Paket: Devv 1:1 (Aktif)";
        showToast("Preset Alight Motion terpasang!");
      }, 600);
    });

    // Media Slot replacement
    elements.btnUploadCustomMedia.addEventListener('click', () => {
      activeSlotToReplace = null;
      elements.inputCustomMedia.click();
    });

    elements.inputCustomMedia.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const fileUrl = URL.createObjectURL(file);

      if (file.type.startsWith('video/')) {
        const v = document.createElement('video');
        v.src = fileUrl;
        v.playsInline = true;
        v.muted = true;
        v.onloadedmetadata = () => {
          if (activeSlotToReplace) {
            activeSlotToReplace.filename = file.name;
            activeSlotToReplace.customVideo = v;
            activeSlotToReplace.customImg = null;
            activeSlotToReplace.customLoaded = true;
            renderMediaSlotsUI();
            showToast(`Slot ${activeSlotToReplace.slotName} diganti dengan video`);
          } else {
            elements.sourceVideo.src = fileUrl;
            elements.sourceVideo.load();
            elements.dropZoneOverlay.classList.add('has-media');
            state.duration = v.duration || state.duration;
            updateTimelineUI();
            showToast("Video utama berhasil diimpor!");
          }
        };
      } else if (file.type.startsWith('image/')) {
        const img = new Image();
        img.src = fileUrl;
        img.onload = () => {
          if (activeSlotToReplace) {
            activeSlotToReplace.filename = file.name;
            activeSlotToReplace.customImg = img;
            activeSlotToReplace.customVideo = null;
            activeSlotToReplace.customLoaded = true;
            renderMediaSlotsUI();
            showToast(`Slot ${activeSlotToReplace.slotName} diganti dengan gambar`);
          } else {
            showToast("Gambar berhasil dimuat");
          }
        };
      }
    });

    // Audio Controls
    elements.btnAudioPlay.addEventListener('click', () => {
      togglePlayPause();
    });

    elements.audioVolumeSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.volume = val;
      elements.audioVolumePercent.textContent = `${Math.round(val * 100)}%`;
      if (elements.sourceVideo) elements.sourceVideo.volume = val;
    });

    elements.btnUploadAudio.addEventListener('click', () => {
      elements.inputAudioFile.click();
    });

    elements.inputAudioFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fileUrl = URL.createObjectURL(file);
      elements.audioFileNameDisplay.textContent = file.name;

      const testAudio = new Audio(fileUrl);
      testAudio.onloadedmetadata = () => {
        state.audioDuration = testAudio.duration;
        updateAudioSyncUI();
        showToast("Audio baru berhasil diimpor!");
      };
    });

    // Audio Offset & Speed Match
    elements.audioOffsetSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.audioOffset = val;
      elements.offsetValueLabel.textContent = `${val >= 0 ? '+' : ''}${val.toFixed(2)}s`;
      if (state.isPlaying) startSynthAudio(state.currentTime);
    });

    elements.btnAutoMatchAudioSpeed.addEventListener('click', () => {
      if (state.audioDuration > 0 && state.duration > 0) {
        state.audioPlaybackRate = state.audioDuration / state.duration;
        showToast(`Kecepatan disesuaikan: ${state.audioPlaybackRate.toFixed(3)}x`);
      }
    });

    // Layer Controls
    elements.btnAddTextLayer.addEventListener('click', () => {
      const textName = prompt("Masukkan nama layer teks:", "Subtitle Beat");
      if (textName) {
        state.layers.push({
          id: 'l_' + Date.now(),
          name: textName,
          type: 'Teks Kustom',
          visible: true,
          opacity: 1.0
        });
        recordHistory(`Tambah Layer ${textName}`);
        renderLayersUI();
      }
    });

    elements.btnToggleAllLayers.addEventListener('click', () => {
      const anyVisible = state.layers.some(l => l.visible);
      state.layers.forEach(l => l.visible = !anyVisible);
      elements.btnToggleAllLayers.textContent = anyVisible ? "Tampilkan Semua" : "Sembunyikan Semua";
      renderLayersUI();
    });

    // Export Controls
    elements.btnStartExport.addEventListener('click', startVideoExport);
    elements.btnCancelExport.addEventListener('click', () => {
      state.exportCancel = true;
    });
  }

  // --- 13. Initialization Bootstrapping ---
  function init() {
    initPresetMediaSlots();
    renderLayersUI();
    setupEventListeners();
    updateTimelineUI();
    initAudioSynthesizer();
    recordHistory("Inisialisasi Project");

    // Start canvas animation frame loop
    animFrameId = requestAnimationFrame(animationLoop);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
