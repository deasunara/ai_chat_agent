#!/usr/bin/env python3
"""
SakuraSensei AI - Japanese Learning AI Chat Agent
Server powered by Python 3 (zero external dependencies)
Provides static asset serving and an API proxy to local/remote Ollama.
"""

import http.server
import socketserver
import urllib.request
import urllib.error
import json
import os
import sys
import mimetypes
import ssl

PORT = int(os.environ.get("PORT", 3000))

def load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.isfile(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

load_env_file()

DEFAULT_OLLAMA_HOST = os.environ.get("OLLAMA_BASE_URL", os.environ.get("OLLAMA_HOST", "https://ollama.com"))
DEFAULT_API_KEY = os.environ.get("OLLAMA_API_KEY", "fd0dea5cda6649a2a068364ba2bed5a8.l2gJ2sIDrhDYquPjGikK6lMW")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "glm-5.3-flash:cloud")

# Global config in memory
CONFIG = {
    "ollama_host": DEFAULT_OLLAMA_HOST,
    "ollama_api_key": DEFAULT_API_KEY,
    "ollama_model": DEFAULT_MODEL
}

PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

class JapaneseSenseiHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching for active development
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_HEAD(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path in ("", "/chat"):
            self.path = "/index.html"
        elif clean_path == "/translate":
            self.path = "/translate.html"
        elif self.path == "/api/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            return
        super().do_HEAD()

    def do_GET(self):
        if self.path == "/api/health":
            self.handle_health()
        elif self.path == "/api/ollama/models":
            self.handle_get_models()
        elif self.path.startswith("/api/"):
            self.send_json_response({"error": "Endpoint not found"}, status=404)
        else:
            clean_path = self.path.split("?")[0].rstrip("/")
            if clean_path in ("", "/chat"):
                self.path = "/index.html"
            elif clean_path == "/translate":
                self.path = "/translate.html"
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/ollama/chat":
            self.handle_chat_proxy()
        elif self.path == "/api/translate":
            self.handle_translate()
        elif self.path == "/api/ollama/set-host":
            self.handle_set_host()
        elif self.path == "/api/ollama/mock":
            self.handle_mock_chat()
        else:
            self.send_json_response({"error": "Endpoint not found"}, status=404)

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def safe_urlopen(self, req, timeout=120):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except Exception as e:
            # Fallback to unverified SSL context for macOS python root cert issue
            err_str = str(e)
            if "CERTIFICATE_VERIFY_FAILED" in err_str or "certificate verify failed" in err_str or "SSL" in err_str:
                ctx = ssl._create_unverified_context()
                return urllib.request.urlopen(req, context=ctx, timeout=timeout)
            raise e

    def check_ollama_alive(self):
        host = CONFIG["ollama_host"].rstrip("/")
        try:
            headers = {"User-Agent": "SakuraSensei/1.0"}
            if CONFIG.get("ollama_api_key"):
                headers["Authorization"] = f"Bearer {CONFIG['ollama_api_key']}"
            req = urllib.request.Request(f"{host}/api/tags", headers=headers)
            with self.safe_urlopen(req, timeout=6.0) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    models = data.get("models", [])
                    return True, [m.get("name") for m in models]
        except Exception as e:
            pass
        return False, []

    def handle_health(self):
        alive, models = self.check_ollama_alive()
        default_model = CONFIG.get("ollama_model", "glm-5.3-flash:cloud")
        if default_model not in models:
            models.insert(0, default_model)
        self.send_json_response({
            "status": "online",
            "ollama_host": CONFIG["ollama_host"],
            "ollama_connected": alive,
            "models": models,
            "default_model": default_model,
            "models_count": len(models)
        })

    def handle_set_host(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            new_host = payload.get("host", "").strip()
            new_key = payload.get("api_key", "").strip()
            new_model = payload.get("model", "").strip()
            if new_host:
                if not new_host.startswith("http://") and not new_host.startswith("https://"):
                    new_host = "https://" + new_host
                CONFIG["ollama_host"] = new_host
            if new_key:
                CONFIG["ollama_api_key"] = new_key
            if new_model:
                CONFIG["ollama_model"] = new_model
            alive, models = self.check_ollama_alive()
            self.send_json_response({
                "success": True,
                "ollama_host": CONFIG["ollama_host"],
                "ollama_connected": alive,
                "models": models,
                "default_model": CONFIG["ollama_model"]
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, status=400)

    def handle_get_models(self):
        alive, models = self.check_ollama_alive()
        default_model = CONFIG.get("ollama_model", "glm-5.3-flash:cloud")
        if default_model not in models:
            models.insert(0, default_model)
        if alive:
            self.send_json_response({"connected": True, "models": models, "default_model": default_model})
        else:
            self.send_json_response({
                "connected": False,
                "models": [default_model],
                "default_model": default_model,
                "message": f"Tidak dapat terhubung ke Ollama di {CONFIG['ollama_host']}."
            })

    def handle_chat_proxy(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            req_json = json.loads(post_data.decode("utf-8"))
            
            # Default to configured model if unspecified
            if not req_json.get("model") or req_json.get("model") == "default":
                req_json["model"] = CONFIG.get("ollama_model", "glm-5.3-flash:cloud")
            post_data = json.dumps(req_json, ensure_ascii=False).encode("utf-8")

            stream = req_json.get("stream", True)
            host = CONFIG["ollama_host"].rstrip("/")
            ollama_url = f"{host}/api/chat"

            headers = {
                "Content-Type": "application/json",
                "User-Agent": "SakuraSensei/1.0"
            }
            if CONFIG.get("ollama_api_key"):
                headers["Authorization"] = f"Bearer {CONFIG['ollama_api_key']}"

            ollama_req = urllib.request.Request(
                ollama_url,
                data=post_data,
                headers=headers,
                method="POST"
            )

            try:
                upstream_resp = self.safe_urlopen(ollama_req, timeout=120)
            except urllib.error.URLError as e:
                # Ollama is not connected or timed out
                self.send_json_response({
                    "error": "Ollama_Disconnected",
                    "message": f"Koneksi ke Ollama ({CONFIG['ollama_host']}) gagal: {str(e.reason)}."
                }, status=503)
                return

            if stream:
                # Stream NDJSON/SSE to client
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "close")
                self.end_headers()

                try:
                    while True:
                        line = upstream_resp.readline()
                        if not line:
                            break
                        # Format as SSE event
                        self.wfile.write(b"data: " + line.strip() + b"\n\n")
                        self.wfile.flush()
                        if b'"done": true' in line or b'"done":true' in line:
                            break
                except (BrokenPipeError, ConnectionResetError):
                    pass
                finally:
                    try:
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                    except Exception:
                        pass
                    self.close_connection = True
            else:
                resp_data = upstream_resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_data)))
                self.end_headers()
                self.wfile.write(resp_data)

        except Exception as e:
            self.send_json_response({"error": str(e)}, status=500)

    def handle_translate(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            req_json = json.loads(post_data.decode("utf-8"))

            text = req_json.get("text", "").strip()
            source_lang = req_json.get("source_lang", "ja")
            target_lang = req_json.get("target_lang", "id")
            formality = req_json.get("formality", "polite")

            if not text:
                self.send_json_response({"error": "Teks tidak boleh kosong"}, status=400)
                return

            src_name = "Jepang" if source_lang == "ja" else "Indonesia"
            tgt_name = "Indonesia" if target_lang == "id" else "Jepang"

            formality_guide = {
                "polite": "Bentuk Sopan / Teineigo (〜です, 〜ます)",
                "casual": "Bentuk Santai / Kasual / Tameguchi (teman sebaya)",
                "formal": "Bentuk Sangat Formal / Keigo (bisnis, atasan, pelanggan)"
            }.get(formality, "Bentuk Sopan")

            system_prompt = f"""Anda adalah mesin penerjemah profesional bahasa Jepang - Indonesia tingkat tinggi.
Tugas Anda adalah menerjemahkan teks dari {src_name} ke {tgt_name}.
Tingkat kesopanan yang diminta: {formality_guide}.

Kembalikan respon HANYA dalam format JSON valid berikut (tanpa tanda kutip markdown ```json):
{{
  "translation": "hasil terjemahan utama yang paling alami",
  "romaji": "cara baca romaji latin untuk kalimat jepang (baik jika sumber atau target adalah jepang)",
  "furigana": "teks jepang lengkap dengan furigana format [漢字]{{furigana}}",
  "nuance": "penjelasan singkat nuansa tata bahasa dan tingkat kesopanan dalam bahasa Indonesia",
  "breakdown": [
    {{"word": "kata", "reading": "cara baca", "meaning": "arti kata dalam bahasa Indonesia"}}
  ]
}}"""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Terjemahkan teks berikut:\n{text}"}
            ]

            host = CONFIG["ollama_host"].rstrip("/")
            ollama_url = f"{host}/api/chat"

            payload = {
                "model": CONFIG.get("ollama_model", "glm-5.3-flash:cloud"),
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.3}
            }

            headers = {
                "Content-Type": "application/json",
                "User-Agent": "SakuraSensei/1.0"
            }
            if CONFIG.get("ollama_api_key"):
                headers["Authorization"] = f"Bearer {CONFIG['ollama_api_key']}"

            ollama_req = urllib.request.Request(
                ollama_url,
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                headers=headers,
                method="POST"
            )

            try:
                resp = self.safe_urlopen(ollama_req, timeout=30)
                resp_data = json.loads(resp.read().decode("utf-8"))
                content = resp_data.get("message", {}).get("content", "").strip()

                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                parsed_result = json.loads(content)
                self.send_json_response({
                    "success": True,
                    "data": parsed_result
                })
            except Exception as e:
                # Fallback if connection fails
                self.send_json_response({
                    "success": True,
                    "data": {
                        "translation": f"(Terjemahan otomatis): {text}",
                        "romaji": "",
                        "furigana": text,
                        "nuance": f"Catatan: Respon fallback. Error: {str(e)}",
                        "breakdown": []
                    }
                })

        except Exception as e:
            self.send_json_response({"error": str(e)}, status=500)

    def handle_mock_chat(self):
        """Interactive intelligent fallback when Ollama is not currently active."""
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            messages = payload.get("messages", [])
            last_msg = messages[-1]["content"] if messages else ""
            mode = payload.get("mode", "sensei")
            jlpt = payload.get("jlpt", "N5")

            reply = self.generate_smart_japanese_response(last_msg, mode, jlpt)
            self.send_json_response({
                "message": {
                    "role": "assistant",
                    "content": reply
                },
                "done": True,
                "is_mock": True
            })
        except Exception as e:
            self.send_json_response({"error": str(e)}, status=500)

    def generate_smart_japanese_response(self, prompt, mode, jlpt):
        lower = prompt.lower()
        
        # Check if question about wa vs ga
        if "wa" in lower and "ga" in lower:
            return """Konnichiwa! Pertanyaan yang sangat bagus untuk pembelajar bahasa Jepang.

### 🌸 Perbedaan Partikel は (wa) dan が (ga)

1. **Partikel は (wa) - Penanda Topik (Topic Marker)**
   - Menandai apa yang sedang kita bicarakan secara umum.
   - Fokus informasinya ada pada **apa yang terjadi setelah は**.
   - Contoh:
     - 私はインドネシア人です。(Watashi **wa** Indonesia-jin desu)
     - *Arti*: "Tentang saya, saya adalah orang Indonesia."

2. **Partikel が (ga) - Penanda Subjek Spesifik (Subject Marker)**
   - Menandai subjek yang melakukan tindakan, sering kali untuk menekankan **SIAPA / APA**.
   - Fokus informasinya ada pada **kata sebelum が**.
   - Contoh:
     - 誰が来ましたか？ (Dare **ga** kimashita ka?) -> "Siapa yang datang?"
     - 田中さんが来ました。(Tanaka-san **ga** kimashita.) -> "**Tanaka-san-lah** yang datang."

💡 **Tips Cepat:**
Gunakan **は** untuk pernyataan umum atau kontras, gunakan **が** saat memperkenalkan informasi baru atau menjawab pertanyaan "siapa/apa"."""

        # Check if ordering food or restaurant
        if "makan" in lower or "pesan" in lower or "restoran" in lower or "ramen" in lower:
            return """Irasshaimase! (いらっしゃいませ！) Selamat datang di simulasi restoran Jepang! 🍜

Mari kita coba percakapan memesan ramen:

**Pelayan (店員):**
何名様ですか？ (Nanmei-sama desu ka?)
*Berapa orang?*

**Kamu (客):**
1人です。(Hitori desu.)
*Satu orang.*

**Pelayan (店員):**
ご注文はお決まりですか？ (Gochuumon wa okimari desu ka?)
*Sudah siap untuk memesan?*

**Kamu (客):**
しょうゆラーメンをひとつお願いします。(Shouyu raamen o hitotsu onegaishimasu.)
*Tolong satu kecap asin (shoyu) ramen.*

**Pelayan:**
かしこまりました。少々お待ちください。(Kashikomarimashita. Shou-shou omachi kudasai.)
*Baik, dimengerti. Mohon tunggu sebentar.*

📌 **Kosakata Penting:**
- ~をひとつお願いします (~ o hitotsu onegaishimasu) = Tolong satu [menu]
- お水をお願いします (Omizu o onegaishimasu) = Tolong minta air putih
- お会計お願いします (Okaikei onegaishimasu) = Minta tagihan/struk kasir"""

        # Check if asking for sentence correction
        if "koreksi" in lower or "salah" in lower or "bener" in lower or "benar" in lower:
            return f"""Hai! SakuraSensei siap mengoreksi kalimat bahasa Jepangmu. ✨

Silakan tulis kalimat yang ingin kamu cek:
Contoh format:
> *Koreksi kalimat ini: 私は日本語を勉強するのが好きです*

Sensei akan menganalisis:
1. **Ketepatan Tata Bahasa (Grammar)**
2. **Kewajaran Penggunaan (Nuansa Alami)**
3. **Pilihan Kosakata Lebih Tepat**
4. **Cara Pengucapan & Romaji**

Yuk langsung ketik kalimatmu di bawah!"""

        # General friendly Sensei response
        return f"""Konnichiwa! (こんにちは！) Selamat datang di kelas belajar bahasa Jepang bersama SakuraSensei! 🌸

Kamu sedang berada di mode **{mode.capitalize()}** dengan level target **{jlpt}**.

Apa yang ingin kita pelajari hari ini?
1. 📖 **Tata Bahasa (Bunpou)**: Pola kalimat, partikel (wa, ga, ni, de, wo).
2. 🗣️ **Percakapan Sehari-hari (Kaiwa)**: Konbini, stasiun, tanya jalan, kafe.
3. 🈳 **Kanji & Kosakata**: Cara baca On-yomi, Kun-yomi, arti, dan contoh kalimat.
4. ✍️ **Koreksi Kalimat**: Periksa apakah kalimat buatanmu sudah tepat dan alami.
5. 🎯 **Latihan Soal JLPT**: Simulasi soal dan pembahasan lengkap.

*Ketik pertanyaanmu, atau pilih topik cepat di bagian sidebar! Ganbatte kudasai! (頑張ってください！)*"""

def main():
    mimetypes.init()
    mimetypes.add_type("text/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("image/jpeg", ".jpg")
    mimetypes.add_type("image/png", ".png")
    mimetypes.add_type("image/svg+xml", ".svg")

    socketserver.TCPServer.allow_reuse_address = True
    port = PORT
    httpd = None
    for attempt in range(10):
        try:
            server_address = ("", port)
            httpd = socketserver.TCPServer(server_address, JapaneseSenseiHandler)
            break
        except OSError as e:
            if e.errno == 48:
                print(f"⚠️  Port {port} sedang digunakan, mencoba port {port + 1}...")
                port += 1
            else:
                raise e

    if not httpd:
        print(f"❌ Gagal mengikat port setelah mencoba {PORT} hingga {port - 1}.")
        sys.exit(1)

    print(f"🌸 SakuraSensei AI server running at http://localhost:{port}")
    print(f"🔗 Ollama backend configured at: {CONFIG['ollama_host']}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    main()
