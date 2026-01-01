import http.server
import json
import os
import time

# --- LINUX MINT PATH CONFIGURATION ---
BASE_DIR = "/home/jdcnc/Documents/aihockey/HOCKEY 2560"
TEAMS_FOLDER = os.path.join(BASE_DIR, "teams")
JSON_FOLDER = os.path.join(BASE_DIR, "layouts") 
# -------------------------------------

PORT = 8080

class BridgeHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data)

        # Ensure target folders exist
        os.makedirs(JSON_FOLDER, exist_ok=True)
        os.makedirs(TEAMS_FOLDER, exist_ok=True)

        # 1. Save the JSON Layout (for the Builder)
        json_path = os.path.join(JSON_FOLDER, f"{data['code']}.json")
        with open(json_path, "w") as f:
            json.dump(data['layout'], f, indent=2)

        # 2. Save the JS Logic (for the Game)
        js_filename = f"bt{data['fileNum']}.js"
        js_path = os.path.join(TEAMS_FOLDER, js_filename)
        with open(js_path, "w") as f:
            f.write(data['jsContent'])

        # 3. Save Timestamped History (Automatic Backup)
        ts = time.strftime("%Y%m%d_%H%M%S")
        history_dir = os.path.join(TEAMS_FOLDER, "history")
        os.makedirs(history_dir, exist_ok=True)
        backup_path = os.path.join(history_dir, f"bt{data['fileNum']}_{ts}.js")
        with open(backup_path, "w") as f:
            f.write(data['jsContent'])

        print(f"✅ DEPLOYED: {data['code']} to {js_filename}")
        print(f"📦 BACKUP:   {backup_path}")

        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(b"Success")

print(f"🚀 Python Bridge active on http://localhost:{PORT}")
http.server.HTTPServer(('0.0.0.0', PORT), BridgeHandler).serve_forever()