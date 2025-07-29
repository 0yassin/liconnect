import eventlet
from eventlet import wsgi
from urllib.parse import parse_qs
import socket
import socketio
import threading
import json
import base64
import random


class Server:
    def __init__(self):
        self.sio = socketio.Server(cors_allowed_origins='*', async_mode='eventlet', ping_interval=25, ping_timeout=120)
        self.app = socketio.WSGIApp(self.sio)

        self.connected_sid = None

        self.token = self.generate_token()
        self.ip_address = self.get_local_ip()
        self.port = 5000

        self._callbacks = {
            'message': None,
            'file': None,
        }

        @self.sio.event
        def connect(sid, environ):
            print(f"[Connect event event] raw sid = {sid}, qs = {environ.get('QUERY_STRING')}")
            query = parse_qs(environ.get('QUERY_STRING', ''))
            token = query.get('token', [None])[0]
            self.sio.emit("test", {}, room=sid)
            if token == self.token:
                self.connected_sid = sid
                print(f"[Connect event] Client {sid} connected with valid token.")
            else:
                print(f"[Connect event] Client {sid} invalid token: {token}")
                raise socketio.exceptions.ConnectionRefusedError('Unauthorized')

        @self.sio.event
        def disconnect(sid):
            print(f"[Disconnect event] sid = {sid}")
            if sid == self.connected_sid:
                self.connected_sid = None
                print("→ Cleared connected_sid")

        @self.sio.event
        def file(sid, data):
            print(f"[File event] from {sid}")
            try:
                filename = data.get("name")
                filetype = data.get("type", "application/octet-stream")
                b64 = data.get("data", "")
                content = base64.b64decode(b64)
                with open(filename, "wb") as f:
                    f.write(content)
                print(f"Saved file: {filename}")

                if self._callbacks['file']:
                    self._callbacks['file']({
                        "filename": filename,
                        "filetype": filetype,
                    })

                self.sio.emit(
                    "file-ack",
                    {"status": "received", "filename": filename},
                    room=sid
                )

            except Exception as e:
                print("Error in file handler:", e)

        @self.sio.event
        def message(sid, data,  ack=None):
            print(f"[Message event] raw data from {sid}:", data)
            try:
                if isinstance(data, str):
                    data = json.loads(data)
                msg_type = data.get("type", "text")
                content = data.get("content", "")
                if self._callbacks['message']:
                    self._callbacks['message'](msg_type, content)
            except Exception as e:
                print("Error in message handler:", e)

    def generate_token(self):
        return str(random.randint(1000, 9999))


    def get_local_ip(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
        except:
            return '127.0.0.1'
        finally:
            s.close()

    def start(self):
        threading.Thread(
            target=lambda: wsgi.server(
                eventlet.listen(('0.0.0.0', self.port)), self.app
            ),
            daemon=True
        ).start()
        print(f"Server started on {self.ip_address}:{self.port}")

    def register_callback(self, event_name, callback):
        if event_name in self._callbacks:
            self._callbacks[event_name] = callback
        else:
            raise ValueError(f"Unknown event '{event_name}'")

if __name__ == "__main__":
    server = Server()
    server.start()
