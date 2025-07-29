import sys
import json
import qrcode
import pyperclip

from PIL import Image, ImageDraw
from PIL.ImageQt import ImageQt
from win10toast import ToastNotifier

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap, QFontDatabase
from PySide6.QtWidgets import QApplication, QWidget, QLabel, QVBoxLayout

from server import Server

toaster = ToastNotifier()

class QRWindow(QWidget):
    file_received_signal      = Signal(dict)
    clipboard_received_signal = Signal(str)
    text_received_signal      = Signal(str)

    def __init__(self, server: Server,
                 fill_color: str = "#000000",
                 back_color: str = "#FFFFFF",
                 corner_radius: int = 0):
        super().__init__()
        self.server = server
        self.fill_color = fill_color
        self.back_color = back_color
        self.corner_radius = corner_radius

        self.setWindowTitle("QR Code")
        self.setFixedSize(420, 420)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setAlignment(Qt.AlignCenter)
        self.qr_label = QLabel(alignment=Qt.AlignCenter)
        layout.addWidget(self.qr_label)

        self.file_received_signal.connect(self.handle_file)
        self.clipboard_received_signal.connect(self.handle_clipboard)
        self.text_received_signal.connect(self.handle_text)

        server.register_callback('file',    lambda data: self.file_received_signal.emit(data))
        server.register_callback('message', self._on_message)

        self.update_qr()

    def update_qr(self):
        data = {
            "ip":        self.server.ip_address,
            "port":      self.server.port,
            "authToken": self.server.token,
            "name":      "Desktop"
        }
        payload = json.dumps(data, separators=(',', ':'))

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4
        )
        qr.add_data(payload)
        qr.make(fit=True)

        img = qr.make_image(fill_color=self.fill_color,
                            back_color=self.back_color).convert("RGBA")

        mask = Image.new("L", img.size, 0)
        draw = ImageDraw.Draw(mask)
        w, h = img.size
        draw.rounded_rectangle((0, 0, w, h),
                               radius=self.corner_radius,
                               fill=255)

        img.putalpha(mask)

        qt_img = ImageQt(img)
        pix = QPixmap.fromImage(qt_img) \
                      .scaled(400, 400,
                              Qt.KeepAspectRatio,
                              Qt.SmoothTransformation)

        self.qr_label.setPixmap(pix)

    def _on_message(self, msg_type, content):
        if msg_type == "file":
            self.file_received_signal.emit(content)
        elif msg_type == "clipboard":
            self.clipboard_received_signal.emit(content)
        else:
            self.text_received_signal.emit(content)

    def handle_file(self, file_info):
        fname = file_info.get("filename", "unknown")
        ftype = file_info.get("filetype", "unknown")
        toaster.show_toast(f"Received {ftype}", fname, threaded=True)

    def handle_clipboard(self, text):
        pyperclip.copy(text)
        toaster.show_toast("Copied to clipboard", text, threaded=True)


    def handle_text(self, text):
        toaster.show_toast("Copied to clipboard", text, threaded=True)
        pyperclip.copy(text)


if __name__ == "__main__":
    
    server = Server()
    app    = QApplication(sys.argv)
    font_id = QFontDatabase.addApplicationFont("assets/fonts/poppins-v23-latin-700.ttf")
    if font_id != -1:
        app.setFont(QFontDatabase.applicationFontFamilies(font_id)[0])
    with open("styles/theme.qss", "r") as f:
        app.setStyleSheet(f.read())

    win = QRWindow(
        server,
        fill_color="#2D2D2D",
        back_color="#D3D3D300",
        corner_radius=30 
    )
    win.show()

    server.start()
    sys.exit(app.exec())
