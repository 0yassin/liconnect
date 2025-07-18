from ipaddress import ip_address
from urllib.parse import parse_qs
import socket
import socketio
import eventlet
from eventlet import wsgi
import threading
import json
import base64
import random

class Server:

    def __init__(self):
        self.sio = socketio.Server(cors_allowed_origins='*')
        self.app = socketio.WSGIApp(self.sio)
        self._callback = None  # GUI callback
        self.token = self.generate_token()
        self.ip_adress = self.get_local_ip()
        self.port = 5000
        self._callbacks = {
            'message': None,
            'file': None,
            # Add more if needed
        }

        @self.sio.event
        def connect(sid, environ):
            query = parse_qs(environ.get('QUERY_STRING', ''))
            token = query.get('token', [None])[0]

            print(f"Client {sid} connecting with token:", token)

            if token == self.token:
                print(f"✅ Client {sid} connected with valid token.")
            else:
                print(f"❌ Client {sid} provided invalid token: {token}")
                raise socketio.exceptions.ConnectionRefusedError('Unauthorized: Invalid token.')

        @self.sio.event
        def disconnect(sid):
            print(f"Client disconnected: {sid}")

        @self.sio.event
        def file(sid, data):
            print(f"Received file event from {sid}")

            try:
                filename = data.get("name")
                filetype = data.get("type", "application/octet-stream")
                filedata_b64 = data.get("data", "")

                filedata = base64.b64decode(filedata_b64)

                # Save file locally (optional)
                with open(f"{filename}", "wb") as f:
                    f.write(filedata)
                print(f"Saved file: {filename}")

                # Call UI callback with file info
                if self._callbacks['file']:
                    self._callbacks['file']({

                        "filename":filename,
                        "filetype":filetype,
                    })


                # Send ack back to client
                print(f"Sending file-ack for {filename} to {sid}")
                self.sio.emit("file-ack", {"status": "received", "filename": filename}, to=sid)

            except Exception as e:
                print("Error processing file:", e)

        @self.sio.event
        def message(sid, data, callback):
            try:
                if isinstance(data, str):
                    data = json.loads(data)

                msg_type = data.get("type", "text")
                content = data.get("content", "")

                if self._callbacks['message']:
                    self._callbacks['message'](msg_type, content)

            except Exception as e:
                print("Error processing message:", e)

    def generate_token(self):
        return str(random.randint(1000, 9999))

    def get_local_ip(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Doesn't have to be reachable, just used to determine interface
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
        except Exception:
            ip = '127.0.0.1'
        finally:
            s.close()
        return ip

    def start(self):
        thread = threading.Thread(
            target=lambda: eventlet.wsgi.server(
                eventlet.listen(('0.0.0.0', self.port)), self.app
            ),
            daemon=True
        )
        thread.start()
        print(f"Server started on port {self.port}")
        print(f"Token: {self.token}")

    def register_callback(self, event_name, callback):
        if event_name in self._callbacks:
            self._callbacks[event_name] = callback
        else:
            raise ValueError(f"Unknown event '{event_name}' for callback registration")