/**
 * SakuraSensei AI - Japanese <-> Indonesian Translator
 * Client Logic & Web Speech Integration
 */

const state = {
  sourceLang: 'ja', // 'ja' or 'id'
  targetLang: 'id', // 'id' or 'ja'
  currentTheme: localStorage.getItem('sakura_theme') || 'sumi',
  history: JSON.parse(localStorage.getItem('sakura_trans_history') || '[]'),
  lastResult: null,
  isTranslating: false
};

const elements = {
  sourceText: document.getElementById('source-text'),
  targetOutput: document.getElementById('target-output'),
  charCount: document.getElementById('char-count'),
  btnSwapLang: document.getElementById('btn-swap-lang'),
  sourceFlag: document.getElementById('source-flag'),
  sourceLangName: document.getElementById('source-lang-name'),
  targetFlag: document.getElementById('target-flag'),
  targetLangName: document.getElementById('target-lang-name'),
  sourcePanelLabel: document.getElementById('source-panel-label'),
  targetPanelLabel: document.getElementById('target-panel-label'),
  formalitySelect: document.getElementById('formality-select'),
  btnClearSource: document.getElementById('btn-clear-source'),
  btnPasteSource: document.getElementById('btn-paste-source'),
  btnMicSource: document.getElementById('btn-mic-source'),
  btnListenSource: document.getElementById('btn-listen-source'),
  btnListenTarget: document.getElementById('btn-listen-target'),
  btnCopyTarget: document.getElementById('btn-copy-target'),
  btnSaveVocab: document.getElementById('btn-save-vocab'),
  btnDoTranslate: document.getElementById('btn-do-translate'),
  toggleFurigana: document.getElementById('toggle-furigana'),
  translationTime: document.getElementById('translation-time'),
  insightsContainer: document.getElementById('insights-container'),
  nuanceContent: document.getElementById('nuance-content'),
  breakdownTbody: document.getElementById('breakdown-tbody'),
  historyCard: document.getElementById('history-card'),
  historyList: document.getElementById('history-list'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  ollamaStatusPill: document.getElementById('ollama-status-pill'),
  ollamaStatusText: document.getElementById('ollama-status-text')
};

document.addEventListener('DOMContentLoaded', () => {
  initFallingSakura();
  initTheme();
  initEventListeners();
  renderHistory();
  checkHealth();
});

/* ==========================================================================
   Falling Sakura Canvas Animation
   ========================================================================== */
function initFallingSakura() {
  const canvas = document.getElementById('sakura-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const petals = [];
  const petalCount = 24;

  class Petal {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * -height;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 1.2 + 0.8;
      this.speedX = Math.random() * 1.5 - 0.75;
      this.angle = Math.random() * Math.PI * 2;
      this.angularSpeed = Math.random() * 0.02 - 0.01;
      this.opacity = Math.random() * 0.4 + 0.2;
      this.swing = Math.random() * 2;
    }
    update() {
      this.y += this.speedY;
      this.x += Math.sin(this.y * 0.01) * this.swing + this.speedX;
      this.angle += this.angularSpeed;
      if (this.y > height + 20 || this.x < -20 || this.x > width + 20) {
        this.reset();
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 183, 197, ${this.opacity})`;
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(this.size / 2, -this.size / 2, this.size, 0, 0, this.size * 1.5);
      ctx.bezierCurveTo(-this.size, 0, -this.size / 2, -this.size / 2, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < petalCount; i++) {
    const p = new Petal();
    p.y = Math.random() * height;
    petals.push(p);
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    for (const p of petals) {
      p.update();
      p.draw();
    }
    requestAnimationFrame(animate);
  }
  animate();
}

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  applyTheme(state.currentTheme);
}

function applyTheme(theme) {
  document.body.classList.remove('theme-sakura-light', 'theme-cyber');
  if (theme === 'sakura') {
    document.body.classList.add('theme-sakura-light');
    elements.themeIcon.textContent = '🌸';
  } else if (theme === 'cyber') {
    document.body.classList.add('theme-cyber');
    elements.themeIcon.textContent = '⚡';
  } else {
    elements.themeIcon.textContent = '🌙';
  }
  state.currentTheme = theme;
  localStorage.setItem('sakura_theme', theme);
}

function cycleTheme() {
  if (state.currentTheme === 'sumi') applyTheme('sakura');
  else if (state.currentTheme === 'sakura') applyTheme('cyber');
  else applyTheme('sumi');
}

/* ==========================================================================
   Health Check
   ========================================================================== */
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.ollama_connected) {
      elements.ollamaStatusPill.classList.remove('offline');
      elements.ollamaStatusText.textContent = `Model: ${data.default_model || 'Ollama Cloud'}`;
    } else {
      elements.ollamaStatusPill.classList.add('offline');
      elements.ollamaStatusText.textContent = 'Ollama: Offline';
    }
  } catch (e) {
    elements.ollamaStatusPill.classList.add('offline');
    elements.ollamaStatusText.textContent = 'Ollama: Offline';
  }
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */
function initEventListeners() {
  // Character counter
  elements.sourceText.addEventListener('input', () => {
    const len = elements.sourceText.value.length;
    elements.charCount.textContent = `${len} / 2000`;
  });

  // Shortcut Ctrl+Enter / Cmd+Enter
  elements.sourceText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeTranslation();
    }
  });

  // Translate Button
  elements.btnDoTranslate.addEventListener('click', executeTranslation);

  // Swap Languages Button
  elements.btnSwapLang.addEventListener('click', swapLanguages);

  // Clear Source Text
  elements.btnClearSource.addEventListener('click', () => {
    elements.sourceText.value = '';
    elements.charCount.textContent = '0 / 2000';
    elements.sourceText.focus();
  });

  // Paste from Clipboard
  elements.btnPasteSource.addEventListener('click', async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        elements.sourceText.value = clipText;
        elements.charCount.textContent = `${clipText.length} / 2000`;
        executeTranslation();
      }
    } catch (err) {
      alert('Tidak dapat mengakses clipboard secara otomatis. Silakan tekan Ctrl+V.');
    }
  });

  // Copy Target Translation
  elements.btnCopyTarget.addEventListener('click', () => {
    if (!state.lastResult || !state.lastResult.translation) return;
    navigator.clipboard.writeText(state.lastResult.translation);
    elements.btnCopyTarget.textContent = '✅ Tersalin';
    setTimeout(() => (elements.btnCopyTarget.textContent = '📋 Salin'), 2000);
  });

  // Listen to Source Text
  elements.btnListenSource.addEventListener('click', () => {
    const text = elements.sourceText.value.trim();
    if (text) speakText(text, state.sourceLang);
  });

  // Listen to Target Text
  elements.btnListenTarget.addEventListener('click', () => {
    if (state.lastResult && state.lastResult.translation) {
      speakText(state.lastResult.translation, state.targetLang);
    }
  });

  // Voice Input (Speech-to-Text)
  elements.btnMicSource.addEventListener('click', handleSpeechRecognition);

  // Furigana toggle
  elements.toggleFurigana.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.body.classList.remove('hide-furigana');
    } else {
      document.body.classList.add('hide-furigana');
    }
  });

  // Theme Toggle
  elements.themeToggle.addEventListener('click', cycleTheme);

  // Save to Vocabulary Notebook
  elements.btnSaveVocab.addEventListener('click', handleSaveVocab);

  // Clear History
  elements.btnClearHistory.addEventListener('click', () => {
    if (confirm('Hapus seluruh riwayat terjemahan?')) {
      state.history = [];
      localStorage.setItem('sakura_trans_history', '[]');
      renderHistory();
    }
  });

  // Example Chips
  document.querySelectorAll('.example-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const text = chip.dataset.text;
      if (text) {
        // If text contains Japanese characters, set source to JA, otherwise ID
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
        if (hasJapanese && state.sourceLang !== 'ja') {
          swapLanguages();
        } else if (!hasJapanese && state.sourceLang !== 'id') {
          swapLanguages();
        }
        elements.sourceText.value = text;
        elements.charCount.textContent = `${text.length} / 2000`;
        executeTranslation();
      }
    });
  });

  // Mobile Bottom Navigation actions
  const mobNavSwap = document.getElementById('mob-nav-swap');
  if (mobNavSwap) {
    mobNavSwap.addEventListener('click', swapLanguages);
  }
  const mobNavListen = document.getElementById('mob-nav-listen');
  if (mobNavListen) {
    mobNavListen.addEventListener('click', () => {
      elements.btnListenTarget.click();
    });
  }
  const mobNavSave = document.getElementById('mob-nav-save');
  if (mobNavSave) {
    mobNavSave.addEventListener('click', handleSaveVocab);
  }
}

/* ==========================================================================
   Swap Languages
   ========================================================================== */
function swapLanguages() {
  const oldSource = state.sourceLang;
  state.sourceLang = state.targetLang;
  state.targetLang = oldSource;

  if (state.sourceLang === 'ja') {
    elements.sourceFlag.textContent = '🇯🇵';
    elements.sourceLangName.textContent = 'Bahasa Jepang';
    elements.targetFlag.textContent = '🇮🇩';
    elements.targetLangName.textContent = 'Bahasa Indonesia';
    elements.sourcePanelLabel.textContent = 'Teks Bahasa Jepang';
    elements.targetPanelLabel.textContent = 'Hasil Terjemahan Bahasa Indonesia';
    elements.sourceText.placeholder = 'Ketik atau tempel teks bahasa Jepang di sini...';
  } else {
    elements.sourceFlag.textContent = '🇮🇩';
    elements.sourceLangName.textContent = 'Bahasa Indonesia';
    elements.targetFlag.textContent = '🇯🇵';
    elements.targetLangName.textContent = 'Bahasa Jepang';
    elements.sourcePanelLabel.textContent = 'Teks Bahasa Indonesia';
    elements.targetPanelLabel.textContent = 'Hasil Terjemahan Bahasa Jepang';
    elements.sourceText.placeholder = 'Ketik atau tempel teks bahasa Indonesia di sini...';
  }

  // Swap content if target already has translation
  if (state.lastResult && state.lastResult.translation) {
    elements.sourceText.value = state.lastResult.translation;
    elements.charCount.textContent = `${state.lastResult.translation.length} / 2000`;
    executeTranslation();
  }
}

/* ==========================================================================
   Translation Core
   ========================================================================== */
async function executeTranslation() {
  const text = elements.sourceText.value.trim();
  if (!text || state.isTranslating) return;

  state.isTranslating = true;
  elements.btnDoTranslate.disabled = true;
  elements.btnDoTranslate.innerHTML = '<span>Menerjemahkan...</span>';

  elements.targetOutput.classList.remove('placeholder');
  elements.targetOutput.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-style: italic;">
      <span class="typing-dot" style="display:inline-block;"></span>
      <span>🌸 SakuraSensei sedang menganalisis & menerjemahkan...</span>
    </div>
  `;
  elements.translationTime.textContent = 'Memproses AI...';

  const t0 = performance.now();

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        source_lang: state.sourceLang,
        target_lang: state.targetLang,
        formality: elements.formalitySelect.value
      })
    });

    const json = await res.json();
    const data = json.data;
    state.lastResult = data;

    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
    elements.translationTime.textContent = `Selesai dalam ${elapsed}s via Ollama`;

    // Render output
    renderTranslationResult(data);

    // Save to history
    saveToHistory(text, data.translation);

  } catch (err) {
    elements.targetOutput.innerHTML = `<span style="color: #ef4444;">⚠️ Gagal menerjemahkan: ${err.message}</span>`;
    elements.translationTime.textContent = 'Gagal';
  } finally {
    state.isTranslating = false;
    elements.btnDoTranslate.disabled = false;
    elements.btnDoTranslate.innerHTML = `
      <span>Terjemahkan Sekarang</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    `;
  }
}

function renderTranslationResult(data) {
  let mainHtml = '';

  // If target is Japanese and furigana is provided, render ruby
  if (state.targetLang === 'ja' && data.furigana) {
    mainHtml = renderFuriganaTags(data.furigana);
  } else {
    mainHtml = escapeHtml(data.translation);
  }

  // Include Romaji subtitle if available
  let romajiHtml = '';
  if (data.romaji) {
    romajiHtml = `
      <div class="romaji-badge-container">
        <b>Romaji:</b> ${escapeHtml(data.romaji)}
      </div>
    `;
  }

  elements.targetOutput.innerHTML = `
    <div>${mainHtml}</div>
    ${romajiHtml}
  `;

  // Render Nuance & Linguistic Breakdown
  if (data.nuance || (data.breakdown && data.breakdown.length > 0)) {
    elements.insightsContainer.style.display = 'flex';
    elements.nuanceContent.innerHTML = `💡 <b>Nuansa & Kesopanan:</b> ${escapeHtml(data.nuance || 'Bahasa alami standar.')}`;

    elements.breakdownTbody.innerHTML = '';
    if (data.breakdown && data.breakdown.length > 0) {
      data.breakdown.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="breakdown-jp">${escapeHtml(item.word || '')}</span></td>
          <td><span class="breakdown-reading">${escapeHtml(item.reading || '')}</span></td>
          <td>${escapeHtml(item.meaning || '')}</td>
        `;
        elements.breakdownTbody.appendChild(tr);
      });
    } else {
      elements.breakdownTbody.innerHTML = '<tr><td colspan="3" style="color: var(--text-dim); text-align: center;">Tidak ada kosakata khusus.</td></tr>';
    }
  } else {
    elements.insightsContainer.style.display = 'none';
  }

  // On mobile screens, scroll down to the translation result
  if (window.innerWidth <= 768) {
    elements.targetOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderFuriganaTags(text) {
  // Replace [漢字]{かんじ} with <ruby>漢字<rt>かんじ</rt></ruby>
  return text.replace(/\[([^\]]+)\]\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
}

/* ==========================================================================
   Web Speech API (Text-to-Speech & Speech-to-Text)
   ========================================================================== */
function speakText(text, lang) {
  if (!('speechSynthesis' in window)) {
    alert('Browser Anda tidak mendukung Text-to-Speech.');
    return;
  }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ja' ? 'ja-JP' : 'id-ID';
  utterance.rate = lang === 'ja' ? 0.9 : 1.0;

  const voices = window.speechSynthesis.getVoices();
  const targetVoice = voices.find((v) => v.lang.startsWith(utterance.lang.slice(0, 2)));
  if (targetVoice) {
    utterance.voice = targetVoice;
  }

  window.speechSynthesis.speak(utterance);
}

function handleSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert('Browser tidak mendukung Speech Recognition.');
    return;
  }

  const recognition = new SpeechRec();
  recognition.lang = state.sourceLang === 'ja' ? 'ja-JP' : 'id-ID';
  recognition.continuous = false;
  recognition.interimResults = false;

  elements.btnMicSource.textContent = '🔴 Mendengarkan...';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.sourceText.value += (elements.sourceText.value ? ' ' : '') + transcript;
    elements.charCount.textContent = `${elements.sourceText.value.length} / 2000`;
    executeTranslation();
  };

  recognition.onend = () => {
    elements.btnMicSource.textContent = '🎙️ Suara';
  };

  recognition.onerror = () => {
    elements.btnMicSource.textContent = '🎙️ Suara';
  };

  recognition.start();
}

/* ==========================================================================
   Save to Vocabulary Notebook
   ========================================================================== */
function handleSaveVocab() {
  if (!state.lastResult) return;
  const isJpTarget = state.targetLang === 'ja';
  const word = isJpTarget ? state.lastResult.translation : elements.sourceText.value;
  const meaning = isJpTarget ? elements.sourceText.value : state.lastResult.translation;
  const reading = state.lastResult.romaji || '';

  const vocab = JSON.parse(localStorage.getItem('sakura_vocab') || '[]');
  vocab.unshift({
    id: Date.now(),
    word: word.trim(),
    reading: reading.trim(),
    meaning: meaning.trim(),
    date: new Date().toLocaleDateString('id-ID')
  });

  localStorage.setItem('sakura_vocab', JSON.stringify(vocab));
  elements.btnSaveVocab.textContent = '✅ Tersimpan';
  setTimeout(() => (elements.btnSaveVocab.textContent = '🔖 Simpan Kosakata'), 2000);
}

/* ==========================================================================
   History Management
   ========================================================================== */
function saveToHistory(source, target) {
  state.history.unshift({
    id: Date.now(),
    source,
    target,
    from: state.sourceLang,
    to: state.targetLang,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  if (state.history.length > 10) state.history.pop();
  localStorage.setItem('sakura_trans_history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    elements.historyCard.style.display = 'none';
    return;
  }

  elements.historyCard.style.display = 'flex';
  elements.historyList.innerHTML = '';

  state.history.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'example-chip';
    div.style.flexDirection = 'row';
    div.style.justifyContent = 'space-between';
    div.style.alignItems = 'center';
    div.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(item.source)}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${escapeHtml(item.target)}
        </div>
      </div>
      <span style="font-size: 0.7rem; color: var(--text-dim); margin-left: 10px;">${item.time}</span>
    `;

    div.addEventListener('click', () => {
      elements.sourceText.value = item.source;
      elements.charCount.textContent = `${item.source.length} / 2000`;
      if (item.from !== state.sourceLang) {
        swapLanguages();
      }
      executeTranslation();
    });

    elements.historyList.appendChild(div);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
