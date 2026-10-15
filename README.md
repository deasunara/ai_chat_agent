# 🌸 SakuraSensei AI (桜先生) — AI Chat Agent Belajar Bahasa Jepang

Aplikasi web interaktif modern dan elegan yang dirancang khusus untuk membantu pembelajar bahasa Jepang (dari pemula hingga mahir) dengan kecerdasan buatan lokal menggunakan **Ollama**.

---

## ✨ Fitur Unggulan

1. **AI Model Berbasis Ollama**:
   - Berjalan lokal tanpa kuota API eksternal dan aman untuk privasi.
   - Deteksi otomatis koneksi Ollama dan sinkronisasi daftar model yang terpasang di komputer Anda.
   - Dukungan streaming jawaban secara real-time (efek ketik alami).
   - Mode cerdas simulasi (mock fallback) bila Ollama sedang offline, sehingga tetap bisa langsung dicoba.

2. **5 Mode Belajar Terstruktur**:
   - 🎓 **Guru Sensei (先生)**: Penjelasan tata bahasa, pola kalimat, partikel (*wa, ga, ni, de, wo*), dan tanya jawab dalam Bahasa Indonesia santun.
   - 💬 **Percakapan Interaktif (会話 - Kaiwa)**: Skenario percakapan nyata (Konbini, Restoran Ramen, Stasiun Shinkansen, Tanya Arah, Wawancara Kerja).
   - ✍️ **Koreksi Kalimat (添削 - Tensaku)**: Sensei menganalisis kalimat buatan Anda, membetulkan kesalahan partikel, dan memberikan saran kalimat yang lebih alami.
   - 🈳 **Bedah Kanji & Kosakata**: Cara baca On'yomi, Kun'yomi, jumlah coretan, level JLPT, dan kosakata majemuk (*jukugo*).
   - 🎯 **Latihan & Kuis JLPT**: Soal pilihan ganda interaktif dan simulasi ujian dari N5 hingga N1.

3. **Alat Bantu Belajar Lengkap**:
   - 🔊 **Text-to-Speech (Pelafalan Audio Bahasa Jepang)**: Dengarkan cara pengucapan asli setiap kalimat Jepang dengan Web Speech API (`ja-JP`).
   - 🎙️ **Speech-to-Text (Latihan Berbicara)**: Ucapkan kalimat Jepang dengan mikrofon untuk melatih pelafalan Anda.
   - 🇯🇵 **Toggle Furigana & Romaji**: Aktifkan/nonaktifkan huruf Hiragana di atas huruf Kanji dan teks Romaji latin sesuai kenyamanan Anda.
   - 📖 **Bagan Interaktif Hiragana & Katakana**: Soundboard audio untuk semua karakter 50 bunyi Jepang (A-I-U-E-O).
   - 🔖 **Buku Catatan Kosakata (Vocabulary Notebook)**: Simpan kata-kata penting langsung dari percakapan dan ekspor ke catatan Anda.
   - 🌸 **Desain Estetik Premium**: Tema Sumi Midnight (Dark), Sakura Blossom (Light), dan Cyber Tokyo dengan animasi kelopak bunga sakura yang menenangkan.

4. **🌐 Halaman Penerjemah Khusus (Mirip Google Translate)**:
   - Akses via menu tab atau URL: `/translate` / `translate.html`.
   - Terjemahan dua arah: Jepang ⇄ Indonesia dengan deteksi konteks.
   - Pilihan tingkat kesopanan: Sopan (Teineigo), Santai (Tameguchi), atau Sangat Formal (Keigo).
   - Tampilan Furigana (Hiragana di atas Kanji) dan Romaji transliterasi.
   - Bedah linguistik: Tabel kosakata & partikel per kata serta penjelasan nuansa tata bahasa.
   - Pelafalan audio Text-to-Speech (ja-JP / id-ID) dan input suara mic (STT).
   - Riwayat terjemahan lokal dan tombol sekali klik salin ke catatan kosakata.

---

## 🚀 Panduan Menjalankan

### 1. Menjalankan Server Aplikasi Web
Aplikasi ini menggunakan Python 3 bawaan sistem operasi (tanpa perlu install library tambahan):

```bash
# Opsi 1: Menjalankan via script
./start.sh

# Opsi 2: Menjalankan langsung via Python
python3 server.py
```

Buka browser di: **[http://localhost:3000](http://localhost:3000)**

---

### 2. Konfigurasi Ollama (Cloud & Lokal)

Aplikasi telah dikonfigurasi secara otomatis menggunakan **Ollama Cloud API** dengan model **`glm-5.3-flash:cloud`** melalui file [`.env`](file:///Users/deasunara/Aichatagent/.env):

```env
OLLAMA_BASE_URL="https://ollama.com"
OLLAMA_API_KEY="fd0dea5cda6649a2a068364ba2bed5a8.l2gJ2sIDrhDYquPjGikK6lMW"
OLLAMA_MODEL="glm-5.3-flash:cloud"
PORT=3000
```

Dengan konfigurasi ini, Anda **tidak wajib** menjalankan `ollama serve` lokal di komputer jika ingin menggunakan komputasi cloud kecepatan tinggi!

Jika suatu saat ingin beralih ke Ollama offline/lokal di komputer Anda:
1. Ubah `OLLAMA_BASE_URL` di `.env` menjadi `http://127.0.0.1:11434`
2. Jalankan `ollama serve` di terminal
3. Model lokal Anda (seperti `qwen2.5:7b`, `llama3.2`) akan otomatis terdeteksi.

---

## 📂 Struktur File

```
Aichatagent/
├── server.py              # Server Python 3 & Proxy streaming API ke Ollama
├── start.sh               # Script shortcut untuk memulai aplikasi
├── README.md              # Dokumentasi lengkap
└── public/
    ├── index.html         # Struktur UI aplikasi web
    ├── css/
    │   └── style.css      # Desain CSS visual modern dengan tema Jepang
    ├── js/
    │   ├── app.js         # Logika chat, integrasi Ollama, TTS & STT
    │   └── kana-data.js   # Dataset Hiragana, Katakana, dan frasa Jepang
    └── assets/
        └── avatar.jpg     # Foto profil avatar AI Sensei
```
