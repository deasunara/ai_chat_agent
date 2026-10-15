/**
 * SakuraSensei AI - Japanese Learning Chat Agent
 * Main Frontend Logic & Ollama Streaming Client
 */

// Application State
const state = {
  currentMode: 'sensei',
  currentJLPT: 'N5',
  selectedModel: 'glm-5.3-flash:cloud',
  ollamaConnected: false,
  ollamaHost: 'https://ollama.com',
  messages: [],
  isGenerating: false,
  showFurigana: true,
  showRomaji: true,
  autoTTS: false,
  savedVocab: JSON.parse(localStorage.getItem('sakura_vocab') || '[]'),
  currentKanaTab: 'hiragana',
  currentTheme: localStorage.getItem('sakura_theme') || 'sumi',
  abortController: null
};

// Mode Prompts & System Persona Settings
const MODE_PROMPTS = {
  sensei: {
    title: 'Guru Sensei (先生)',
    system: `Anda adalah SakuraSensei (桜先生), seorang guru bahasa Jepang AI yang ramah, sabar, berpengetahuan luas, dan berbicara dalam Bahasa Indonesia santun serta bersahabat.
Tujuan utama Anda adalah mengajarkan bahasa Jepang kepada pembelajar Indonesia.

ATURAN FORMAT JAWABAN:
1. Jelaskan materi dengan jelas dalam Bahasa Indonesia.
2. Setiap kali menulis kalimat atau kosakata bahasa Jepang, WAJIB sertakan:
   - Huruf Jepang (Kanji/Kana): Anda dapat menyertakan furigana dengan format [漢字]{かんじ} atau tag <ruby>漢字<rt>かんじ</rt></ruby> bila relevan.
   - Romaji di dalam tanda kurung, contoh: (Romaji: ...)
   - Terjemahan Bahasa Indonesia, contoh: (Arti: ...)
3. Berikan bagian "💡 Catatan Tata Bahasa" atau "📌 Kosakata Penting" bila menjelaskan kalimat.
4. Target level saat ini adalah JLPT: {JLPT_LEVEL}. Sesuaikan kompleksitas kosakata dan penjelasan dengan level ini.`
  },
  kaiwa: {
    title: 'Percakapan (会話)',
    system: `Anda adalah partner latihan percakapan (Kaiwa) bahasa Jepang alami bernama SakuraSensei.
Saat ini Anda sedang melakukan simulasi percakapan interaktif dengan pembelajar (level {JLPT_LEVEL}).
ATURAN:
1. Balas perkataan pembelajar layaknya orang Jepang asli dalam situasi percakapan, gunakan bahasa yang sopan dan natural.
2. Selalu sertakan:
   - Kalimat Jepang asli
   - Romaji: (Romaji...)
   - Terjemahan Bahasa Indonesia: (Arti...)
3. Di akhir jawaban, berikan 1 pertanyaan lanjutan atau opsi jawaban agar pembelajar bisa merespons kembali.`
  },
  correction: {
    title: 'Koreksi Kalimat (添削)',
    system: `Anda adalah pakar koreksi kalimat bahasa Jepang (Tensaku Sensei).
Tugas Anda:
1. Analisis kalimat bahasa Jepang yang ditulis oleh pengguna.
2. Tentukan apakah kalimat tersebut:
   - ✅ Sudah benar dan alami, atau
   - ⚠️ Ada kesalahan tata bahasa / partikel / nuansa.
3. Berikan versi perbaikan yang paling alami (Natural Japanese) beserta Romaji dan artinya.
4. Jelaskan kesalahan secara rinci dalam Bahasa Indonesia mengapa partikel/kata tersebut kurang tepat dan bagaimana cara memperbaikinya.`
  },
  kanji: {
    title: 'Bedah Kanji & Kosa Kata',
    system: `Anda adalah pakar etimologi dan karakter Kanji bahasa Jepang.
Untuk setiap kanji atau kata yang ditanyakan:
1. Tampilkan Kanji besar.
2. Berikan:
   - Cara baca On'yomi (Katakana) & Kun'yomi (Hiragana).
   - Arti dalam Bahasa Indonesia.
   - Level JLPT dan jumlah coretan (stroke count).
   - 3 Contoh kata majemuk (Jukugo) yang sering digunakan sehari-hari beserta artinya.`
  },
  quiz: {
    title: 'Latihan & Kuis JLPT',
    system: `Anda adalah pembuat soal kuis latihan bahasa Jepang tingkat JLPT {JLPT_LEVEL}.
Jika pengguna meminta soal, buatkan 1 soal pilihan ganda (A, B, C, D) yang menarik dengan konteks nyata (tata bahasa/kosakata).
Jangan langsung berikan kunci jawaban sebelum pengguna menjawab, ATAU jika pengguna menjawab, berikan koreksi dan pembahasan komprehensif.`
  }
};

// Document Elements
const elements = {
  chatMessages: document.getElementById('chat-messages'),
  chatInput: document.getElementById('chat-input'),
  btnSend: document.getElementById('btn-send'),
  btnMic: document.getElementById('btn-mic'),
  welcomeHero: document.getElementById('welcome-hero'),
  ollamaStatusPill: document.getElementById('ollama-status-pill'),
  ollamaStatusText: document.getElementById('ollama-status-text'),
  modelSelect: document.getElementById('model-select'),
  refreshModelsBtn: document.getElementById('refresh-models-btn'),
  modeCards: document.querySelectorAll('.mode-card'),
  jlptBtns: document.querySelectorAll('.jlpt-btn'),
  currentModePill: document.getElementById('current-mode-pill'),
  currentModeTitle: document.getElementById('current-mode-title'),
  currentJlptPill: document.getElementById('current-jlpt-pill'),
  toggleFurigana: document.getElementById('toggle-furigana'),
  toggleRomaji: document.getElementById('toggle-romaji'),
  toggleAutoTts: document.getElementById('toggle-auto-tts'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  btnOpenKana: document.getElementById('btn-open-kana'),
  btnOpenVocab: document.getElementById('btn-open-vocab'),
  btnToolKana: document.getElementById('btn-tool-kana'),
  btnToolVocab: document.getElementById('btn-tool-vocab'),
  btnSettings: document.getElementById('btn-settings'),
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.getElementById('theme-icon'),
  sidebarToggle: document.getElementById('sidebar-toggle'),
  appSidebar: document.getElementById('app-sidebar'),
  quickPhrasesScroll: document.getElementById('quick-phrases-scroll'),
  speechIndicator: document.getElementById('speech-indicator'),
  vocabCountBadge: document.getElementById('vocab-count-badge'),
  // Modals
  modalKana: document.getElementById('modal-kana'),
  modalVocab: document.getElementById('modal-vocab'),
  modalSettings: document.getElementById('modal-settings'),
  kanaGridContainer: document.getElementById('kana-grid-container'),
  vocabItemsContainer: document.getElementById('vocab-items-container'),
  settingsOllamaHost: document.getElementById('settings-ollama-host'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnExportVocab: document.getElementById('btn-export-vocab')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initFallingSakura();
  initTheme();
  initQuickPhrases();
  initEventListeners();
  checkOllamaHealth();
  updateVocabBadge();
  initSpeechRecognition();

  // Poll Ollama status every 30 seconds
  setInterval(checkOllamaHealth, 30000);
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
  const petalCount = 28;

  class Petal {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * -height;
      this.size = Math.random() * 8 + 6;
      this.speedY = Math.random() * 1.2 + 0.8;
      this.speedX = Math.random() * 1.5 - 0.75;
      this.angle = Math.random() * Math.PI * 2;
      this.angularSpeed = Math.random() * 0.02 - 0.01;
      this.opacity = Math.random() * 0.45 + 0.25;
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
      // Draw petal shape
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(this.size / 2, -this.size / 2, this.size, 0, 0, this.size * 1.5);
      ctx.bezierCurveTo(-this.size, 0, -this.size / 2, -this.size / 2, 0, 0);
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < petalCount; i++) {
    const p = new Petal();
    p.y = Math.random() * height; // distribute initial petals
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
    // Default sumi dark
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
   Quick Phrases Bar
   ========================================================================== */
function initQuickPhrases() {
  if (!window.QUICK_PHRASES || !elements.quickPhrasesScroll) return;
  elements.quickPhrasesScroll.innerHTML = '';
  window.QUICK_PHRASES.forEach((item) => {
    const pill = document.createElement('div');
    pill.className = 'quick-phrase-pill';
    pill.innerHTML = `<span class="jp-tag">${item.jp}</span> <span>${item.romaji}</span>`;
    pill.title = `${item.id} (Klik untuk menyisipkan)`;
    pill.addEventListener('click', () => {
      elements.chatInput.value += (elements.chatInput.value ? ' ' : '') + item.jp;
      elements.chatInput.focus();
    });
    elements.quickPhrasesScroll.appendChild(pill);
  });
}

/* ==========================================================================
   Event Listeners Setup
   ========================================================================== */
function initEventListeners() {
  // Chat send triggers
  elements.btnSend.addEventListener('click', handleUserSend);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserSend();
    }
  });

  // Auto-grow textarea
  elements.chatInput.addEventListener('input', () => {
    elements.chatInput.style.height = 'auto';
    elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 160) + 'px';
  });

  // Mobile Sidebar Drawer
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

  function openSidebar() {
    elements.appSidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  }

  function closeSidebar() {
    elements.appSidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  if (elements.sidebarToggle) {
    elements.sidebarToggle.addEventListener('click', () => {
      if (elements.appSidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.appSidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Touch Swipe Gestures for Mobile Drawer
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > 55 && Math.abs(diffY) < 60) {
      if (diffX < -50 && elements.appSidebar.classList.contains('open')) {
        closeSidebar();
      } else if (diffX > 60 && touchStartX < 40 && !elements.appSidebar.classList.contains('open')) {
        openSidebar();
      }
    }
  }, { passive: true });

  // Click on top mode / JLPT pills to toggle or open selector
  if (elements.currentModePill) {
    elements.currentModePill.addEventListener('click', () => {
      openSidebar();
    });
  }
  if (elements.currentJlptPill) {
    elements.currentJlptPill.addEventListener('click', () => {
      openSidebar();
    });
  }

  // Mobile Bottom Nav actions
  const mobNavChat = document.getElementById('mob-nav-chat');
  if (mobNavChat) {
    mobNavChat.addEventListener('click', () => {
      closeSidebar();
      elements.chatInput?.focus();
    });
  }
  const mobNavMode = document.getElementById('mob-nav-mode');
  if (mobNavMode) {
    mobNavMode.addEventListener('click', () => {
      if (elements.appSidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }
  const mobNavKana = document.getElementById('mob-nav-kana');
  if (mobNavKana) {
    mobNavKana.addEventListener('click', () => {
      closeSidebar();
      openKanaModal();
    });
  }
  const mobNavVocab = document.getElementById('mob-nav-vocab');
  if (mobNavVocab) {
    mobNavVocab.addEventListener('click', () => {
      closeSidebar();
      openVocabModal();
    });
  }

  // Mode Selection Cards
  elements.modeCards.forEach((card) => {
    card.addEventListener('click', () => {
      elements.modeCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const mode = card.dataset.mode;
      state.currentMode = mode;
      const config = MODE_PROMPTS[mode];
      elements.currentModeTitle.textContent = config.title;
      elements.currentModePill.querySelector('span:first-child').textContent = card.querySelector('.mode-icon').textContent;
      
      // Close mobile sidebar if open
      closeSidebar();
    });
  });

  // JLPT Level Buttons
  elements.jlptBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.jlptBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentJLPT = btn.dataset.level;
      elements.currentJlptPill.textContent = `Level: ${state.currentJLPT}`;
      if (window.innerWidth <= 900) {
        closeSidebar();
      }
    });
  });

  // Roleplay Scenarios
  document.querySelectorAll('.scenario-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const scenario = btn.dataset.scenario;
      // Switch mode to kaiwa
      const kaiwaCard = document.querySelector('.mode-card[data-mode="kaiwa"]');
      if (kaiwaCard) kaiwaCard.click();
      elements.chatInput.value = `Mari kita mulai latihan percakapan (kaiwa) dalam situasi: ${scenario}. Mohon mulai sapa saya terlebih dahulu dalam bahasa Jepang.`;
      handleUserSend();
      closeSidebar();
    });
  });

  // Quick Prompt Cards on Welcome Screen
  document.querySelectorAll('.quick-prompt-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        elements.chatInput.value = prompt;
        handleUserSend();
      }
    });
  });

  // Toggles (Furigana & Romaji)
  elements.toggleFurigana.addEventListener('change', (e) => {
    state.showFurigana = e.target.checked;
    if (state.showFurigana) {
      document.body.classList.remove('hide-furigana');
    } else {
      document.body.classList.add('hide-furigana');
    }
  });

  elements.toggleRomaji.addEventListener('change', (e) => {
    state.showRomaji = e.target.checked;
    if (state.showRomaji) {
      document.body.classList.remove('hide-romaji');
    } else {
      document.body.classList.add('hide-romaji');
    }
  });

  elements.toggleAutoTts.addEventListener('change', (e) => {
    state.autoTTS = e.target.checked;
  });

  // Clear Chat
  elements.btnClearChat.addEventListener('click', () => {
    if (confirm('Bersihkan riwayat percakapan saat ini?')) {
      state.messages = [];
      elements.chatMessages.innerHTML = '';
      if (elements.welcomeHero) {
        elements.chatMessages.appendChild(elements.welcomeHero);
        elements.welcomeHero.style.display = 'flex';
      }
    }
  });

  // Theme Toggle
  elements.themeToggle.addEventListener('click', cycleTheme);

  // Quick tools in sidebar with closeSidebar
  elements.btnToolKana.addEventListener('click', () => {
    closeSidebar();
    openKanaModal();
  });
  elements.btnToolVocab.addEventListener('click', () => {
    closeSidebar();
    openVocabModal();
  });

  // Refresh Models Button
  elements.refreshModelsBtn.addEventListener('click', () => {
    checkOllamaHealth(true);
  });

  // Model Select Change
  elements.modelSelect.addEventListener('change', (e) => {
    state.selectedModel = e.target.value;
  });

  // Modals Open
  elements.btnOpenKana.addEventListener('click', openKanaModal);
  elements.btnToolKana.addEventListener('click', openKanaModal);
  elements.btnOpenVocab.addEventListener('click', openVocabModal);
  elements.btnToolVocab.addEventListener('click', openVocabModal);
  elements.btnSettings.addEventListener('click', () => elements.modalSettings.classList.add('active'));

  // Modals Close
  document.querySelectorAll('.modal-close-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      if (modalId) document.getElementById(modalId)?.classList.remove('active');
    });
  });

  // Click outside modal card to close
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Save Ollama Host Settings
  elements.btnSaveSettings.addEventListener('click', async () => {
    const host = elements.settingsOllamaHost.value.trim();
    const apiKey = document.getElementById('settings-ollama-key')?.value.trim();
    const model = document.getElementById('settings-ollama-model')?.value.trim();
    if (host) {
      state.ollamaHost = host;
      if (model) state.selectedModel = model;
      try {
        const resp = await fetch('/api/ollama/set-host', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host, api_key: apiKey, model })
        });
        const data = await resp.json();
        alert('Pengaturan host & model tersimpan!');
        elements.modalSettings.classList.remove('active');
        checkOllamaHealth();
      } catch (err) {
        alert('Gagal memperbarui host: ' + err.message);
      }
    }
  });

  // Export Vocab
  elements.btnExportVocab.addEventListener('click', () => {
    if (state.savedVocab.length === 0) {
      alert('Buku catatan kosakata masih kosong.');
      return;
    }
    const text = state.savedVocab
      .map((item) => `${item.word} | ${item.reading} | ${item.meaning}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Daftar kosakata berhasil disalin ke clipboard!');
  });
}

/* ==========================================================================
   Ollama Connection & Models
   ========================================================================== */
async function checkOllamaHealth(userTriggered = false) {
  try {
    elements.ollamaStatusText.textContent = 'Memeriksa...';
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.ollama_connected) {
      state.ollamaConnected = true;
      elements.ollamaStatusPill.classList.remove('offline');
      elements.ollamaStatusText.textContent = `Ollama: Terhubung (${data.models_count} model)`;
      
      if (data.default_model) {
        state.selectedModel = data.default_model;
      }
      // Update model dropdown if models found
      if (data.models && data.models.length > 0) {
        updateModelDropdown(data.models, data.default_model);
      }
      if (userTriggered) alert(`Koneksi berhasil! Ditemukan ${data.models_count} model di Ollama.`);
    } else {
      state.ollamaConnected = false;
      elements.ollamaStatusPill.classList.add('offline');
      elements.ollamaStatusText.textContent = 'Ollama: Offline (Klik untuk info)';
      elements.ollamaStatusPill.onclick = () => elements.modalSettings.classList.add('active');
      if (userTriggered) {
        elements.modalSettings.classList.add('active');
      }
    }
  } catch (err) {
    state.ollamaConnected = false;
    elements.ollamaStatusPill.classList.add('offline');
    elements.ollamaStatusText.textContent = 'Server Offline';
  }
}

function updateModelDropdown(models, defaultModel) {
  const currentVal = elements.modelSelect.value;
  elements.modelSelect.innerHTML = '';
  
  models.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m === 'glm-5.3-flash:cloud' ? `${m} (Cloud ✨)` : m;
    elements.modelSelect.appendChild(opt);
  });

  const preferred = defaultModel || currentVal || 'glm-5.3-flash:cloud';
  if (models.includes(preferred)) {
    elements.modelSelect.value = preferred;
    state.selectedModel = preferred;
  } else {
    elements.modelSelect.value = models[0];
    state.selectedModel = models[0];
  }
}

/* ==========================================================================
   Chat Flow & Streaming Handling
   ========================================================================== */
function setGeneratingUI(isGenerating) {
  state.isGenerating = isGenerating;
  if (isGenerating) {
    elements.btnSend.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="3"/>
      </svg>`;
    elements.btnSend.title = "Hentikan respon (Stop)";
    elements.btnSend.classList.add('btn-stop');
    elements.btnSend.disabled = false;
  } else {
    elements.btnSend.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>`;
    elements.btnSend.title = "Kirim Pesan";
    elements.btnSend.classList.remove('btn-stop');
    elements.btnSend.disabled = false;
    elements.chatInput.focus();
  }
}

async function handleUserSend() {
  if (state.isGenerating) {
    if (state.abortController) {
      state.abortController.abort();
    }
    setGeneratingUI(false);
    return;
  }

  const text = elements.chatInput.value.trim();
  if (!text) return;

  // Hide welcome hero on first message
  if (elements.welcomeHero && elements.welcomeHero.style.display !== 'none') {
    elements.welcomeHero.style.display = 'none';
  }

  // Append user message
  appendMessage('user', text);
  state.messages.push({ role: 'user', content: text });

  // Clear input
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';

  // Build system prompt
  const baseSystem = MODE_PROMPTS[state.currentMode].system.replace(
    '{JLPT_LEVEL}',
    state.currentJLPT
  );

  const payloadMessages = [
    { role: 'system', content: baseSystem },
    ...state.messages.slice(-8) // keep recent context
  ];

  // Set generating state
  setGeneratingUI(true);

  // Create assistant placeholder bubble
  const assistantBubble = appendMessage('assistant', '', true);

  try {
    if (state.ollamaConnected) {
      await streamOllamaChat(payloadMessages, assistantBubble);
    } else {
      // Graceful fallback to smart mock response
      await fetchMockResponse(assistantBubble);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      const bubble = assistantBubble.querySelector('.message-bubble');
      finalizeAssistantMessage(assistantBubble, bubble ? bubble.innerText : '(Diberhentikan)');
    } else {
      console.error('Chat error:', err);
      finalizeAssistantMessage(
        assistantBubble,
        `⚠️ *Terjadi kendala saat menghubungi Ollama:* ${err.message}\n\n*Tips:* Periksa koneksi Ollama di menu pengaturan.`
      );
    }
  } finally {
    setGeneratingUI(false);
  }
}

async function streamOllamaChat(payloadMessages, assistantBubble) {
  state.abortController = new AbortController();

  const response = await fetch('/api/ollama/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: elements.modelSelect.value || state.selectedModel,
      messages: payloadMessages,
      stream: true,
      options: {
        temperature: 0.7
      }
    }),
    signal: state.abortController.signal
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Gagal memproses pesan via Ollama');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulatedText = '';
  let streamEnded = false;

  const contentElem = assistantBubble.querySelector('.message-bubble');

  while (!streamEnded) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.replace('data: ', '').trim();
      if (dataStr === '[DONE]') {
        streamEnded = true;
        break;
      }

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.message) {
          if (parsed.message.content) {
            accumulatedText += parsed.message.content;
            contentElem.innerHTML = renderMarkdown(accumulatedText);
            scrollToBottom();
          } else if (parsed.message.thinking && !accumulatedText) {
            contentElem.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem; font-style: italic; display: flex; align-items: center; gap: 8px;">
              <span class="typing-dot" style="display:inline-block;"></span>
              <span>🌸 SakuraSensei sedang berpikir...</span>
            </div>`;
          }
        }
        if (parsed.done) {
          streamEnded = true;
          break;
        }
      } catch (e) {
        // partial chunk JSON, ignore
      }
    }
  }

  try {
    await reader.cancel();
  } catch (e) {}

  finalizeAssistantMessage(assistantBubble, accumulatedText);
}

async function fetchMockResponse(assistantBubble) {
  // Simulate natural delay for realism
  const contentElem = assistantBubble.querySelector('.message-bubble');
  contentElem.innerHTML = '<div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>';

  const res = await fetch('/api/ollama/mock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: state.messages,
      mode: state.currentMode,
      jlpt: state.currentJLPT
    })
  });

  const data = await res.json();
  const reply = data.message?.content || 'Konnichiwa! Ada yang bisa saya bantu?';

  // Smooth typing effect
  await typeOutText(contentElem, reply);
  finalizeAssistantMessage(assistantBubble, reply);
}

async function typeOutText(element, text) {
  let displayed = '';
  const step = Math.max(1, Math.floor(text.length / 50));
  for (let i = 0; i < text.length; i += step) {
    displayed = text.slice(0, i + step);
    element.innerHTML = renderMarkdown(displayed);
    scrollToBottom();
    await new Promise((r) => setTimeout(r, 12));
  }
  element.innerHTML = renderMarkdown(text);
}

function finalizeAssistantMessage(bubbleElem, text) {
  state.messages.push({ role: 'assistant', content: text });
  const contentElem = bubbleElem.querySelector('.message-bubble');
  contentElem.innerHTML = renderMarkdown(text);

  // Add action footer (TTS, Copy, Save vocab)
  const actions = document.createElement('div');
  actions.className = 'message-actions';

  // 1. Play Audio TTS Button
  const ttsBtn = document.createElement('button');
  ttsBtn.className = 'action-chip-btn';
  ttsBtn.innerHTML = '🔊 Dengarkan';
  ttsBtn.title = 'Putar suara pelafalan bahasa Jepang';
  ttsBtn.onclick = () => speakJapaneseText(text, ttsBtn);
  actions.appendChild(ttsBtn);

  // 2. Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-chip-btn';
  copyBtn.innerHTML = '📋 Salin';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(text);
    copyBtn.innerHTML = '✅ Tersalin';
    setTimeout(() => (copyBtn.innerHTML = '📋 Salin'), 2000);
  };
  actions.appendChild(copyBtn);

  // 3. Save to Vocab Button
  const saveVocabBtn = document.createElement('button');
  saveVocabBtn.className = 'action-chip-btn';
  saveVocabBtn.innerHTML = '🔖 Simpan Kosakata';
  saveVocabBtn.onclick = () => promptSaveVocab(text);
  actions.appendChild(saveVocabBtn);

  bubbleElem.querySelector('.message-content-wrapper').appendChild(actions);
  scrollToBottom();

  if (state.autoTTS) {
    speakJapaneseText(text, ttsBtn);
  }
}

/* ==========================================================================
   DOM Message Rendering
   ========================================================================== */
function appendMessage(role, text, isPlaceholder = false) {
  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  if (role === 'user') {
    row.innerHTML = `
      <div class="message-content-wrapper">
        <div class="message-header-info">
          <span class="message-sender-name">Anda</span>
          <span>${formatTime(new Date())}</span>
        </div>
        <div class="message-bubble">${escapeHtml(text)}</div>
      </div>
      <div class="message-avatar user-avatar">私</div>
    `;
  } else {
    row.innerHTML = `
      <div class="message-avatar">
        <img src="assets/avatar.jpg" alt="SakuraSensei">
      </div>
      <div class="message-content-wrapper">
        <div class="message-header-info">
          <span class="message-sender-name">SakuraSensei (桜先生)</span>
          <span>${formatTime(new Date())}</span>
        </div>
        <div class="message-bubble">
          ${isPlaceholder ? '<div class="typing-dots"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>' : renderMarkdown(text)}
        </div>
      </div>
    `;
  }

  elements.chatMessages.appendChild(row);
  scrollToBottom();
  return row;
}

function scrollToBottom() {
  if (elements.chatMessages) {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
}

// Keep chat scrolled into view when mobile visual viewport shrinks (keyboard appears)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (document.activeElement === elements.chatInput) {
      setTimeout(scrollToBottom, 50);
    }
  });
}

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ==========================================================================
   Markdown & Furigana Parser
   ========================================================================== */
function renderMarkdown(raw) {
  if (!raw) return '';
  let out = raw;

  // 1. Furigana pattern [漢字]{かんじ} -> <ruby>漢字<rt>かんじ</rt></ruby>
  out = out.replace(/\[([^\]]+)\]\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');

  // 2. Romaji pattern (Romaji: ...) -> wrap with span for toggle
  out = out.replace(/\(Romaji:\s*([^)]+)\)/gi, '<span class="romaji-text">(Romaji: $1)</span>');

  // 3. Headers
  out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 4. Blockquotes
  out = out.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

  // 5. Bold & Italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 6. Inline code
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 7. Unordered lists
  out = out.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  out = out.replace(/(<li>.*<\/li>)/gms, '<ul>$1</ul>');

  // 8. Paragraphs / Linebreaks
  out = out.replace(/\n\n+/g, '</p><p>');
  out = out.replace(/\n/g, '<br>');

  return `<p>${out}</p>`;
}

/* ==========================================================================
   Web Speech API (Text-to-Speech & Speech-to-Text)
   ========================================================================== */
function extractJapaneseText(fullText) {
  // Filter for Japanese characters (Kanji, Hiragana, Katakana, Punctuation)
  const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3000-\u303F]+/g;
  const matches = fullText.match(jpRegex);
  if (matches && matches.length > 0) {
    return matches.join('、');
  }
  return fullText;
}

function speakJapaneseText(text, buttonElem) {
  if (!('speechSynthesis' in window)) {
    alert('Browser Anda tidak mendukung Text-to-Speech.');
    return;
  }

  window.speechSynthesis.cancel();

  const toSpeak = extractJapaneseText(text);
  const utterance = new SpeechSynthesisUtterance(toSpeak);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9; // natural, slightly slowed down for learners

  // Pick Japanese voice if available
  const voices = window.speechSynthesis.getVoices();
  const jaVoice = voices.find((v) => v.lang.startsWith('ja') || v.name.includes('Japanese') || v.name.includes('Kyoko') || v.name.includes('Otoya'));
  if (jaVoice) {
    utterance.voice = jaVoice;
  }

  if (buttonElem) buttonElem.classList.add('speaking');

  utterance.onend = () => {
    if (buttonElem) buttonElem.classList.remove('speaking');
  };
  utterance.onerror = () => {
    if (buttonElem) buttonElem.classList.remove('speaking');
  };

  window.speechSynthesis.speak(utterance);
}

function initSpeechRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    elements.btnMic.style.display = 'none';
    return;
  }

  const recognition = new SpeechRec();
  recognition.lang = 'ja-JP';
  recognition.continuous = false;
  recognition.interimResults = false;

  let isRecording = false;

  elements.btnMic.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        isRecording = true;
        elements.btnMic.classList.add('active-recording');
        elements.speechIndicator.style.display = 'inline';
      } catch (e) {
        console.error(e);
      }
    }
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.chatInput.value += (elements.chatInput.value ? ' ' : '') + transcript;
    elements.chatInput.focus();
  };

  recognition.onend = () => {
    isRecording = false;
    elements.btnMic.classList.remove('active-recording');
    elements.speechIndicator.style.display = 'none';
  };

  recognition.onerror = () => {
    isRecording = false;
    elements.btnMic.classList.remove('active-recording');
    elements.speechIndicator.style.display = 'none';
  };
}

/* ==========================================================================
   Interactive Kana Chart
   ========================================================================== */
function openKanaModal() {
  elements.modalKana.classList.add('active');
  renderKanaGrid(state.currentKanaTab);
}

document.getElementById('tab-hiragana')?.addEventListener('click', (e) => {
  document.getElementById('tab-katakana').classList.remove('active');
  e.target.classList.add('active');
  state.currentKanaTab = 'hiragana';
  renderKanaGrid('hiragana');
});

document.getElementById('tab-katakana')?.addEventListener('click', (e) => {
  document.getElementById('tab-hiragana').classList.remove('active');
  e.target.classList.add('active');
  state.currentKanaTab = 'katakana';
  renderKanaGrid('katakana');
});

function renderKanaGrid(type) {
  if (!window.KANA_DATA || !elements.kanaGridContainer) return;
  elements.kanaGridContainer.innerHTML = '';

  window.KANA_DATA.rows.forEach((row) => {
    row.hiragana.forEach((item) => {
      const char = type === 'katakana' ? item.k : item.h;
      if (!char || char.trim() === '') {
        const empty = document.createElement('div');
        elements.kanaGridContainer.appendChild(empty);
        return;
      }

      const cell = document.createElement('div');
      cell.className = 'kana-cell';
      cell.innerHTML = `
        <div class="kana-char">${char}</div>
        <div class="kana-romaji">${item.r}</div>
      `;
      cell.title = `Klik untuk mendengarkan lafal & menyisipkan ${char} (${item.r})`;
      cell.addEventListener('click', () => {
        speakJapaneseText(char);
        elements.chatInput.value += char;
        elements.chatInput.focus();
      });

      elements.kanaGridContainer.appendChild(cell);
    });
  });
}

/* ==========================================================================
   Vocabulary Notebook
   ========================================================================== */
function updateVocabBadge() {
  elements.vocabCountBadge.textContent = state.savedVocab.length;
}

function promptSaveVocab(defaultText = '') {
  const word = prompt('Masukkan kata bahasa Jepang yang ingin disimpan:', '');
  if (!word) return;
  const reading = prompt(`Masukkan cara baca / Romaji untuk "${word}":`, '');
  const meaning = prompt(`Masukkan arti bahasa Indonesia untuk "${word}":`, '');

  state.savedVocab.unshift({
    id: Date.now(),
    word: word.trim(),
    reading: reading ? reading.trim() : '',
    meaning: meaning ? meaning.trim() : '',
    date: new Date().toLocaleDateString('id-ID')
  });

  localStorage.setItem('sakura_vocab', JSON.stringify(state.savedVocab));
  updateVocabBadge();
  alert(`Berhasil menyimpan "${word}" ke buku kosakata!`);
}

function openVocabModal() {
  elements.modalVocab.classList.add('active');
  renderVocabList();
}

function renderVocabList() {
  elements.vocabItemsContainer.innerHTML = '';
  if (state.savedVocab.length === 0) {
    elements.vocabItemsContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-dim);">
        <div style="font-size: 2rem; margin-bottom: 8px;">📖</div>
        Belum ada kosakata yang disimpan.<br>
        Klik tombol "🔖 Simpan Kosakata" pada pesan Sensei untuk menambahkan.
      </div>
    `;
    return;
  }

  state.savedVocab.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'vocab-item';
    div.innerHTML = `
      <div>
        <div class="vocab-word-jp">${escapeHtml(item.word)}</div>
        <div class="vocab-reading-id">
          <b>${escapeHtml(item.reading || '-')}</b> • ${escapeHtml(item.meaning || '-')}
        </div>
      </div>
      <div class="vocab-actions">
        <button class="action-chip-btn" title="Dengarkan lafal">🔊</button>
        <button class="action-chip-btn" title="Hapus kata" style="color: #ef4444;">🗑️</button>
      </div>
    `;

    // TTS
    div.querySelector('button[title="Dengarkan lafal"]').addEventListener('click', () => {
      speakJapaneseText(item.word);
    });

    // Delete
    div.querySelector('button[title="Hapus kata"]').addEventListener('click', () => {
      state.savedVocab = state.savedVocab.filter((v) => v.id !== item.id);
      localStorage.setItem('sakura_vocab', JSON.stringify(state.savedVocab));
      updateVocabBadge();
      renderVocabList();
    });

    elements.vocabItemsContainer.appendChild(div);
  });
}
