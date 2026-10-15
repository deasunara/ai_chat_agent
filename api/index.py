#!/usr/bin/env python3
"""
SakuraSensei AI - Vercel Serverless Function API Handler
Handles /api/health, /api/ollama/chat, /api/translate, /api/ollama/models, etc.
Zero external dependencies (pure Python 3 standard library).
"""

from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import os
import ssl

DEFAULT_OLLAMA_HOST = os.environ.get("OLLAMA_BASE_URL", os.environ.get("OLLAMA_HOST", "https://ollama.com"))
DEFAULT_API_KEY = os.environ.get("OLLAMA_API_KEY", "fd0dea5cda6649a2a068364ba2bed5a8.l2gJ2sIDrhDYquPjGikK6lMW")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "glm-5.3-flash:cloud")

CONFIG = {
    "ollama_host": DEFAULT_OLLAMA_HOST,
    "ollama_api_key": DEFAULT_API_KEY,
    "ollama_model": DEFAULT_MODEL
}

class handler(BaseHTTPRequestHandler):
    def end_headers(self):
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

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path.endswith("/health") or clean_path == "/api/health":
            self.handle_health()
        elif clean_path.endswith("/models") or clean_path.endswith("/ollama/models"):
            self.handle_get_models()
        else:
            self.send_json_response({"error": "Endpoint not found", "path": self.path}, status=404)

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path.endswith("/ollama/chat") or clean_path.endswith("/chat"):
            self.handle_chat_proxy()
        elif clean_path.endswith("/translate"):
            self.handle_translate()
        elif clean_path.endswith("/set-host"):
            self.handle_set_host()
        elif clean_path.endswith("/mock"):
            self.handle_mock_chat()
        else:
            self.send_json_response({"error": "Endpoint not found", "path": self.path}, status=404)

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def safe_urlopen(self, req, timeout=60):
        try:
            return urllib.request.urlopen(req, timeout=timeout)
        except Exception as e:
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
        except Exception:
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
            "models_count": len(models),
            "environment": "vercel-serverless" if os.environ.get("VERCEL") else "standalone"
        })

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

    def handle_chat_proxy(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            req_json = json.loads(post_data.decode("utf-8"))

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
                self.send_json_response({
                    "error": "Ollama_Disconnected",
                    "message": f"Koneksi ke Ollama ({CONFIG['ollama_host']}) gagal: {str(e.reason)}."
                }, status=503)
                return

            if stream:
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
        if "wa" in lower and "ga" in lower:
            return """Konnichiwa! Pertanyaan yang sangat bagus untuk pembelajar bahasa Jepang.

### 🌸 Perbedaan Partikel は (wa) dan が (ga)

1. **Partikel は (wa) - Penanda Topik (Topic Marker)**
   - Menandai apa yang sedang kita bicarakan secara umum.
   - Contoh: 私はインドネシア人です。(Watashi **wa** Indonesia-jin desu)

2. **Partikel が (ga) - Penanda Subjek Spesifik (Subject Marker)**
   - Menandai subjek spesifik penekan SIAPA/APA.
   - Contoh: 田中さんが来ました。(Tanaka-san **ga** kimashita.)"""

        return f"""Konnichiwa! (こんにちは！) SakuraSensei AI siap membantu pembelajaran bahasa Jepang Anda.
Mode: {mode.capitalize()} | Target JLPT: {jlpt}. Silakan tanyakan tata bahasa, kanji, atau percakapan!"""
