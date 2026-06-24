/* ═══════════════════════════════════════════════════════════════════
   TRIBE v2 Neural Content Analyzer — Complete Client-Side Application
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ─── CONSTANTS ─────────────────────────────────────────────────
  const NETWORKS = [
    { id: 'V1',   name: 'V1 (Primary Visual)',       color: '#3b82f6', hue: 217 },
    { id: 'FFA',  name: 'FFA (Fusiform Face)',        color: '#8b5cf6', hue: 258 },
    { id: 'EBA',  name: 'EBA (Body Area)',             color: '#a855f7', hue: 271 },
    { id: 'PPA',  name: 'PPA (Place Area)',            color: '#06b6d4', hue: 188 },
    { id: 'STS',  name: 'STS (Temporal Sulcus)',       color: '#14b8a6', hue: 172 },
    { id: 'LANG', name: 'Language (Broca/Wernicke)',   color: '#f59e0b', hue: 38  },
    { id: 'DMN',  name: 'MPFC/PCC (Default Mode)',     color: '#22c55e', hue: 142 },
    { id: 'NAcc', name: 'NAcc (Reward)',               color: '#ec4899', hue: 330 },
    { id: 'AIns', name: 'AIns (Anterior Insula)',      color: '#ef4444', hue: 0   },
  ];

  const POSITIVE_WORDS = new Set([
    'amazing','incredible','love','win','best','awesome','beautiful','excited',
    'new','free','wow','perfect','happy','great','fantastic','surprise','reward',
    'bonus','exclusive','special',
  ]);

  const NEGATIVE_WORDS = new Set([
    'hate','fear','terrible','awful','death','die','pain','hurt','ugly','disgust',
    'gross','horrify','scary','danger','warning','risk','loss','fail','worst','sick',
  ]);

  const SELF_REF_WORDS = new Set([
    'i','me','my','mine','myself','we','us','our','ours','you','your','yours',
  ]);

  const SOCIAL_WORDS = new Set([
    'friend','love','family','people','feel','think','believe','remember',
    'together','share','care','trust','help','hope','dream',
  ]);

  const ROI_POSITIONS = {
    V1:   { x: 430, y: 180 },
    FFA:  { x: 370, y: 290 },
    EBA:  { x: 390, y: 230 },
    PPA:  { x: 350, y: 300 },
    STS:  { x: 300, y: 280 },
    LANG: { x: 150, y: 180 },
    DMN:  { x: 220, y: 100 },
    NAcc: { x: 160, y: 230 },
    AIns: { x: 190, y: 250 },
  };

  const FRAME_W = 320;
  const FRAME_H = 180;

  const ARCHETYPES = [
    { name: 'High-stakes challenge (MrBeast-style)', desc: 'Fast cuts · big-money stakes · expressive faces · constant payoff escalation.', refScore: 92, fingerprint: { V1: 0.72, FFA: 0.80, EBA: 0.70, PPA: 0.35, STS: 0.65, LANG: 0.40, DMN: 0.55, NAcc: 0.90, AIns: 0.30 } },
    { name: 'Sports highlight', desc: 'Body motion + crowd audio + payoff moment = strong NAcc spike.', refScore: 82, fingerprint: { V1: 0.75, FFA: 0.50, EBA: 0.85, PPA: 0.40, STS: 0.60, LANG: 0.25, DMN: 0.30, NAcc: 0.80, AIns: 0.35 } },
    { name: 'Comedy sketch', desc: 'Surprise + faces + voice timing → reliable NAcc bursts.', refScore: 78, fingerprint: { V1: 0.55, FFA: 0.75, EBA: 0.55, PPA: 0.30, STS: 0.70, LANG: 0.55, DMN: 0.45, NAcc: 0.75, AIns: 0.25 } },
    { name: 'Reaction / commentary', desc: 'Big face, big voice, high social cognition.', refScore: 71, fingerprint: { V1: 0.50, FFA: 0.85, EBA: 0.40, PPA: 0.20, STS: 0.75, LANG: 0.60, DMN: 0.55, NAcc: 0.65, AIns: 0.30 } },
    { name: 'Breaking news / outrage', desc: 'Strong negative arousal — drives clicks, but watch-time decays fast.', refScore: 68, fingerprint: { V1: 0.60, FFA: 0.65, EBA: 0.35, PPA: 0.30, STS: 0.70, LANG: 0.75, DMN: 0.60, NAcc: 0.55, AIns: 0.70 } },
    { name: 'Luxury real estate tour', desc: 'PPA-rich scenes, aspirational reward, low aversion.', refScore: 64, fingerprint: { V1: 0.70, FFA: 0.30, EBA: 0.30, PPA: 0.85, STS: 0.35, LANG: 0.40, DMN: 0.50, NAcc: 0.60, AIns: 0.20 } },
    { name: 'Product demo / unboxing', desc: 'Face + object + reveal. Mid reward, high attention.', refScore: 62, fingerprint: { V1: 0.65, FFA: 0.60, EBA: 0.50, PPA: 0.35, STS: 0.45, LANG: 0.50, DMN: 0.40, NAcc: 0.55, AIns: 0.25 } },
    { name: 'Travel / scenic', desc: 'PPA-dominant. Calm, aspirational. Modest virality, strong saves.', refScore: 60, fingerprint: { V1: 0.80, FFA: 0.25, EBA: 0.30, PPA: 0.90, STS: 0.30, LANG: 0.35, DMN: 0.55, NAcc: 0.50, AIns: 0.15 } },
    { name: 'Tutorial / how-to', desc: 'Information-rich. Modest reward signal, high language activation.', refScore: 58, fingerprint: { V1: 0.55, FFA: 0.45, EBA: 0.35, PPA: 0.30, STS: 0.50, LANG: 0.80, DMN: 0.45, NAcc: 0.45, AIns: 0.20 } },
    { name: 'ASMR / slow craft', desc: 'Low arousal but high sustained attention. Long watch-time, niche reach.', refScore: 55, fingerprint: { V1: 0.50, FFA: 0.35, EBA: 0.40, PPA: 0.45, STS: 0.55, LANG: 0.25, DMN: 0.60, NAcc: 0.40, AIns: 0.15 } },
    { name: 'Talking-head explainer', desc: 'Single subject, low motion. Language-heavy, reward modest.', refScore: 45, fingerprint: { V1: 0.40, FFA: 0.70, EBA: 0.25, PPA: 0.15, STS: 0.65, LANG: 0.75, DMN: 0.50, NAcc: 0.35, AIns: 0.25 } },
    { name: 'Slow / static screencast', desc: 'Very low arousal across the board. Hard to go viral.', refScore: 28, fingerprint: { V1: 0.35, FFA: 0.15, EBA: 0.15, PPA: 0.20, STS: 0.20, LANG: 0.50, DMN: 0.30, NAcc: 0.20, AIns: 0.20 } },
  ];

  const REGION_DESCS = {
    V1: 'Low-level vision · contrast, motion, color',
    FFA: 'Face processing · faces drive parasocial attention',
    EBA: 'Body & action perception',
    PPA: 'Scenes, environments, location cues',
    STS: 'Social cognition · biological motion, gaze, voice',
    LANG: 'Speech and semantic comprehension',
    DMN: 'Self-reference · value integration',
    NAcc: 'Anticipatory reward · forecasts viral spread',
    AIns: 'Aversion, disgust, churn signal',
  };

  // ─── UTILITY HELPERS ───────────────────────────────────────────
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function mean(arr) {
    if (!arr || arr.length === 0) return 0;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }

  function stdDev(arr) {
    const m = mean(arr);
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += (arr[i] - m) * (arr[i] - m);
    return Math.sqrt(s / arr.length);
  }

  function sigmoid(x, k, x0) {
    return 1 / (1 + Math.exp(-k * (x - x0)));
  }

  function ema(arr, alpha) {
    if (arr.length === 0) return [];
    const out = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
       out.push(alpha * arr[i] + (1 - alpha) * out[i - 1]);
    }
    return out;
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function $(id, suffix) { return document.getElementById(id + (suffix || '')); }

  function getDefaultBackendUrl() {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.origin;
    }
    return 'https://tribe-backend-351432107547.us-central1.run.app';
  }

  // ─── STATE ─────────────────────────────────────────────────────
  var stagedFiles = [];
  var stimulusMode = 'video';
  var engineMode = 'cloud';
  var backendUrl = getDefaultBackendUrl();
  var backendToken = '';
  var messageCounter = 0;

  var MODALITY_CONFIG = {
    video: {
      icon: '🎬',
      title: 'Drop video stimulus here',
      hint: 'MP4, MOV, WebM · maps V1, FFA, EBA, STS, NAcc onset',
      accept: 'video/*',
      label: 'Hook, script, or caption',
      placeholder: 'Optional: paste voiceover, on-screen text, or describe the hook…',
    },
    audio: {
      icon: '🎵',
      title: 'Drop audio stimulus here',
      hint: 'MP3, WAV, FLAC · maps STS prosody, NAcc reward bursts, AIns aversion',
      accept: 'audio/*',
      label: 'Transcript or show notes',
      placeholder: 'Optional: paste podcast transcript or narration script…',
    },
    image: {
      icon: '🖼️',
      title: 'Drop thumbnail or frame here',
      hint: 'JPG, PNG, WebP · maps V1 contrast, FFA faces, PPA scene composition',
      accept: 'image/*',
      label: 'Caption or context',
      placeholder: 'Describe what viewers see — hook text, title overlay, etc.',
    },
    text: {
      icon: '📝',
      title: '',
      hint: '',
      accept: '',
      label: 'Script or hook text',
      placeholder: 'Paste your opening hook, ad copy, or narration — TRIBE maps LANG, DMN, NAcc from syntax…',
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // MODULE 1: PARTICLE BACKGROUND
  // ═══════════════════════════════════════════════════════════════
  function initParticles() {
    var canvas = $('particle-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var PARTICLE_COUNT = 80;
    var CONNECTION_DIST = 120;
    var animId = null;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      var hue = 220 + Math.random() * 60; // 220-280
      var sat = 60 + Math.random() * 20;  // 60-80
      var lit = 50 + Math.random() * 20;  // 50-70
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.4,
        color: 'hsl(' + hue + ',' + sat + '%,' + lit + '%)',
      };
    }

    function init() {
      resize();
      particles = [];
      for (var i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle());
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        // Wrap edges
        if (p.x < 0) p.x += canvas.width;
        if (p.x > canvas.width) p.x -= canvas.width;
        if (p.y < 0) p.y += canvas.height;
        if (p.y > canvas.height) p.y -= canvas.height;
      }
      // Draw connections
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            var alpha = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.strokeStyle = 'rgba(139,92,246,' + alpha + ')';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      // Draw particles
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);
    init();
    tick();
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 2: NEURAL SCAN COMPOSER
  // ═══════════════════════════════════════════════════════════════
  function setStimulusMode(mode) {
    stimulusMode = mode;
    localStorage.setItem('tribe_stimulus_mode', mode);

    var cfg = MODALITY_CONFIG[mode] || MODALITY_CONFIG.video;
    var dropzone = $('stimulus-dropzone');
    var fileUploader = $('file-uploader');
    var dropIcon = $('dropzone-icon');
    var dropTitle = $('dropzone-title');
    var dropHint = $('dropzone-hint');
    var stimLabel = $('stimulus-label');
    var textarea = $('chat-textarea');

    document.querySelectorAll('.modality-tab').forEach(function (tab) {
      var isActive = tab.getAttribute('data-mode') === mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (mode === 'text') {
      if (dropzone) dropzone.classList.add('hidden');
    } else {
      if (dropzone) dropzone.classList.remove('hidden');
      if (dropIcon) dropIcon.textContent = cfg.icon;
      if (dropTitle) dropTitle.textContent = cfg.title;
      if (dropHint) dropHint.textContent = cfg.hint;
      if (fileUploader) fileUploader.accept = cfg.accept;
    }

    if (stimLabel) stimLabel.textContent = cfg.label;
    if (textarea) textarea.placeholder = cfg.placeholder;
    toggleSendButton();
  }

  function initChatComposer() {
    var textarea = $('chat-textarea');
    var fileUploader = $('file-uploader');
    var btnSend = $('btn-chat-send');
    var btnMic = $('btn-mic');
    var btnDropzone = $('btn-dropzone-browse');
    var dropzone = $('stimulus-dropzone');

    if (textarea) {
      textarea.addEventListener('input', function () {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(140, textarea.scrollHeight) + 'px';
        toggleSendButton();
      });
      textarea.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submitQuery();
        }
      });
    }

    if (btnDropzone && fileUploader) {
      btnDropzone.addEventListener('click', function () { fileUploader.click(); });
      fileUploader.addEventListener('change', function () {
        if (fileUploader.files.length > 0) {
          handleSelectedFile(fileUploader.files[0]);
        }
        fileUploader.value = '';
      });
    }

    if (dropzone && fileUploader) {
      dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('drag-over');
      });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleSelectedFile(e.dataTransfer.files[0]);
        }
      });
    }

    document.querySelectorAll('.modality-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setStimulusMode(tab.getAttribute('data-mode'));
      });
    });

    document.querySelectorAll('.quick-scan-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (chip.getAttribute('data-mode')) {
          setStimulusMode(chip.getAttribute('data-mode'));
          if (fileUploader) fileUploader.click();
          return;
        }
        var prompt = chip.getAttribute('data-prompt');
        if (prompt && textarea) {
          setStimulusMode('text');
          textarea.value = prompt;
          textarea.dispatchEvent(new Event('input'));
          textarea.focus();
        }
      });
    });

    if (btnSend) btnSend.addEventListener('click', submitQuery);

    var recognition = null;
    if (window.webkitSpeechRecognition || window.SpeechRecognition) {
      var SpeechRec = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onstart = function () { if (btnMic) btnMic.classList.add('listening'); };
      recognition.onend = function () { if (btnMic) btnMic.classList.remove('listening'); };
      recognition.onerror = function () { if (btnMic) btnMic.classList.remove('listening'); };
      recognition.onresult = function (e) {
        var resultText = e.results[0][0].transcript;
        if (textarea) {
          textarea.value = (textarea.value + ' ' + resultText).trim();
          textarea.dispatchEvent(new Event('input'));
        }
      };
    }

    if (btnMic) {
      btnMic.addEventListener('click', function () {
        if (!recognition) {
          alert('Web Speech API is not supported in this browser.');
          return;
        }
        if (btnMic.classList.contains('listening')) recognition.stop();
        else recognition.start();
      });
    }

    var btnEngine = $('btn-engine-select');
    var engineMenu = $('engine-dropdown-menu');
    var optionCloud = $('option-cloud-run');
    var optionSim = $('option-browser-sim');
    var displayLabel = $('engine-display-label');

    if (btnEngine && engineMenu) {
      btnEngine.addEventListener('click', function (e) {
        e.stopPropagation();
        engineMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', function () {
        engineMenu.classList.add('hidden');
      });
    }

    function updateEngineMode(mode) {
      engineMode = mode;
      localStorage.setItem('tribe_engine_mode', mode);
      if (mode === 'cloud') {
        if (displayLabel) displayLabel.textContent = 'TRIBE v2';
        if (optionCloud) optionCloud.classList.add('active');
        if (optionSim) optionSim.classList.remove('active');
      } else {
        if (displayLabel) displayLabel.textContent = 'Browser Sim';
        if (optionSim) optionSim.classList.add('active');
        if (optionCloud) optionCloud.classList.remove('active');
      }
      document.querySelectorAll('.engine-option').forEach(function (opt) {
        var check = opt.querySelector('.option-check');
        if (check) check.textContent = opt.classList.contains('active') ? '✓' : '';
      });
    }

    if (optionCloud) optionCloud.addEventListener('click', function () { updateEngineMode('cloud'); });
    if (optionSim) optionSim.addEventListener('click', function () { updateEngineMode('sim'); });

    updateEngineMode(localStorage.getItem('tribe_engine_mode') || 'cloud');
    setStimulusMode(localStorage.getItem('tribe_stimulus_mode') || 'video');

    var serverStatus = $('server-status');
    var drawer = $('settings-drawer');
    var drawerClose = $('btn-drawer-close');
    if (serverStatus && drawer) {
      serverStatus.style.cursor = 'pointer';
      serverStatus.addEventListener('click', function () { drawer.classList.toggle('active'); });
    }
    if (drawerClose && drawer) {
      drawerClose.addEventListener('click', function () { drawer.classList.remove('active'); });
    }
  }

  function handleSelectedFile(file) {
    var mime = file.type || '';
    var mediaType = 'unknown';
    if (mime.startsWith('video/')) mediaType = 'video';
    else if (mime.startsWith('image/')) mediaType = 'image';
    else if (mime.startsWith('audio/')) mediaType = 'audio';
    else {
      var ext = file.name.split('.').pop().toLowerCase();
      if (['mp4','webm','mov','avi','mkv'].indexOf(ext) !== -1) mediaType = 'video';
      else if (['jpg','jpeg','png','gif','webp','bmp','svg'].indexOf(ext) !== -1) mediaType = 'image';
      else if (['mp3','wav','ogg','aac','flac','m4a'].indexOf(ext) !== -1) mediaType = 'audio';
    }

    if (mediaType === 'unknown') {
      alert('Unsupported file type for neural scan. Use video, image, or audio.');
      return;
    }

    setStimulusMode(mediaType);
    stagedFiles = [{ file: file, type: mediaType }];
    renderStagedFiles();
    toggleSendButton();
  }

  function renderStagedFiles() {
    var container = $('attachment-preview-row');
    if (!container) return;
    container.innerHTML = '';
    if (stagedFiles.length === 0) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    stagedFiles.forEach(function (sf, idx) {
      var pill = document.createElement('div');
      pill.className = 'attachment-preview-pill';
      var icon = sf.type === 'video' ? '🎬' : (sf.type === 'image' ? '🖼️' : '🎵');
      pill.innerHTML = '<span class="attachment-icon">' + icon + '</span>' +
        '<span class="attachment-name">' + sf.file.name + '</span>';
      
      var btnRemove = document.createElement('button');
      btnRemove.className = 'btn-attachment-remove';
      btnRemove.type = 'button';
      btnRemove.textContent = '✕';
      btnRemove.addEventListener('click', function (e) {
        e.stopPropagation();
        stagedFiles.splice(idx, 1);
        renderStagedFiles();
        toggleSendButton();
      });
      pill.appendChild(btnRemove);
      container.appendChild(pill);
    });
  }

  function toggleSendButton() {
    var sendBtn = $('btn-chat-send');
    var textarea = $('chat-textarea');
    if (!sendBtn || !textarea) return;

    var text = textarea.value.trim();
    var hasInput = text.length > 0 || stagedFiles.length > 0;
    sendBtn.classList.toggle('disabled', !hasInput);
    sendBtn.disabled = !hasInput;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scrollToBottom() {
    var scroller = $('chat-scroller');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  function buildThinkingHTML(suffix) {
    return '<div class="thinking-tracker" id="thinking-tracker' + suffix + '">' +
      '<div class="thinking-header"><span class="thinking-icon">🧠</span> Mapping cortical response…</div>' +
      '<div class="thinking-stepper">' +
        '<div class="think-step" id="step-ingest' + suffix + '">Ingest stimulus</div>' +
        '<div class="think-step" id="step-visual' + suffix + '">Visual feature extraction</div>' +
        '<div class="think-step" id="step-audio' + suffix + '">Audio prosody analysis</div>' +
        '<div class="think-step" id="step-text' + suffix + '">Language & semantics</div>' +
        '<div class="think-step" id="step-mapping' + suffix + '">Network parcellation</div>' +
        '<div class="think-step" id="step-scoring' + suffix + '">AIM virality scoring</div>' +
      '</div>' +
      '<div class="thinking-progress"><div class="thinking-progress-bar" id="progress-bar-fill' + suffix + '" style="width:5%"></div></div>' +
      '<div class="thinking-pct" id="progress-pct' + suffix + '">0%</div>' +
    '</div>';
  }

  function buildReportHTML(suffix) {
    return '<div class="report-root hidden" id="report-container' + suffix + '">' +
      '<div class="tldr-banner"><div class="tldr-header">Neural read · <span id="tldr-tag' + suffix + '">—</span></div><p class="tldr-body" id="tldr-body' + suffix + '"></p></div>' +
      '<div class="score-overview-block">' +
        '<div class="score-hero-card">' +
          '<div class="score-badge" id="percentile-value' + suffix + '">—</div>' +
          '<div class="score-num-display"><span class="score-big-val" id="score-hero-value' + suffix + '">0</span><span class="score-total-val">/100</span></div>' +
          '<p class="score-tagline" id="score-tag-line' + suffix + '"></p>' +
          '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">Closest archetype: <strong id="archetype-match-name' + suffix + '">—</strong> <span id="archetype-match-ref' + suffix + '"></span></p>' +
          '<div class="aim-mini-grid">' +
            '<div class="mini-stat-item">NAcc onset<span class="mini-stat-val" id="aim-mini-nacc' + suffix + '">—</span></div>' +
            '<div class="mini-stat-item">AIns aversion<span class="mini-stat-val" id="aim-mini-ains' + suffix + '">—</span></div>' +
            '<div class="mini-stat-item">DMN self-ref<span class="mini-stat-val" id="aim-mini-mpfc' + suffix + '">—</span></div>' +
            '<div class="mini-stat-item">Language<span class="mini-stat-val" id="aim-mini-pcc' + suffix + '">—</span></div>' +
          '</div>' +
          '<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px dashed rgba(0,0,0,0.06)">' +
            '<div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--clr-violet);margin-bottom:0.25rem">Biggest lever</div>' +
            '<div style="font-size:0.88rem;font-weight:700" id="lever-title' + suffix + '"></div>' +
            '<div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.45" id="lever-body' + suffix + '"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gauge-visual-card">' +
          '<div class="gauge-svg-container" style="position:relative">' +
            '<svg viewBox="0 0 120 70" width="140" height="90"><path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="8" stroke-linecap="round"/><path id="gauge-foreground' + suffix + '" d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="url(#gaugeGrad' + suffix + ')" stroke-width="8" stroke-linecap="round" stroke-dasharray="345.5" stroke-dashoffset="345.5"/><defs><linearGradient id="gaugeGrad' + suffix + '"><stop offset="0%" stop-color="#1a73e8"/><stop offset="100%" stop-color="#7c4dff"/></linearGradient></defs></svg>' +
            '<div class="gauge-pct-center"><span id="virality-score-value' + suffix + '">0</span></div>' +
          '</div>' +
          '<div class="gauge-label">Grade <span id="virality-grade' + suffix + '">—</span></div>' +
          '<p style="font-size:0.72rem;color:var(--text-muted);text-align:center;margin-top:0.35rem" id="virality-label' + suffix + '"></p>' +
        '</div>' +
      '</div>' +
      '<div class="brain-visualizer-block">' +
        '<div class="brain-map-wrapper" id="brain-map-container' + suffix + '"></div>' +
        '<div class="brain-info-panel">' +
          '<div class="active-roi-card"><div class="active-roi-header"><span class="active-roi-name" id="roi-active-name' + suffix + '">Select a network</span><span class="active-roi-val" id="roi-active-value' + suffix + '">—</span></div><p class="active-roi-desc" id="roi-active-desc' + suffix + '">Click a parcellation node to inspect activation.</p></div>' +
          '<div id="region-list' + suffix + '"></div>' +
          '<div id="network-legend' + suffix + '" style="margin-top:0.5rem"></div>' +
        '</div>' +
      '</div>' +
      '<div class="raw-bars-container" id="network-bars' + suffix + '"></div>' +
      '<div style="background:#f8fafc;border-radius:12px;padding:1rem">' +
        '<div class="report-section-title">AIM Breakdown</div>' +
        '<div style="display:flex;flex-direction:column;gap:0.5rem;font-size:0.78rem">' +
          '<div>NAcc reward <span id="aim-nacc-value' + suffix + '">—</span><div style="height:6px;background:rgba(0,0,0,0.04);border-radius:99px;margin-top:4px"><div id="aim-nacc-bar' + suffix + '" style="height:100%;width:0;background:#ec4899;border-radius:99px;transition:width 0.8s"></div></div></div>' +
          '<div>AIns aversion <span id="aim-ains-value' + suffix + '">—</span><div style="height:6px;background:rgba(0,0,0,0.04);border-radius:99px;margin-top:4px"><div id="aim-ains-bar' + suffix + '" style="height:100%;width:0;background:#ef4444;border-radius:99px;transition:width 0.8s"></div></div></div>' +
          '<div>Sustained engagement <span id="aim-engagement-value' + suffix + '">—</span><div style="height:6px;background:rgba(0,0,0,0.04);border-radius:99px;margin-top:4px"><div id="aim-engagement-bar' + suffix + '" style="height:100%;width:0;background:#22c55e;border-radius:99px;transition:width 0.8s"></div></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="timeline-block hidden" id="timeline-section' + suffix + '"><div class="report-section-title">Temporal dynamics</div><div class="timeline-canvas-container" id="timeline-canvas-wrapper' + suffix + '"><canvas class="timeline-canvas" id="timeline-canvas' + suffix + '"></canvas><div class="hidden" id="timeline-tooltip' + suffix + '" style="position:absolute;background:rgba(0,0,0,0.85);color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;pointer-events:none"></div></div><div id="timeline-legend' + suffix + '"></div><div class="timeline-annotations" id="timeline-annotations' + suffix + '"></div></div>' +
      '<div class="hidden" id="evidence-section' + suffix + '"><div class="report-section-title">Neural evidence</div><div id="evidence-grid' + suffix + '" style="display:grid;gap:0.75rem"></div></div>' +
      '<div class="hidden" id="archetype-section' + suffix + '"><div class="report-section-title">Archetype benchmark</div><div id="archetype-table' + suffix + '" style="display:flex;flex-direction:column;gap:0.4rem"></div></div>' +
      '<div class="hidden" id="tips-section' + suffix + '"><div class="report-section-title">Optimization tips · <span id="headroom-value' + suffix + '">+0pts</span> headroom</div><div id="tips-grid' + suffix + '" style="display:flex;flex-direction:column;gap:0.6rem"></div></div>' +
      '<div class="insights-block hidden" id="insights-section' + suffix + '"><div class="report-section-title">Creator insights</div><div class="insights-list" id="insights-grid' + suffix + '"></div></div>' +
      '<div class="hidden" id="methodology-section' + suffix + '" style="font-size:0.72rem;color:var(--text-muted);line-height:1.5;padding:0.5rem 0">Activations mapped via HCP MMP 1.0 parcellation on fsaverage5. Virality scored with Knutson AIM: weighted NAcc onset (1.6×), minus AIns aversion, plus sustained LANG/STS/FFA engagement.</div>' +
    '</div>';
  }

  function buildAIMessageHTML(suffix) {
    return '<div class="message-content">' + buildThinkingHTML(suffix) + buildReportHTML(suffix) + '</div>';
  }

  async function submitQuery() {
    var textarea = $('chat-textarea');
    var text = textarea ? textarea.value.trim() : '';
    var hasFile = stagedFiles.length > 0;
    if (!text && !hasFile) return;

    var mediaType = hasFile ? stagedFiles[0].type : 'text';
    var input = hasFile ? stagedFiles[0].file : text;
    var textPrompt = text;

    var app = $('app-container');
    if (app) app.classList.remove('state-landing');
    if (app) app.classList.add('state-chat');

    messageCounter += 1;
    var suffix = '-msg' + messageCounter;
    var thread = $('chat-messages');
    if (!thread) return;

    var userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    var userHtml = '<div class="message-content">';
    if (hasFile) {
      var icon = stagedFiles[0].type === 'video' ? '🎬' : (stagedFiles[0].type === 'image' ? '🖼️' : '🎵');
      userHtml += '<div class="message-file-badge"><span>' + icon + '</span> ' + escapeHtml(stagedFiles[0].file.name) + '</div>';
    }
    if (text) userHtml += '<div class="message-text">' + escapeHtml(text) + '</div>';
    userHtml += '</div>';
    userMsg.innerHTML = userHtml;
    thread.appendChild(userMsg);

    var aiMsg = document.createElement('div');
    aiMsg.className = 'chat-message ai';
    aiMsg.innerHTML = '<div class="ai-avatar">✦</div>' + buildAIMessageHTML(suffix);
    thread.appendChild(aiMsg);

    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
    stagedFiles = [];
    renderStagedFiles();
    toggleSendButton();
    scrollToBottom();

    await analyzeContent(input, mediaType, suffix, textPrompt);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 3: FEATURE EXTRACTION PIPELINE
  // ═══════════════════════════════════════════════════════════════

  // ─── 3A: Visual Feature Extraction ─────────────────────────────
  function getGrayscale(data) {
    var w = data.width;
    var h = data.height;
    var d = data.data;
    var gray = new Float32Array(w * h);
    for (var i = 0; i < w * h; i++) {
      var idx = i * 4;
      gray[i] = (0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2]) / 255;
    }
    return gray;
  }

  function analyzeV1(imageData) {
    var gray = getGrayscale(imageData);
    var w = imageData.width;
    var h = imageData.height;
    var n = gray.length;

    var lumSum = 0;
    for (var i = 0; i < n; i++) lumSum += gray[i];
    var meanLum = lumSum / n;

    var varSum = 0;
    for (var i = 0; i < n; i++) {
      var diff = gray[i] - meanLum;
      varSum += diff * diff;
    }
    var contrast = Math.sqrt(varSum / n);

    var edgeCount = 0;
    var edgeThreshold = 0.1;
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        var gx = -gray[idx - w - 1] + gray[idx - w + 1]
               - 2 * gray[idx - 1] + 2 * gray[idx + 1]
               - gray[idx + w - 1] + gray[idx + w + 1];
        var gy = -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1]
               + gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
        var mag = Math.sqrt(gx * gx + gy * gy);
        if (mag > edgeThreshold) edgeCount++;
      }
    }
    var edgeDensity = edgeCount / ((w - 2) * (h - 2));

    var lumVar = clamp(contrast * 3, 0, 1);
    var normContrast = clamp(contrast * 4, 0, 1);
    var normEdge = clamp(edgeDensity * 2, 0, 1);

    return clamp(0.4 * normContrast + 0.4 * normEdge + 0.2 * lumVar, 0, 1);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s, l: l };
  }

  function analyzeFFA(imageData) {
    var d = imageData.data;
    var total = imageData.width * imageData.height;
    var skinCount = 0;
    for (var i = 0; i < d.length; i += 4) {
      var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (hsl.h >= 0 && hsl.h <= 50 && hsl.s >= 0.2 && hsl.s <= 0.8 &&
          hsl.l >= 0.2 && hsl.l <= 0.8) {
        skinCount++;
      }
    }
    var ratio = skinCount / total;
    return clamp(sigmoid(ratio, 12, 0.15), 0, 1);
  }

  function analyzeEBA(prevImageData, currentImageData) {
    if (!prevImageData) return 0.3;
    var prev = prevImageData.data;
    var curr = currentImageData.data;
    var len = Math.min(prev.length, curr.length);
    var diffSum = 0;
    var pixelCount = len / 4;
    for (var i = 0; i < len; i += 4) {
      diffSum += (Math.abs(curr[i] - prev[i]) + Math.abs(curr[i + 1] - prev[i + 1]) + Math.abs(curr[i + 2] - prev[i + 2])) / 765;
    }
    var meanDiff = diffSum / pixelCount;
    return clamp(meanDiff * 5, 0, 1);
  }

  function analyzePPA(imageData) {
    var d = imageData.data;
    var w = imageData.width;
    var h = imageData.height;

    var gradSum = 0;
    var gradCount = 0;
    for (var y = 0; y < h; y += 2) {
      for (var x = 1; x < w; x++) {
        var idx = (y * w + x) * 4;
        var pidx = (y * w + x - 1) * 4;
        gradSum += (Math.abs(d[idx] - d[pidx]) + Math.abs(d[idx + 1] - d[pidx + 1]) + Math.abs(d[idx + 2] - d[pidx + 2])) / 765;
        gradCount++;
      }
    }
    var spatialFreq = gradCount > 0 ? gradSum / gradCount : 0;

    var bins = new Float32Array(16);
    var total = w * h;
    for (var i = 0; i < d.length; i += 4) {
      var lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      var bin = Math.min(15, Math.floor(lum / 16));
      bins[bin]++;
    }
    var entropy = 0;
    for (var i = 0; i < 16; i++) {
      var p = bins[i] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    var normEntropy = entropy / 4;

    var normSpatial = clamp(spatialFreq * 8, 0, 1);
    return clamp(0.5 * normSpatial + 0.5 * normEntropy, 0, 1);
  }

  function analyzeVisualRewardCue(imageData) {
    var d = imageData.data;
    var total = imageData.width * imageData.height;
    var highSatCount = 0;
    var warmCount = 0;
    var brightSum = 0;
    for (var i = 0; i < d.length; i += 4) {
      var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if (hsl.s > 0.6) highSatCount++;
      if ((hsl.h >= 0 && hsl.h <= 60) || hsl.h >= 300) warmCount++;
      brightSum += hsl.l;
    }
    var satRatio = highSatCount / total;
    var warmRatio = warmCount / total;
    var avgBrightness = brightSum / total;
    var bright = avgBrightness > 0.6 ? 1 : avgBrightness / 0.6;
    return clamp((satRatio * 0.4 + warmRatio * 0.3 + bright * 0.3), 0, 1);
  }

  function analyzeVisualThreatCue(imageData, prevGray, currentGray) {
    var d = imageData.data;
    var total = imageData.width * imageData.height;

    var lumSum = 0;
    for (var i = 0; i < currentGray.length; i++) lumSum += currentGray[i];
    var meanLum = lumSum / currentGray.length;
    var darkScore = meanLum < 0.3 ? (0.3 - meanLum) / 0.3 : 0;

    var redCount = 0;
    for (var i = 0; i < d.length; i += 4) {
      var hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      if ((hsl.h >= 340 || hsl.h <= 20) && hsl.s > 0.4) redCount++;
    }
    var redRatio = redCount / total;

    var contrastShift = 0;
    if (prevGray) {
      var prevMean = 0;
      for (var i = 0; i < prevGray.length; i++) prevMean += prevGray[i];
      prevMean /= prevGray.length;
      contrastShift = clamp(Math.abs(meanLum - prevMean) * 5, 0, 1);
    }

    return clamp(darkScore * 0.4 + redRatio * 0.3 + contrastShift * 0.3, 0, 1);
  }

  function extractFrames(videoEl, canvas, duration) {
    return new Promise(function (resolve, reject) {
      var ctx = canvas.getContext('2d');
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      var totalSeconds = Math.max(1, Math.floor(duration));
      var frames = [];
      var currentSec = 0;

      function seekAndCapture() {
        if (currentSec >= totalSeconds) {
          resolve(frames);
          return;
        }
        videoEl.currentTime = currentSec;
      }

      videoEl.addEventListener('seeked', function onSeeked() {
        try {
          ctx.drawImage(videoEl, 0, 0, FRAME_W, FRAME_H);
          var imageData = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
          frames.push(imageData);
        } catch (e) {
          frames.push(null);
        }
        currentSec++;
        if (currentSec >= totalSeconds) {
          videoEl.removeEventListener('seeked', onSeeked);
          resolve(frames);
        } else {
          videoEl.currentTime = currentSec;
        }
      });

      seekAndCapture();
    });
  }

  function extractImageFrame(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = $('hidden-canvas');
        var ctx = canvas.getContext('2d');
        canvas.width = FRAME_W;
        canvas.height = FRAME_H;
        ctx.drawImage(img, 0, 0, FRAME_W, FRAME_H);
        var imageData = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
        URL.revokeObjectURL(img.src);
        resolve([imageData]);
      };
      img.onerror = function () {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // ─── 3B: Audio Feature Extraction ──────────────────────────────
  function decodeAudioFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.decodeAudioData(reader.result).then(function (buffer) {
          audioCtx.close();
          resolve(buffer);
        }).catch(function (err) {
          audioCtx.close();
          reject(err);
        });
      };
      reader.onerror = function () { reject(new Error('Failed to read file')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function analyzeAudioPerSecond(audioBuffer) {
    var sampleRate = audioBuffer.sampleRate;
    var channelData = audioBuffer.getChannelData(0);
    var duration = audioBuffer.duration;
    var totalSeconds = Math.max(1, Math.floor(duration));
    var samplesPerSec = sampleRate;

    var results = [];

    var globalRms = 0;
    for (var i = 0; i < channelData.length; i++) globalRms += channelData[i] * channelData[i];
    globalRms = Math.sqrt(globalRms / channelData.length);
    if (globalRms === 0) globalRms = 0.001;

    for (var sec = 0; sec < totalSeconds; sec++) {
      var start = sec * samplesPerSec;
      var end = Math.min(start + samplesPerSec, channelData.length);
      var window = channelData.subarray(start, end);
      var windowLen = window.length;
      if (windowLen === 0) {
        results.push({ rmsEnergy: 0, spectralCentroid: 0, spectralFlux: 0, zeroCrossingRate: 0 });
        continue;
      }

      var rmsSum = 0;
      for (var i = 0; i < windowLen; i++) rmsSum += window[i] * window[i];
      var rms = Math.sqrt(rmsSum / windowLen);

      var zcr = 0;
      for (var i = 1; i < windowLen; i++) {
        if ((window[i] >= 0 && window[i - 1] < 0) || (window[i] < 0 && window[i - 1] >= 0)) zcr++;
      }
      var zcrRate = zcr / windowLen;

      var fftSize = 1024;
      var numFrames = Math.max(1, Math.floor(windowLen / fftSize));
      var centroidSum = 0;
      var fluxSum = 0;
      var prevMagnitudes = null;

      for (var f = 0; f < numFrames; f++) {
        var fStart = f * fftSize;
        var magnitudes = new Float32Array(fftSize / 2);
        var bins = Math.min(256, fftSize / 2);
        var weightedSum = 0;
        var magSum = 0;
        for (var k = 0; k < bins; k++) {
          var re = 0, im = 0;
          for (var n = 0; n < fftSize && (fStart + n) < windowLen; n += 4) {
            var angle = -2 * Math.PI * k * n / fftSize;
            var sample = window[fStart + n];
            re += sample * Math.cos(angle);
            im += sample * Math.sin(angle);
          }
          var mag = Math.sqrt(re * re + im * im);
          magnitudes[k] = mag;
          var freq = k * sampleRate / fftSize;
          weightedSum += freq * mag;
          magSum += mag;
        }
        centroidSum += magSum > 0 ? weightedSum / magSum : 0;

        if (prevMagnitudes) {
          var flux = 0;
          for (var k = 0; k < bins; k++) {
            flux += Math.abs(magnitudes[k] - prevMagnitudes[k]);
          }
          fluxSum += flux;
        }
        prevMagnitudes = magnitudes;
      }

      var spectralCentroid = centroidSum / numFrames;
      var spectralFlux = numFrames > 1 ? fluxSum / (numFrames - 1) : 0;

      results.push({
        rmsEnergy: rms,
        spectralCentroid: spectralCentroid,
        spectralFlux: spectralFlux,
        zeroCrossingRate: zcrRate,
        isLoud: rms > 2 * globalRms,
      });
    }

    return { perSecond: results, globalRms: globalRms };
  }

  function mapAudioToNetworks(audioResults) {
    var perSec = audioResults.perSecond;
    var globalRms = audioResults.globalRms;
    var n = perSec.length;
    var sts = new Float32Array(n);
    var nacc = new Float32Array(n);
    var ains = new Float32Array(n);

    var maxCentroid = 0;
    var maxFlux = 0;
    for (var i = 0; i < n; i++) {
      if (perSec[i].spectralCentroid > maxCentroid) maxCentroid = perSec[i].spectralCentroid;
      if (perSec[i].spectralFlux > maxFlux) maxFlux = perSec[i].spectralFlux;
    }
    if (maxCentroid === 0) maxCentroid = 1;
    if (maxFlux === 0) maxFlux = 1;

    for (var i = 0; i < n; i++) {
      var r = perSec[i];
      var centroidNorm = r.spectralCentroid / maxCentroid;
      var speechBand = (r.spectralCentroid > 300 && r.spectralCentroid < 3400) ? centroidNorm : centroidNorm * 0.5;
      sts[i] = clamp(0.6 * speechBand + 0.4 * (r.zeroCrossingRate * 10), 0, 1);

      var onset = 0;
      if (i === 0 || r.rmsEnergy > (perSec[Math.max(0, i - 1)].rmsEnergy * 1.5)) onset = 0.5;
      var fluxNorm = r.spectralFlux / maxFlux;
      nacc[i] = clamp(0.5 * onset + 0.5 * fluxNorm, 0, 1);

      var loud = r.isLoud ? 0.6 : 0;
      var lowFreqDom = r.spectralCentroid < 200 ? 0.4 : 0;
      ains[i] = clamp(loud + lowFreqDom, 0, 1);
    }

    return { STS: sts, NAcc: nacc, AIns: ains };
  }

  // ─── 3C: Text Feature Extraction ──────────────────────────────
  function tokenize(text) {
    return text.toLowerCase().replace(/[^a-z0-9'\s-]/g, '').split(/\s+/).filter(function (w) { return w.length > 0; });
  }

  function analyzeLang(text) {
    var sentences = text.split(/[.!?]+/).filter(function (s) { return s.trim().length > 0; });
    var words = tokenize(text);
    if (words.length === 0) return 0;

    var meanSentLen = sentences.length > 0 ? words.length / sentences.length : words.length;
    var uniqueWords = new Set(words);
    var ttr = uniqueWords.size / words.length;

    var totalCharLen = 0;
    for (var i = 0; i < words.length; i++) totalCharLen += words[i].length;
    var avgWordLen = totalCharLen / words.length;

    var normSentLen = clamp(meanSentLen / 25, 0, 1);
    var normTTR = clamp(ttr, 0, 1);
    var normWordLen = clamp((avgWordLen - 2) / 6, 0, 1);

    return clamp((normSentLen * 0.35 + normTTR * 0.35 + normWordLen * 0.3), 0, 1);
  }

  function analyzeDMN(text) {
    var words = tokenize(text);
    if (words.length === 0) return 0;
    var count = 0;
    for (var i = 0; i < words.length; i++) {
      if (SELF_REF_WORDS.has(words[i]) || SOCIAL_WORDS.has(words[i])) count++;
    }
    var density = count / words.length;
    return clamp(sigmoid(density, 20, 0.08), 0, 1);
  }

  function analyzeNAccText(text) {
    var words = tokenize(text);
    if (words.length === 0) return 0;
    var count = 0;
    for (var i = 0; i < words.length; i++) {
      if (POSITIVE_WORDS.has(words[i])) count++;
    }
    var density = count / words.length;
    return clamp(sigmoid(density, 30, 0.04), 0, 1);
  }

  function analyzeAInsText(text) {
    var words = tokenize(text);
    if (words.length === 0) return 0;
    var count = 0;
    for (var i = 0; i < words.length; i++) {
      if (NEGATIVE_WORDS.has(words[i])) count++;
    }
    var density = count / words.length;
    return clamp(sigmoid(density, 30, 0.04), 0, 1);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 4: BRAIN NETWORK MAPPER
  // ═══════════════════════════════════════════════════════════════
  function mapToNetworks(visualFrames, audioNetworks, textScores, duration) {
    var n = Math.max(1, Math.floor(duration));

    function ensureLen(arr, len, defaultVal) {
      if (!arr || arr.length === 0) {
        var a = new Float32Array(len);
        for (var i = 0; i < len; i++) a[i] = defaultVal;
        return a;
      }
      if (arr.length >= len) return arr;
      var result = new Float32Array(len);
      for (var i = 0; i < len; i++) result[i] = i < arr.length ? arr[i] : arr[arr.length - 1];
      return result;
    }

    var vV1 = ensureLen(visualFrames.V1, n, 0.3);
    var vFFA = ensureLen(visualFrames.FFA, n, 0.2);
    var vEBA = ensureLen(visualFrames.EBA, n, 0.3);
    var vPPA = ensureLen(visualFrames.PPA, n, 0.3);
    var vReward = ensureLen(visualFrames.reward, n, 0.3);
    var vThreat = ensureLen(visualFrames.threat, n, 0.2);

    var aSTS = ensureLen(audioNetworks ? audioNetworks.STS : null, n, 0.2);
    var aNAcc = ensureLen(audioNetworks ? audioNetworks.NAcc : null, n, 0.2);
    var aAIns = ensureLen(audioNetworks ? audioNetworks.AIns : null, n, 0.2);

    var tLang = textScores.lang;
    var tDMN = textScores.dmn;
    var tNAcc = textScores.nacc;
    var tAIns = textScores.ains;

    var perSecond = {};
    NETWORKS.forEach(function (net) {
      perSecond[net.id] = new Float32Array(n);
    });

    for (var t = 0; t < n; t++) {
      perSecond.V1[t]   = vV1[t];
      perSecond.FFA[t]  = vFFA[t];
      perSecond.EBA[t]  = vEBA[t];
      perSecond.PPA[t]  = vPPA[t];
      perSecond.STS[t]  = clamp(0.7 * aSTS[t] + 0.3 * tLang, 0, 1);
      perSecond.LANG[t] = clamp(0.3 * aSTS[t] + 0.7 * tLang, 0, 1);
      perSecond.DMN[t]  = tDMN;
      perSecond.NAcc[t] = clamp(0.35 * vReward[t] + 0.35 * aNAcc[t] + 0.30 * tNAcc, 0, 1);
      perSecond.AIns[t] = clamp(0.35 * vThreat[t] + 0.35 * aAIns[t] + 0.30 * tAIns, 0, 1);
    }

    var alpha = 0.3;
    NETWORKS.forEach(function (net) {
      var smoothed = ema(Array.from(perSecond[net.id]), alpha);
      for (var i = 0; i < n; i++) {
        perSecond[net.id][i] = clamp(smoothed[i], 0, 1);
      }
    });

    var summary = {};
    NETWORKS.forEach(function (net) {
      summary[net.id] = mean(Array.from(perSecond[net.id]));
    });

    return { perSecond: perSecond, summary: summary };
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 5: VIRALITY SCORE (AIM FRAMEWORK)
  // ═══════════════════════════════════════════════════════════════
  function computeViralityScore(perSecond, durationSeconds) {
    var n = Math.max(1, Math.floor(durationSeconds));
    var onsetEnd = Math.min(4, n);
    var onsetWeight = 1.6;

    var onsetNAccSum = 0;
    for (var i = 0; i < onsetEnd; i++) onsetNAccSum += perSecond.NAcc[i];
    var onsetNAcc = onsetNAccSum / onsetEnd;

    var onsetAInsSum = 0;
    for (var i = 0; i < onsetEnd; i++) onsetAInsSum += perSecond.AIns[i];
    var onsetAIns = onsetAInsSum / onsetEnd;

    var sustainedSum = 0;
    for (var i = 0; i < n; i++) {
      sustainedSum += 0.35 * perSecond.LANG[i] + 0.35 * perSecond.STS[i] + 0.30 * perSecond.FFA[i];
    }
    var sustained = sustainedSum / n;

    var raw = (onsetWeight * onsetNAcc) - (onsetWeight * onsetAIns) + (1.0 * sustained);
    var score = 100 / (1 + Math.exp(-2.5 * (raw - 0.8)));

    var grade;
    if (score >= 90) grade = 'S';
    else if (score >= 75) grade = 'A';
    else if (score >= 55) grade = 'B';
    else if (score >= 35) grade = 'C';
    else grade = 'D';

    return {
      score: Math.round(score),
      grade: grade,
      onsetNAcc: onsetNAcc,
      onsetAIns: onsetAIns,
      sustained: sustained,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 6: SVG BRAIN MAP VISUALIZATION
  // ═══════════════════════════════════════════════════════════════
  function renderBrainMap(summary, suffix) {
    var container = $('brain-map-container', suffix);
    if (!container) return;
    container.innerHTML = '';
    var svgNS = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 500 400');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = '500px';
    svg.style.display = 'block';
    svg.style.margin = '0 auto';

    var defs = document.createElementNS(svgNS, 'defs');

    // Scoped Linear Gradient
    var grad = document.createElementNS(svgNS, 'linearGradient');
    grad.setAttribute('id', 'brain-fill' + suffix);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
    var stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#1e293b');
    var stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#0f172a');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);

    // Scoped Glow Filters
    NETWORKS.forEach(function (net) {
      var activation = summary[net.id] || 0;
      var blur = activation * 12;
      var filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', 'glow-' + net.id + suffix);
      filter.setAttribute('x', '-50%'); filter.setAttribute('y', '-50%');
      filter.setAttribute('width', '200%'); filter.setAttribute('height', '200%');
      var feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
      feBlur.setAttribute('stdDeviation', String(blur));
      feBlur.setAttribute('result', 'coloredBlur');
      var feMerge = document.createElementNS(svgNS, 'feMerge');
      var feMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
      feMergeNode1.setAttribute('in', 'coloredBlur');
      var feMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
      feMergeNode2.setAttribute('in', 'SourceGraphic');
      feMerge.appendChild(feMergeNode1);
      feMerge.appendChild(feMergeNode2);
      filter.appendChild(feBlur);
      filter.appendChild(feMerge);
      defs.appendChild(filter);
    });

    svg.appendChild(defs);

    var brainPath = document.createElementNS(svgNS, 'path');
    brainPath.setAttribute('d',
      'M 80,200 C 60,160 70,100 120,60 C 160,30 220,20 280,25 C 340,30 390,60 420,100 ' +
      'C 445,135 450,170 445,200 C 440,240 420,270 390,290 C 360,310 320,320 280,330 ' +
      'C 240,340 200,340 160,330 C 130,322 110,305 95,280 C 85,260 80,240 75,220 Z'
    );
    brainPath.setAttribute('fill', 'url(#brain-fill' + suffix + ')');
    brainPath.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    brainPath.setAttribute('stroke-width', '1.5');
    svg.appendChild(brainPath);

    var sulci = [
      'M 250,40 Q 260,150 240,300',
      'M 150,120 Q 250,160 380,140',
      'M 130,250 Q 220,240 350,270',
    ];
    sulci.forEach(function (d) {
      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(255,255,255,0.06)');
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
    });

    var tooltip = document.createElement('div');
    tooltip.className = 'brain-tooltip';
    tooltip.style.cssText = 'position:absolute;pointer-events:none;background:rgba(0,0,0,0.85);color:#fff;' +
      'padding:6px 10px;border-radius:6px;font-size:12px;white-space:nowrap;opacity:0;transition:opacity 0.2s;z-index:10;';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    NETWORKS.forEach(function (net) {
      var pos = ROI_POSITIONS[net.id];
      var activation = summary[net.id] || 0;
      var opacity = 0.3 + 0.7 * activation;

      var g = document.createElementNS(svgNS, 'g');
      g.setAttribute('filter', 'url(#glow-' + net.id + suffix + ')');
      g.style.cursor = 'pointer';

      var circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', '14');
      circle.setAttribute('fill', net.color);
      circle.setAttribute('opacity', String(opacity));
      g.appendChild(circle);

      var label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', pos.x);
      label.setAttribute('y', pos.y + 26);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', 'rgba(0,0,0,0.45)');
      label.setAttribute('font-size', '10');
      label.setAttribute('font-weight', '600');
      label.setAttribute('font-family', 'Outfit, sans-serif');
      label.textContent = net.id;
      g.appendChild(label);

      g.addEventListener('mouseenter', function (e) {
        tooltip.textContent = net.name + ': ' + (activation * 100).toFixed(1) + '%';
        tooltip.style.opacity = '1';
      });
      g.addEventListener('mousemove', function (e) {
        var rect = container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 24) + 'px';
      });
      g.addEventListener('mouseleave', function () {
        tooltip.style.opacity = '0';
      });

      // Interactive parcellation node click isolation
      g.addEventListener('click', function () {
        var activeName = $('roi-active-name', suffix);
        var activeVal = $('roi-active-value', suffix);
        var activeDesc = $('roi-active-desc', suffix);
        if (activeName) activeName.textContent = net.name;
        if (activeVal) activeVal.textContent = (activation * 100).toFixed(1) + '%';
        if (activeDesc) activeDesc.textContent = REGION_DESCS[net.id] || '';
      });

      svg.appendChild(g);
    });

    container.insertBefore(svg, tooltip);

    var legendEl = $('network-legend', suffix);
    if (legendEl) {
      legendEl.innerHTML = '';
      NETWORKS.forEach(function (net) {
        var item = document.createElement('span');
        item.className = 'legend-item';
        item.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:2px 8px;font-size:11px;font-weight:500;color:var(--text-secondary);';
        var dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;background:' + net.color + ';';
        item.appendChild(dot);
        item.appendChild(document.createTextNode(net.id));
        legendEl.appendChild(item);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 7: NETWORK BAR CHART
  // ═══════════════════════════════════════════════════════════════
  function renderNetworkBars(summary, suffix) {
    var container = $('network-bars', suffix);
    if (!container) return;
    container.innerHTML = '';

    NETWORKS.forEach(function (net) {
      var val = summary[net.id] || 0;
      var pct = (val * 100).toFixed(1);

      var row = document.createElement('div');
      row.className = 'raw-bar-row';

      var meta = document.createElement('div');
      meta.className = 'raw-bar-meta';

      var label = document.createElement('div');
      label.className = 'raw-bar-label';
      
      var dot = document.createElement('span');
      dot.className = 'raw-bar-dot';
      dot.style.background = net.color;

      label.appendChild(dot);
      label.appendChild(document.createTextNode(net.id + ' \u00b7 ' + net.name));

      var value = document.createElement('span');
      value.className = 'raw-bar-val';
      value.textContent = pct + '%';

      meta.appendChild(label);
      meta.appendChild(value);

      var track = document.createElement('div');
      track.className = 'raw-bar-fill-track';

      var fill = document.createElement('div');
      fill.className = 'raw-bar-fill';
      fill.style.width = '0%';
      fill.style.background = net.color;
      track.appendChild(fill);

      row.appendChild(meta);
      row.appendChild(track);
      container.appendChild(row);

      // Animate bar width in browser
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fill.style.width = pct + '%';
        });
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 8: VIRALITY GAUGE (Vector SVG implementation)
  // ═══════════════════════════════════════════════════════════════
  function renderGauge(viralityResult, suffix) {
    var scoreValueEl = $('virality-score-value', suffix);
    var gradeEl = $('virality-grade', suffix);
    var labelEl = $('virality-label', suffix);
    var fgPath = $('gauge-foreground', suffix);

    var score = viralityResult.score;
    var grade = viralityResult.grade;

    if (scoreValueEl) scoreValueEl.textContent = '0';
    if (gradeEl) gradeEl.textContent = grade;
    
    // Smooth counter increment
    var currentScore = 0;
    var duration = 1200;
    var startTime = null;

    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min(1, (timestamp - startTime) / duration);
      currentScore = score * progress;
      if (scoreValueEl) scoreValueEl.textContent = Math.round(currentScore);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (scoreValueEl) scoreValueEl.textContent = score;
        if (gradeEl) gradeEl.textContent = grade;
        var labels = {
          S: '🔥 Exceptional viral potential — your hook is neuroscience-perfect',
          A: '🚀 Strong viral signal — NAcc onset is powerful',
          B: '✅ Good engagement potential — consider strengthening the hook',
          C: '⚡ Moderate signal — the opening needs more punch',
          D: '💡 Low signal — rethink the first 4 seconds entirely',
        };
        if (labelEl) labelEl.textContent = labels[grade] || '';
      }
    }
    requestAnimationFrame(animate);

    // Transition stroke dashoffset of vector gauge arc
    if (fgPath) {
      var targetOffset = 345.5 * (1 - score / 100);
      requestAnimationFrame(function () {
        fgPath.style.strokeDashoffset = targetOffset;
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 9: TIMELINE CHART (HTML5 Canvas with premium offsets)
  // ═══════════════════════════════════════════════════════════════
  function renderTimeline(perSecond, duration, suffix) {
    var wrapper = $('timeline-canvas-wrapper', suffix);
    var canvas = $('timeline-canvas', suffix);
    var tooltip = $('timeline-tooltip', suffix);
    if (!wrapper || !canvas) return;
    var dpr = window.devicePixelRatio || 1;

    var n = Math.max(1, Math.floor(duration));
    if (n <= 1) return;

    var timelineResizeHandler = null;

    function draw() {
      var displayW = wrapper.clientWidth || 700;
      var displayH = 250;
      canvas.width = displayW * dpr;
      canvas.height = displayH * dpr;
      canvas.style.width = displayW + 'px';
      canvas.style.height = displayH + 'px';
      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var padL = 50, padR = 20, padT = 20, padB = 35;
      var chartW = displayW - padL - padR;
      var chartH = displayH - padT - padB;

      function xPos(t) { return padL + (t / (n - 1)) * chartW; }
      function yPos(v) { return padT + (1 - v) * chartH; }

      ctx.clearRect(0, 0, displayW, displayH);

      // Light-Theme Premium Gridlines
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach(function (v) {
        ctx.beginPath();
        ctx.moveTo(padL, yPos(v));
        ctx.lineTo(padL + chartW, yPos(v));
        ctx.stroke();
      });

      // Onset zone highlight
      var onsetEnd = Math.min(4, n);
      if (onsetEnd > 0) {
        ctx.fillStyle = 'rgba(236,72,153,0.04)';
        var x0 = xPos(0);
        var x1 = xPos(Math.min(onsetEnd - 1, n - 1));
        if (n === 1) x1 = x0 + 40;
        ctx.fillRect(x0, padT, x1 - x0, chartH);
        ctx.fillStyle = 'rgba(236,72,153,0.6)';
        ctx.font = '500 9px Outfit, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Onset Zone (1.6× weight)', x0 + 4, padT + 12);
      }

      // Y-axis labels (Dark typography contrast)
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = '600 10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      [0, 0.25, 0.50, 0.75, 1.00].forEach(function (v) {
        ctx.fillText(v.toFixed(2), padL - 6, yPos(v) + 3);
      });

      // X-axis labels
      ctx.textAlign = 'center';
      var step = n <= 10 ? 1 : (n <= 30 ? 5 : 10);
      for (var t = 0; t < n; t += step) {
        ctx.fillText(t + 's', xPos(t), displayH - 8);
      }
      if ((n - 1) % step !== 0) {
        ctx.fillText((n - 1) + 's', xPos(n - 1), displayH - 8);
      }

      // Draw multi-second networks curves
      NETWORKS.forEach(function (net) {
        var data = perSecond[net.id];
        if (!data || data.length < 2) return;

        var r = parseInt(net.color.slice(1, 3), 16);
        var g = parseInt(net.color.slice(3, 5), 16);
        var b = parseInt(net.color.slice(5, 7), 16);

        // Solid smooth area
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.03)';
        ctx.beginPath();
        ctx.moveTo(xPos(0), yPos(0));
        for (var t = 0; t < n; t++) {
          ctx.lineTo(xPos(t), yPos(data[t]));
        }
        ctx.lineTo(xPos(n - 1), yPos(0));
        ctx.closePath();
        ctx.fill();

        // Stroke line
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var t = 0; t < n; t++) {
          if (t === 0) {
            ctx.moveTo(xPos(t), yPos(data[t]));
          } else {
            var prevX = xPos(t - 1);
            var prevY = yPos(data[t - 1]);
            var curX = xPos(t);
            var curY = yPos(data[t]);
            var cpx = (prevX + curX) / 2;
            ctx.bezierCurveTo(cpx, prevY, cpx, curY, curX, curY);
          }
        }
        ctx.stroke();
      });

      canvas._chartParams = { padL: padL, padR: padR, padT: padT, padB: padB, chartW: chartW, chartH: chartH, n: n, displayW: displayW, displayH: displayH };
    }

    draw();

    // Populate timeline legend
    var legend = $('timeline-legend', suffix);
    if (legend) {
      legend.innerHTML = '';
      NETWORKS.forEach(function (net) {
        var item = document.createElement('span');
        item.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:2px 8px;font-size:11px;font-weight:500;color:var(--text-secondary);';
        var dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;background:' + net.color + ';';
        item.appendChild(dot);
        item.appendChild(document.createTextNode(net.id));
        legend.appendChild(item);
      });
    }

    // Canvas Mouse tooltip tracking
    if (tooltip) {
      canvas.addEventListener('mousemove', function (e) {
        var params = canvas._chartParams;
        if (!params) return;
        var rect = canvas.getBoundingClientRect();
        var mx = e.clientX - rect.left;
        var my = e.clientY - rect.top;
        if (mx < params.padL || mx > params.padL + params.chartW || my < params.padT || my > params.padT + params.chartH) {
          tooltip.classList.add('hidden');
          return;
        }
        var t = Math.round(((mx - params.padL) / params.chartW) * (params.n - 1));
        t = clamp(t, 0, params.n - 1);

        var html = '<strong style="margin-bottom:4px;display:block;">t = ' + t + 's</strong>';
        NETWORKS.forEach(function (net) {
          var val = perSecond[net.id][t] || 0;
          html += '<div style="display:flex;align-items:center;gap:6px;font-size:11px;line-height:1.4;">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:' + net.color + ';display:inline-block;"></span>' +
            '<span style="width:36px;font-weight:600;">' + net.id + '</span>' +
            '<span>' + (val * 100).toFixed(1) + '%</span></div>';
        });
        tooltip.innerHTML = html;
        tooltip.classList.remove('hidden');
        tooltip.style.left = (mx + 16) + 'px';
        tooltip.style.top = (my - 10) + 'px';
      });

      canvas.addEventListener('mouseleave', function () {
        tooltip.classList.add('hidden');
      });
    }

    // Dynamic resize binding
    window.addEventListener('resize', function () {
      draw();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 10: CREATOR INSIGHTS
  // ═══════════════════════════════════════════════════════════════
  function renderInsights(summary, viralityResult, suffix) {
    var grid = $('insights-grid', suffix);
    if (!grid) return;
    grid.innerHTML = '';

    var insights = [];

    // 1. Hook Strength (always)
    var naccVal = viralityResult.onsetNAcc;
    if (naccVal > 0.65) {
      insights.push({
        icon: '🎯', tag: 'Hook', color1: '#ec4899', color2: '#f59e0b',
        title: 'Powerful Hook Detected',
        body: 'Your hook is strong — NAcc spikes at ' + (naccVal * 100).toFixed(1) + '% in the first 4 seconds, signaling high anticipatory reward.',
      });
    } else if (naccVal < 0.4) {
      insights.push({
        icon: '⚠️', tag: 'Hook', color1: '#ef4444', color2: '#f59e0b',
        title: 'Weak Opening Hook',
        body: 'Your opening lacks punch — NAcc activation is only ' + (naccVal * 100).toFixed(1) + '%. Add a visual surprise, bold color, or upbeat audio in the first 2 seconds.',
      });
    } else {
      insights.push({
        icon: '💡', tag: 'Hook', color1: '#f59e0b', color2: '#22c55e',
        title: 'Moderate Hook Strength',
        body: 'Moderate hook strength at ' + (naccVal * 100).toFixed(1) + '%. Consider adding a pattern interrupt or emotional trigger in the first 4 seconds.',
      });
    }

    // 2. Threat Avoidance (always)
    var ainsVal = viralityResult.onsetAIns;
    if (ainsVal < 0.3) {
      insights.push({
        icon: '✅', tag: 'Affect', color1: '#22c55e', color2: '#14b8a6',
        title: 'Low Negative-Affect Signal',
        body: 'Low negative-affect signal — viewers won\'t click away. This is ideal per the AIM framework.',
      });
    } else if (ainsVal > 0.55) {
      insights.push({
        icon: '🚨', tag: 'Affect', color1: '#ef4444', color2: '#ec4899',
        title: 'High Anterior Insula Activation',
        body: '⚠️ High anterior insula activation (' + (ainsVal * 100).toFixed(1) + '%) in the opening. Reduce jarring cuts, sudden loudness, or aversive imagery.',
      });
    } else {
      insights.push({
        icon: '🔍', tag: 'Affect', color1: '#f59e0b', color2: '#ef4444',
        title: 'Moderate Negative Affect',
        body: 'AIns is moderate. Review your opening for any unintentionally negative elements.',
      });
    }

    // 3. Face Engagement
    if (summary.FFA > 0.5) {
      insights.push({
        icon: '👤', tag: 'Visual', color1: '#8b5cf6', color2: '#3b82f6',
        title: 'Strong Face Presence',
        body: 'Strong face presence detected (FFA=' + (summary.FFA * 100).toFixed(1) + '%). Faces are one of the most attention-capturing features — leverage close-ups and direct eye contact.',
      });
    }

    // 4. Scene Richness
    if (summary.PPA > 0.5) {
      insights.push({
        icon: '🏞️', tag: 'Visual', color1: '#06b6d4', color2: '#22c55e',
        title: 'Rich Environmental Detail',
        body: 'Rich environmental detail (PPA=' + (summary.PPA * 100).toFixed(1) + '%). Your scene composition activates the parahippocampal place area — this draws viewers into the setting.',
      });
    }

    // 5. Language Depth
    if (summary.LANG > 0.5) {
      insights.push({
        icon: '📝', tag: 'Language', color1: '#f59e0b', color2: '#ec4899',
        title: 'Strong Syntactic Depth',
        body: 'Your script has strong syntactic depth (Language=' + (summary.LANG * 100).toFixed(1) + '%), engaging Broca\'s and Wernicke\'s areas. This keeps audiences cognitively invested.',
      });
    }

    // 6. Social/Self-Reference
    if (summary.DMN > 0.5) {
      insights.push({
        icon: '🧠', tag: 'Social', color1: '#22c55e', color2: '#3b82f6',
        title: 'High Self-Referential Content',
        body: 'High self-referential content (DMN=' + (summary.DMN * 100).toFixed(1) + '%). Personal pronouns and social language activate the default mode network, making viewers relate to your content.',
      });
    }

    // 7. Motion Energy
    if (summary.EBA > 0.5) {
      insights.push({
        icon: '🏃', tag: 'Motion', color1: '#a855f7', color2: '#ec4899',
        title: 'High Motion Detected',
        body: 'High motion detected (EBA=' + (summary.EBA * 100).toFixed(1) + '%). Dynamic movement activates the extrastriate body area, keeping visual attention locked.',
      });
    }

    // 8. Audio Engagement
    if (summary.STS > 0.5) {
      insights.push({
        icon: '🎧', tag: 'Audio', color1: '#14b8a6', color2: '#06b6d4',
        title: 'Strong Auditory Engagement',
        body: 'Strong auditory engagement (STS=' + (summary.STS * 100).toFixed(1) + '%). Your audio has rich prosody that activates the superior temporal sulcus — critical for storytelling.',
      });
    }

    // Append beautiful flex cards
    insights.forEach(function (ins) {
      var card = document.createElement('div');
      card.className = 'insight-card glass-card';

      var iconDiv = document.createElement('div');
      iconDiv.className = 'insight-icon';
      iconDiv.style.background = 'linear-gradient(135deg, ' + ins.color1 + ', ' + ins.color2 + ')';
      iconDiv.textContent = ins.icon;

      var tag = document.createElement('span');
      tag.className = 'insight-tag';
      tag.textContent = ins.tag;

      var title = document.createElement('h4');
      title.className = 'insight-title';
      title.textContent = ins.title;

      var body = document.createElement('p');
      body.className = 'insight-body';
      body.textContent = ins.body;

      card.appendChild(iconDiv);
      card.appendChild(tag);
      card.appendChild(title);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 11: AIM BREAKDOWN DISPLAY
  // ═══════════════════════════════════════════════════════════════
  function renderAIMBreakdown(viralityResult, suffix) {
    var naccBar = $('aim-nacc-bar', suffix);
    var naccVal = $('aim-nacc-value', suffix);
    var ainsBar = $('aim-ains-bar', suffix);
    var ainsVal = $('aim-ains-value', suffix);
    var engBar = $('aim-engagement-bar', suffix);
    var engVal = $('aim-engagement-value', suffix);

    if (naccVal) naccVal.textContent = (viralityResult.onsetNAcc * 100).toFixed(1) + '%';
    if (ainsVal) ainsVal.textContent = (viralityResult.onsetAIns * 100).toFixed(1) + '%';
    if (engVal) engVal.textContent = (viralityResult.sustained * 100).toFixed(1) + '%';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (naccBar) naccBar.style.width = (viralityResult.onsetNAcc * 100) + '%';
        if (ainsBar) ainsBar.style.width = (viralityResult.onsetAIns * 100) + '%';
        if (engBar) engBar.style.width = (viralityResult.sustained * 100) + '%';
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 12: ARCHETYPE MATCHING & PERCENTILE
  // ═══════════════════════════════════════════════════════════════
  function cosineSimilarity(a, b) {
    var keys = Object.keys(a);
    var dotProduct = 0, magA = 0, magB = 0;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var va = a[k] || 0, vb = b[k] || 0;
      dotProduct += va * vb;
      magA += va * va;
      magB += vb * vb;
    }
    return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-8);
  }

  function findClosestArchetype(summary) {
    var fp = {};
    NETWORKS.forEach(function (n) { fp[n.id] = summary[n.id] || 0; });
    var best = null, bestSim = -1;
    var ranked = ARCHETYPES.map(function (arch) {
      var sim = cosineSimilarity(fp, arch.fingerprint);
      if (sim > bestSim) { bestSim = sim; best = arch; }
      return { archetype: arch, similarity: sim };
    });
    ranked.sort(function (a, b) { return b.archetype.refScore - a.archetype.refScore; });
    return { closest: best, similarity: bestSim, ranked: ranked };
  }

  function computePercentile(score) {
    var below = 0;
    ARCHETYPES.forEach(function (a) { if (a.refScore < score) below++; });
    return Math.round((below / ARCHETYPES.length) * 100);
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 13: TL;DR, LEVER, TIPS, EVIDENCE, REGIONS, ANNOTATIONS
  // ═══════════════════════════════════════════════════════════════
  function generateTLDR(score) {
    if (score >= 80) return { tag: 'Hyperviral', text: 'This pattern matches the top of the archetype library \u2014 early reward bursts plus low aversion are the rare combo that scales out-of-sample to mass-share territory.' };
    if (score >= 60) return { tag: 'Strong Signal', text: 'Solid engagement signal with room to grow. The core neural pattern is there \u2014 optimize the first 4 seconds to push into hyperviral range.' };
    if (score >= 40) return { tag: 'Mixed Signal', text: 'Mixed signal. Some networks are engaged, but the reward-onset punch isn\u2019t strong enough to predict reliable spread.' };
    return { tag: 'Weak Signal', text: 'Weak viral signal across all networks. The content needs structural changes to trigger the reward-aversion pattern that drives sharing.' };
  }

  function findBiggestLever(summary, viralityResult) {
    if (viralityResult.onsetNAcc < 0.5) return { title: 'Early reward burst', subtitle: 'First 1.5 s payoff', body: 'In Stanford\u2019s neuroforecasting work, the top-decile NAcc-onset videos also captured the top-decile of YouTube view counts. Strengthen the visual payoff or audio hook in the first 2 seconds.' };
    if (viralityResult.onsetAIns > 0.5) return { title: 'Reduce aversion', subtitle: 'Lower AIns signal', body: 'High anterior insula activation drives scroll-away behaviour. Remove jarring cuts, sudden loudness spikes, or visually aversive elements in the opening.' };
    if (summary.FFA < 0.3) return { title: 'Add face presence', subtitle: 'FFA activation gap', body: 'Faces are the strongest parasocial driver. Add close-up face shots or direct eye-contact moments to activate the fusiform face area.' };
    if (viralityResult.sustained < 0.4) return { title: 'Pacing & variety', subtitle: 'Mid-content energy', body: 'Sustained engagement is low. Introduce pacing variety, scene changes, or escalating stakes in the middle section to maintain viewer investment.' };
    return { title: 'Polish the hook', subtitle: 'Value-framing channel', body: 'At this score, marginal gains come from the value-framing channel. A sharper, more specific text hook on the first overlay ties your video to a clearer reward expectation.' };
  }

  function generateTips(summary, viralityResult, closestArch) {
    var tips = [];
    var headroom = 100 - viralityResult.score;

    if (viralityResult.onsetNAcc < 0.6) {
      var pts = Math.min(8, Math.round((0.7 - viralityResult.onsetNAcc) * 15));
      tips.push({ num: 1, type: 'Structure', points: '+' + pts + 'pts', pointsClass: 'positive', title: 'Strengthen the opening hook', body: 'Your NAcc onset is at ' + (viralityResult.onsetNAcc * 100).toFixed(0) + '%. Add a visual surprise, bold color burst, or upbeat audio stinger in the first 2 seconds to boost reward-circuit activation.' });
    } else {
      tips.push({ num: 1, type: 'Polish', points: '+' + Math.min(3, Math.round(headroom * 0.1)) + 'pts', pointsClass: 'positive', title: 'Punch up the title-card / first text overlay', body: 'At this score, marginal gains come from the value-framing channel. A sharper, more specific text hook on the first overlay ties your video to a clearer reward expectation.' });
    }

    if (viralityResult.onsetNAcc > 0.6) {
      tips.push({ num: 2, type: 'Defense', points: 'hold', pointsClass: 'hold', title: 'Protect what\u2019s working: keep the cold open intact', body: 'Your opener is doing the heavy lifting. When editing for length, trim from the middle, not the first 4 seconds \u2014 those are where the score is earned.' });
    } else if (viralityResult.onsetAIns > 0.45) {
      var pts2 = Math.min(5, Math.round(viralityResult.onsetAIns * 8));
      tips.push({ num: 2, type: 'Structure', points: '+' + pts2 + 'pts', pointsClass: 'positive', title: 'Reduce opening aversion', body: 'AIns is at ' + (viralityResult.onsetAIns * 100).toFixed(0) + '% in the onset zone. Remove jarring cuts, lower sudden volume spikes, and avoid dark/red-dominant frames in the first 4 seconds.' });
    } else {
      tips.push({ num: 2, type: 'Defense', points: 'hold', pointsClass: 'hold', title: 'Aversion is already low \u2014 maintain this', body: 'Your AIns signal is below the scroll-away threshold. Keep the opening clean and frictionless.' });
    }

    return { tips: tips, headroom: Math.min(headroom, tips.reduce(function (s, t) { var m = t.points.match(/\d+/); return s + (m ? parseInt(m[0]) : 0); }, 0)) };
  }

  function generateEvidence(summary, viralityResult) {
    var evidence = [];
    evidence.push({
      network: 'NAcc', color: '#ec4899',
      label: 'Reward \u00b7 NAcc',
      title: viralityResult.onsetNAcc > 0.6 ? 'Strong opening payoff' : 'Weak opening payoff',
      body: viralityResult.onsetNAcc > 0.6
        ? 'The first ~4 seconds light up reward circuitry \u2014 exactly the window Stanford\u2019s neuroforecasting work showed scales out-of-sample to YouTube view counts.'
        : 'Reward circuitry isn\u2019t sufficiently activated at onset. The AIM framework shows this is the primary driver of viral spread.'
    });
    evidence.push({
      network: 'AIns', color: '#ef4444',
      label: 'Aversion \u00b7 AIns',
      title: viralityResult.onsetAIns < 0.35 ? 'Low friction, easy entry' : 'Elevated aversion signal',
      body: viralityResult.onsetAIns < 0.35
        ? 'Aversion sits below baseline. Viewers stay through the threshold where most scrolling happens.'
        : 'Anterior insula activation is elevated \u2014 some viewers may disengage before the hook lands.'
    });
    var socialAvg = (summary.FFA + summary.STS) / 2;
    if (socialAvg > 0.4) {
      evidence.push({
        network: 'FFA', color: '#8b5cf6',
        label: 'Social \u00b7 FFA + STS',
        title: 'Parasocial pull is engaged',
        body: 'Faces and biological motion drive STS \u2014 the social-cognition node \u2014 keeping viewers psychologically in the room.'
      });
    }
    if (summary.LANG > 0.45) {
      evidence.push({
        network: 'LANG', color: '#f59e0b',
        label: 'Language \u00b7 Broca/Wernicke',
        title: 'Narrative engagement active',
        body: 'Language network activation indicates the script or narration has sufficient syntactic depth to sustain cognitive investment.'
      });
    }
    return evidence;
  }

  function renderTLDR(viralityResult, suffix) {
    var tldr = generateTLDR(viralityResult.score);
    var tagEl = $('tldr-tag', suffix);
    var bodyEl = $('tldr-body', suffix);
    if (tagEl) tagEl.textContent = tldr.tag;
    if (bodyEl) bodyEl.textContent = tldr.text;
  }

  function renderScoreHero(summary, viralityResult, suffix) {
    var archMatch = findClosestArchetype(summary);
    var percentile = computePercentile(viralityResult.score);

    var scoreVal = $('score-hero-value', suffix);
    var pctVal = $('percentile-value', suffix);
    var archName = $('archetype-match-name', suffix);
    var archRef = $('archetype-match-ref', suffix);
    var scoreTag = $('score-tag-line', suffix);
    
    if (scoreVal) scoreVal.textContent = viralityResult.score;
    if (pctVal) pctVal.textContent = percentile + 'th';
    if (archName) archName.textContent = archMatch.closest.name;
    if (archRef) archRef.textContent = 'reference score ' + archMatch.closest.refScore + ' / 100';

    var tagLine = viralityResult.score >= 75 ? 'Reward circuitry lights up at onset, with low aversion. Strongest neural pattern for spread.'
      : viralityResult.score >= 50 ? 'Moderate reward signal with room for optimization in the onset window.'
      : 'Neural engagement pattern needs strengthening for viral potential.';
    if (scoreTag) scoreTag.textContent = tagLine;

    var miniNacc = $('aim-mini-nacc', suffix);
    var miniAins = $('aim-mini-ains', suffix);
    var miniMpfc = $('aim-mini-mpfc', suffix);
    var miniPcc = $('aim-mini-pcc', suffix);

    if (miniNacc) miniNacc.textContent = Math.round(viralityResult.onsetNAcc * 100) + '%';
    if (miniAins) miniAins.textContent = Math.round(viralityResult.onsetAIns * 100) + '%';
    if (miniMpfc) miniMpfc.textContent = Math.round((summary.DMN || 0) * 100) + '%';
    if (miniPcc) miniPcc.textContent = Math.round((summary.LANG || 0) * 100) + '%';

    var lever = findBiggestLever(summary, viralityResult);
    var leverTitle = $('lever-title', suffix);
    var leverBody = $('lever-body', suffix);
    if (leverTitle) leverTitle.textContent = lever.title;
    if (leverBody) leverBody.textContent = lever.body;

    return archMatch;
  }

  function renderRegionList(summary, suffix) {
    var container = $('region-list', suffix);
    if (!container) return;
    container.innerHTML = '';
    var entries = NETWORKS.map(function (n) {
      var val = summary[n.id] || 0;
      var display = Math.round((val - 0.25) * 133);
      return { id: n.id, name: n.name, color: n.color, val: val, display: display };
    });
    entries.sort(function (a, b) { return Math.abs(b.display) - Math.abs(a.display); });
    entries.forEach(function (e) {
      var row = document.createElement('div');
      row.className = 'region-row';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.fontSize = '0.8rem';
      row.style.padding = '0.2rem 0';
      row.style.borderBottom = '1px solid rgba(0,0,0,0.03)';

      var left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '0.5rem';

      var dot = document.createElement('div');
      dot.className = 'region-dot';
      dot.style.background = e.color;
      dot.style.width = '6px';
      dot.style.height = '6px';
      dot.style.borderRadius = '50%';

      var name = document.createElement('span');
      name.textContent = e.name;
      name.style.fontWeight = '500';
      name.style.color = 'var(--text-secondary)';

      left.appendChild(dot);
      left.appendChild(name);

      var valSpan = document.createElement('span');
      valSpan.className = 'region-value ' + (e.display >= 0 ? 'positive' : 'negative');
      valSpan.textContent = (e.display >= 0 ? '+' : '') + e.display + '%';
      valSpan.style.fontFamily = 'var(--font-mono)';
      valSpan.style.fontWeight = '600';
      valSpan.style.fontSize = '0.75rem';
      valSpan.style.color = e.display >= 0 ? 'var(--clr-success)' : 'var(--clr-danger)';

      row.appendChild(left);
      row.appendChild(valSpan);
      container.appendChild(row);
    });
  }

  function renderEvidenceSection(summary, viralityResult, suffix) {
    var evidence = generateEvidence(summary, viralityResult);
    var grid = $('evidence-grid', suffix);
    if (!grid) return;
    grid.innerHTML = '';
    evidence.forEach(function (ev, i) {
      var card = document.createElement('div');
      card.className = 'evidence-card';
      card.style.cssText = 'background:#ffffff; border:1px solid rgba(0,0,0,0.05); border-left:4px solid ' + ev.color + '; border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; gap:4px;';
      card.style.animationDelay = (i * 0.1) + 's';
      card.innerHTML = '<div class="evidence-label" style="color:' + ev.color + '; font-size:0.68rem; font-weight:700; text-transform:uppercase;">' + ev.label + '</div>' +
        '<div class="evidence-title" style="font-size:0.88rem; font-weight:700; color:var(--text-primary);">' + ev.title + '</div>' +
        '<div class="evidence-body" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.45;">' + ev.body + '</div>';
      grid.appendChild(card);
    });
  }

  function renderArchetypeTable(viralityResult, archMatch, suffix) {
    var table = $('archetype-table', suffix);
    if (!table) return;
    table.innerHTML = '';
    
    // Insert current content benchmark row
    var contentRow = document.createElement('div');
    contentRow.className = 'archetype-row current-content';
    contentRow.style.cssText = 'background:rgba(124,77,255,0.06); border:1px solid rgba(124,77,255,0.15); border-radius:var(--radius-md); padding:0.75rem 1rem; display:flex; justify-content:space-between; align-items:center;';
    contentRow.innerHTML = '<div class="archetype-info"><div class="archetype-name" style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">This Video</div><div class="archetype-desc" style="font-size:0.75rem; color:var(--text-muted);">(your analyzed content)</div></div><div class="archetype-score-badge" style="font-family:var(--font-mono); font-size:1.1rem; font-weight:800; color:var(--clr-violet);">' + viralityResult.score + '</div>';
    
    var inserted = false;
    ARCHETYPES.forEach(function (arch) {
      if (!inserted && viralityResult.score >= arch.refScore) {
        table.appendChild(contentRow);
        inserted = true;
      }
      var row = document.createElement('div');
      row.className = 'archetype-row' + (arch === archMatch.closest ? ' active' : '');
      row.style.cssText = 'border:1px solid rgba(0,0,0,0.03); border-radius:var(--radius-md); padding:0.6rem 1rem; display:flex; justify-content:space-between; align-items:center; background:#ffffff;';
      if (arch === archMatch.closest) {
        row.style.borderColor = 'rgba(124,77,255,0.15)';
        row.style.background = 'rgba(124,77,255,0.02)';
      }
      row.innerHTML = '<div class="archetype-info"><div class="archetype-name" style="font-size:0.85rem; font-weight:600; color:var(--text-primary);">' + arch.name + '</div><div class="archetype-desc" style="font-size:0.75rem; color:var(--text-muted);">' + arch.desc + '</div></div><div class="archetype-score-badge" style="font-family:var(--font-mono); font-size:0.95rem; font-weight:700; color:var(--text-secondary);">' + arch.refScore + '</div>';
      table.appendChild(row);
    });
    if (!inserted) table.appendChild(contentRow);
  }

  function renderTips(summary, viralityResult, archMatch, suffix) {
    var result = generateTips(summary, viralityResult, archMatch.closest);
    var headroomValueEl = $('headroom-value', suffix);
    if (headroomValueEl) headroomValueEl.textContent = '+' + result.headroom + 'pts';
    
    var grid = $('tips-grid', suffix);
    if (!grid) return;
    grid.innerHTML = '';
    result.tips.forEach(function (tip, i) {
      var card = document.createElement('div');
      card.className = 'tip-card';
      card.style.cssText = 'background:#ffffff; border:1px solid rgba(0,0,0,0.05); border-radius:var(--radius-md); padding:1rem; display:flex; gap:0.75rem;';
      card.style.animationDelay = (i * 0.12) + 's';
      card.innerHTML = '<div class="tip-number" style="font-size:1.5rem; font-weight:800; color:var(--clr-violet); line-height:1;">' + tip.num + '</div>' +
        '<div class="tip-content" style="display:flex; flex-direction:column; gap:2px; flex-grow:1;">' +
          '<div class="tip-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;"><span class="tip-type" style="font-size:0.68rem; text-transform:uppercase; font-weight:700; color:var(--text-muted);">' + tip.type + '</span><span class="tip-points ' + tip.pointsClass + '" style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--clr-success);">' + tip.points + '</span></div>' +
          '<div class="tip-title" style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">' + tip.title + '</div>' +
          '<div class="tip-body" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.4;">' + tip.body + '</div>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function renderTimelineAnnotations(perSecond, duration, suffix) {
    var container = $('timeline-annotations', suffix);
    if (!container) return;
    container.innerHTML = '';
    if (duration <= 1) return;
    var naccArr = perSecond.NAcc || [];
    var ainsArr = perSecond.AIns || [];
    var dmnArr = perSecond.DMN || [];
    if (naccArr.length === 0) return;

    var peakNAccT = 0, peakNAccV = naccArr[0];
    for (var i = 1; i < naccArr.length; i++) { if (naccArr[i] > peakNAccV) { peakNAccV = naccArr[i]; peakNAccT = i; } }
    
    var lowAInsT = 0, lowAInsV = ainsArr[0] || 0;
    for (var j = 1; j < ainsArr.length; j++) { if ((ainsArr[j] || 0) < lowAInsV) { lowAInsV = ainsArr[j]; lowAInsT = j; } }
    
    var peakDMNT = 0, peakDMNV = dmnArr[0] || 0;
    for (var k = 1; k < dmnArr.length; k++) { if ((dmnArr[k] || 0) > peakDMNV) { peakDMNV = dmnArr[k]; peakDMNT = k; } }

    var annotations = [
      { time: peakNAccT, color: '#ec4899', title: 'Peak reward signal', body: 'NAcc activation hits ' + Math.round(peakNAccV * 100) + '% at this moment \u2014 the kind of payoff frame that drives shares.' },
      { time: lowAInsT, color: '#22c55e', title: 'Lowest aversion', body: 'Aversion drops to ' + Math.round((lowAInsV - 0.25) * 133) + '% \u2014 viewers feel safe, raising completion rate.' },
      { time: peakDMNT, color: '#f59e0b', title: 'Peak meaning / value', body: 'MPFC integration peaks here \u2014 the brain is computing \u201cis this worth my time?\u201d Land your message close to this moment.' },
    ];
    annotations.forEach(function (ann) {
      var el = document.createElement('div');
      el.className = 'timeline-annotation';
      el.style.cssText = 'border-left:3px solid ' + ann.color + '; padding-left:0.75rem; margin-bottom:0.25rem; display:flex; flex-direction:column; gap:1px;';
      el.innerHTML = '<div class="annotation-time" style="font-family:var(--font-mono); font-size:0.7rem; font-weight:700; color:' + ann.color + ';">t = ' + ann.time.toFixed(1) + 's</div>' +
        '<div class="annotation-title" style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">' + ann.title + '</div>' +
        '<div class="annotation-body" style="font-size:0.78rem; color:var(--text-secondary); line-height:1.45;">' + ann.body + '</div>';
      container.appendChild(el);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 14: PROCESSING ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════
  function setStepState(stepId, state, suffix) {
    var el = $(stepId, suffix);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (state) el.classList.add(state);
  }

  function setProgress(pct, suffix) {
    var fill = $('progress-bar-fill', suffix);
    var text = $('progress-pct', suffix);
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = Math.round(pct) + '%';
  }

  async function analyzeContent(input, mediaType, suffix, textPrompt) {
    var steps = ['step-ingest', 'step-visual', 'step-audio', 'step-text', 'step-mapping', 'step-scoring'];
    
    // Clear step state inside this specific bubble
    steps.forEach(function (id) {
      setStepState(id, null, suffix);
    });
    setProgress(0, suffix);

    try {
      if (engineMode === 'cloud') {
        if (!backendUrl) {
          alert('Please enter and save a valid Google Cloud Run URL first.');
          var drawer = $('settings-drawer');
          if (drawer) drawer.classList.add('active');
          
          var tracker = $('thinking-tracker', suffix);
          if (tracker) {
            tracker.innerHTML = '<div style="color:var(--clr-danger); padding:1rem; font-weight:600;">' +
              'Error: Cloud Run Service URL is not configured. Please open overrides panel to enter backend URL.</div>';
          }
          return;
        }

        setStepState('step-ingest', 'active', suffix);
        setProgress(5, suffix);

        try {
          var formData = new FormData();
          if (mediaType === 'text') {
            formData.append('text', input);
          } else {
            formData.append('file', input);
          }

          var progressInterval;
          var simulatedPct = 5;
          var activeStepIndex = 0;
          
          progressInterval = setInterval(function() {
            if (simulatedPct < 90) {
              simulatedPct += Math.random() * 4;
              setProgress(Math.min(90, simulatedPct), suffix);

              if (simulatedPct > 15 && activeStepIndex === 0) {
                setStepState('step-ingest', 'done', suffix);
                activeStepIndex = 1;
                setStepState(steps[activeStepIndex], 'active', suffix);
              } else if (simulatedPct > 45 && activeStepIndex === 1) {
                setStepState('step-visual', 'done', suffix);
                activeStepIndex = 2;
                setStepState(steps[activeStepIndex], 'active', suffix);
              } else if (simulatedPct > 65 && activeStepIndex === 2) {
                setStepState('step-audio', 'done', suffix);
                activeStepIndex = 3;
                setStepState(steps[activeStepIndex], 'active', suffix);
              } else if (simulatedPct > 75 && activeStepIndex === 3) {
                setStepState('step-text', 'done', suffix);
                activeStepIndex = 4;
                setStepState(steps[activeStepIndex], 'active', suffix);
              } else if (simulatedPct > 85 && activeStepIndex === 4) {
                setStepState('step-mapping', 'done', suffix);
                activeStepIndex = 5;
                setStepState(steps[activeStepIndex], 'active', suffix);
              }
            }
          }, 600);

          var headers = {};
          if (backendToken) {
            headers['Authorization'] = 'Bearer ' + backendToken;
          }

          var res = await fetch(backendUrl + '/analyze', {
            method: 'POST',
            body: formData,
            headers: headers
          });

          clearInterval(progressInterval);

          if (!res.ok) {
            var errorText = await res.text();
            throw new Error('Server returned error (' + res.status + '): ' + errorText);
          }

          var serverData = await res.json();
          
          steps.forEach(function (stepId) {
            setStepState(stepId, 'done', suffix);
          });
          setProgress(100, suffix);
          await delay(400);

          var networkResult = serverData.networkResult;
          var duration = serverData.duration;
          var mediaTypeReturned = serverData.mediaType;

          var viralityResult = computeViralityScore(networkResult.perSecond, duration);

          // Reveal Report & Hide Loader inside AI message bubble
          var tracker = $('thinking-tracker', suffix);
          var report = $('report-container', suffix);
          if (tracker) tracker.classList.add('hidden');
          if (report) report.classList.remove('hidden');

          renderTLDR(viralityResult, suffix);
          var archMatch = renderScoreHero(networkResult.summary, viralityResult, suffix);
          renderBrainMap(networkResult.summary, suffix);
          renderRegionList(networkResult.summary, suffix);
          renderNetworkBars(networkResult.summary, suffix);
          renderGauge(viralityResult, suffix);
          renderAIMBreakdown(viralityResult, suffix);

          var totalSeconds = Math.max(1, Math.floor(duration));
          if (totalSeconds > 1) {
            var timelineSect = $('timeline-section', suffix);
            if (timelineSect) timelineSect.classList.remove('hidden');
            renderTimeline(networkResult.perSecond, duration, suffix);
            renderTimelineAnnotations(networkResult.perSecond, duration, suffix);
          }

          renderEvidenceSection(networkResult.summary, viralityResult, suffix);
          var evidenceSect = $('evidence-section', suffix);
          if (evidenceSect) evidenceSect.classList.remove('hidden');

          renderArchetypeTable(viralityResult, archMatch, suffix);
          var archSect = $('archetype-section', suffix);
          if (archSect) archSect.classList.remove('hidden');

          renderTips(networkResult.summary, viralityResult, archMatch, suffix);
          var tipsSect = $('tips-section', suffix);
          if (tipsSect) tipsSect.classList.remove('hidden');

          renderInsights(networkResult.summary, viralityResult, suffix);
          var insightsSect = $('insights-section', suffix);
          if (insightsSect) insightsSect.classList.remove('hidden');

          var methodSect = $('methodology-section', suffix);
          if (methodSect) methodSect.classList.remove('hidden');

          scrollToBottom();
          return;

        } catch (err) {
          console.error('Cloud Run analysis failed:', err);
          clearInterval(progressInterval);
          var tracker = $('thinking-tracker', suffix);
          if (tracker) {
            tracker.innerHTML = '<div style="color:var(--clr-danger); padding:1rem; font-weight:600;">' +
              'Cloud Connection Error!<br><span style="font-size:0.8rem; font-weight:400; opacity:0.8;">' + escapeHtml(err.message) + '</span></div>';
          }
          return;
        }
      }

      // ─── Browser Simulation Mode ───
      var file = (mediaType !== 'text') ? input : null;
      var text = (mediaType === 'text') ? input : '';
      var duration = 1;
      var frames = [];
      var audioNetworks = null;

      setStepState('step-ingest', 'active', suffix);
      setProgress(5, suffix);
      await delay(300);

      var localObjectURL = null;
      if (file) {
        localObjectURL = URL.createObjectURL(file);
      }

      if (mediaType === 'video') {
        var videoEl = $('hidden-video');
        videoEl.src = localObjectURL;
        await new Promise(function (resolve, reject) {
          videoEl.onloadedmetadata = function () {
            duration = videoEl.duration;
            resolve();
          };
          videoEl.onerror = function () { reject(new Error('Failed to load video')); };
        });
      }

      setStepState('step-ingest', 'done', suffix);
      setProgress(15, suffix);

      setStepState('step-visual', 'active', suffix);
      setProgress(20, suffix);

      var visualData = { V1: [], FFA: [], EBA: [], PPA: [], reward: [], threat: [] };

      if (mediaType === 'video') {
        var videoEl = $('hidden-video');
        var hiddenCanvas = $('hidden-canvas');
        frames = await extractFrames(videoEl, hiddenCanvas, duration);

        var prevImageData = null;
        var prevGray = null;
        for (var i = 0; i < frames.length; i++) {
          var frame = frames[i];
          if (!frame) {
            visualData.V1.push(0.3);
            visualData.FFA.push(0.2);
            visualData.EBA.push(0.3);
            visualData.PPA.push(0.3);
            visualData.reward.push(0.3);
            visualData.threat.push(0.2);
            continue;
          }
          var gray = getGrayscale(frame);
          visualData.V1.push(analyzeV1(frame));
          visualData.FFA.push(analyzeFFA(frame));
          visualData.EBA.push(analyzeEBA(prevImageData, frame));
          visualData.PPA.push(analyzePPA(frame));
          visualData.reward.push(analyzeVisualRewardCue(frame));
          visualData.threat.push(analyzeVisualThreatCue(frame, prevGray, gray));
          prevImageData = frame;
          prevGray = gray;

          var framePct = 20 + (i / frames.length) * 25;
          setProgress(framePct, suffix);
          if (i % 5 === 0) await delay(0);
        }
      } else if (mediaType === 'image') {
        frames = await extractImageFrame(file);
        var frame = frames[0];
        if (frame) {
          var gray = getGrayscale(frame);
          visualData.V1.push(analyzeV1(frame));
          visualData.FFA.push(analyzeFFA(frame));
          visualData.EBA.push(0.3);
          visualData.PPA.push(analyzePPA(frame));
          visualData.reward.push(analyzeVisualRewardCue(frame));
          visualData.threat.push(analyzeVisualThreatCue(frame, null, gray));
        }
        setProgress(45, suffix);
      } else {
        setProgress(45, suffix);
      }

      setStepState('step-visual', 'done', suffix);
      setProgress(45, suffix);

      setStepState('step-audio', 'active', suffix);
      setProgress(50, suffix);
      await delay(200);

      if (mediaType === 'video' || mediaType === 'audio') {
        try {
          var audioBuffer = await decodeAudioFromFile(file);
          var audioPerSec = analyzeAudioPerSecond(audioBuffer);
          audioNetworks = mapAudioToNetworks(audioPerSec);
          if (mediaType === 'audio') {
            duration = audioBuffer.duration;
          }
        } catch (e) {
          console.warn('Audio analysis failed:', e.message);
        }
      }

      setStepState('step-audio', 'done', suffix);
      setProgress(65, suffix);

      setStepState('step-text', 'active', suffix);
      setProgress(70, suffix);
      await delay(200);

      var textToAnalyze = text || textPrompt;
      if (!textToAnalyze && file && file.name) {
        textToAnalyze = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      }

      var textScores = {
        lang: textToAnalyze ? analyzeLang(textToAnalyze) : 0.2,
        dmn: textToAnalyze ? analyzeDMN(textToAnalyze) : 0.2,
        nacc: textToAnalyze ? analyzeNAccText(textToAnalyze) : 0.2,
        ains: textToAnalyze ? analyzeAInsText(textToAnalyze) : 0.1,
      };

      setStepState('step-text', 'done', suffix);
      setProgress(80, suffix);

      setStepState('step-mapping', 'active', suffix);
      setProgress(82, suffix);
      await delay(300);

      var vFrames = {};
      Object.keys(visualData).forEach(function (key) {
        vFrames[key] = new Float32Array(visualData[key]);
      });

      var networkResult = mapToNetworks(vFrames, audioNetworks, textScores, duration);

      setStepState('step-mapping', 'done', suffix);
      setProgress(90, suffix);

      setStepState('step-scoring', 'active', suffix);
      setProgress(92, suffix);
      await delay(300);

      var viralityResult = computeViralityScore(networkResult.perSecond, duration);

      setStepState('step-scoring', 'done', suffix);
      setProgress(100, suffix);
      await delay(400);

      var tracker = $('thinking-tracker', suffix);
      var report = $('report-container', suffix);
      if (tracker) tracker.classList.add('hidden');
      if (report) report.classList.remove('hidden');

      renderTLDR(viralityResult, suffix);
      var archMatch = renderScoreHero(networkResult.summary, viralityResult, suffix);
      renderBrainMap(networkResult.summary, suffix);
      renderRegionList(networkResult.summary, suffix);
      renderNetworkBars(networkResult.summary, suffix);
      renderGauge(viralityResult, suffix);
      renderAIMBreakdown(viralityResult, suffix);

      var totalSeconds = Math.max(1, Math.floor(duration));
      if (totalSeconds > 1) {
        var timelineSect = $('timeline-section', suffix);
        if (timelineSect) timelineSect.classList.remove('hidden');
        renderTimeline(networkResult.perSecond, duration, suffix);
        renderTimelineAnnotations(networkResult.perSecond, duration, suffix);
      }

      renderEvidenceSection(networkResult.summary, viralityResult, suffix);
      var evidenceSect = $('evidence-section', suffix);
      if (evidenceSect) evidenceSect.classList.remove('hidden');

      renderArchetypeTable(viralityResult, archMatch, suffix);
      var archSect = $('archetype-section', suffix);
      if (archSect) archSect.classList.remove('hidden');

      renderTips(networkResult.summary, viralityResult, archMatch, suffix);
      var tipsSect = $('tips-section', suffix);
      if (tipsSect) tipsSect.classList.remove('hidden');

      renderInsights(networkResult.summary, viralityResult, suffix);
      var insightsSect = $('insights-section', suffix);
      if (insightsSect) insightsSect.classList.remove('hidden');

      var methodSect = $('methodology-section', suffix);
      if (methodSect) methodSect.classList.remove('hidden');

      scrollToBottom();

      if (mediaType === 'video') {
        $('hidden-video').src = '';
        $('hidden-video').load();
      }
      if (localObjectURL) {
        URL.revokeObjectURL(localObjectURL);
      }

    } catch (err) {
      console.error('Analysis failed:', err);
      var tracker = $('thinking-tracker', suffix);
      if (tracker) {
        tracker.innerHTML = '<div style="color:var(--clr-danger); padding:1rem; font-weight:600;">' +
          'Analysis Failed!<br><span style="font-size:0.8rem; font-weight:400; opacity:0.8;">' + escapeHtml(err.message) + '</span></div>';
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 15: INFERENCE ENGINE OVERRIDES & STATUS HEALTH BADGE
  // ═══════════════════════════════════════════════════════════════
  function initEngineSelector() {
    var urlInput = $('backend-url-input');
    var tokenInput = $('backend-token-input');
    var btnSave = $('btn-save-backend-url');
    var drawer = $('settings-drawer');

    var savedUrl = localStorage.getItem('tribe_backend_url') || getDefaultBackendUrl();
    var savedToken = localStorage.getItem('tribe_backend_token') || '';

    backendUrl = savedUrl;
    backendToken = savedToken;

    if (urlInput) urlInput.value = savedUrl;
    if (tokenInput) tokenInput.value = savedToken;

    if (btnSave) {
      btnSave.addEventListener('click', function () {
        var enteredUrl = urlInput.value.trim();
        if (enteredUrl.endsWith('/')) {
          enteredUrl = enteredUrl.slice(0, -1);
        }
        backendUrl = enteredUrl;
        localStorage.setItem('tribe_backend_url', enteredUrl);
        urlInput.value = enteredUrl;

        if (tokenInput) {
          var enteredToken = tokenInput.value.trim();
          backendToken = enteredToken;
          localStorage.setItem('tribe_backend_token', enteredToken);
          tokenInput.value = enteredToken;
        }
        
        // Hide panel overrides drawer
        if (drawer) drawer.classList.remove('active');

        checkServerStatus();
      });
    }

    checkServerStatus();
    setInterval(checkServerStatus, 15000);
  }

  var isCheckingStatus = false;
  async function checkServerStatus() {
    if (isCheckingStatus) return;
    var statusDot = $('server-status-dot');
    var statusText = $('server-status-text');
    if (!statusDot || !statusText) return;

    if (!backendUrl) {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Cloud Offline (No URL)';
      return;
    }

    isCheckingStatus = true;
    statusDot.className = 'status-dot checking';
    statusText.textContent = 'Checking Cloud...';

    try {
      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 5000);

      var headers = {};
      if (backendToken) {
        headers['Authorization'] = 'Bearer ' + backendToken;
      }

      var res = await fetch(backendUrl + '/status', { 
        signal: controller.signal,
        headers: headers
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        var data = await res.json();
        if (data && data.status === 'ready') {
          statusDot.className = 'status-dot online';
          statusText.textContent = 'Cloud Online';
        } else if (data && data.status === 'loading_error') {
          statusDot.className = 'status-dot checking';
          statusText.textContent = 'Model Loading Error';
        } else {
          statusDot.className = 'status-dot checking';
          statusText.textContent = 'Cloud Code: ' + res.status;
        }
      } else {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Cloud Error (' + res.status + ')';
      }
    } catch (e) {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Cloud Offline';
    } finally {
      isCheckingStatus = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION ENTRYPOINT
  // ═══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    initParticles();
    initChatComposer();
    initEngineSelector();
  });
})();
