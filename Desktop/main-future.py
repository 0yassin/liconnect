import sys
import threading
import time
import json
import qrcode
import pyperclip
from PIL.ImageQt import ImageQt
from PySide6.QtCore import (
    Qt, Property, QEasingCurve, QPropertyAnimation, Signal, QSize
)
from PySide6.QtGui import QCursor, QColor, QEnterEvent, QFont, QFontDatabase, QIcon, QPixmap
from PySide6.QtWidgets import (
    QApplication, QWidget, QPushButton, QLabel,
    QHBoxLayout, QVBoxLayout
)
from server import Server
from win10toast import ToastNotifier
from PySide6.QtWidgets import QLabel

toaster = ToastNotifier()



class AnimatedButton(QPushButton):
    def __init__(self, text):
        super().__init__(text)
        self._color = QColor("#4C4C4C")
        self.setStyleSheet(f"background-color: {self._color.name()}")
        self.animation = QPropertyAnimation(self, b"bgColor")
        self.animation.setDuration(140)
        self.animation.setEasingCurve(QEasingCurve.InOutQuad)

    def enterEvent(self, event: QEnterEvent):
        self.animate_to(QColor("#2D2D2D"))
        super().enterEvent(event)

    def leaveEvent(self, event):
        self.animate_to(QColor("#4C4C4C"))
        super().leaveEvent(event)

    def animate_to(self, color):
        self.animation.stop()
        self.animation.setStartValue(self._color)
        self.animation.setEndValue(color)
        self.animation.start()

    def get_bg_color(self):
        return self._color

    def set_bg_color(self, color):
        self._color = color
        self.setStyleSheet(f"background-color: {color.name()};")

    bgColor = Property(QColor, get_bg_color, set_bg_color)

class MainWindow(QWidget):
    file_received_signal = Signal(dict)
    clipboard_received_signal = Signal(str)
    text_received_signal = Signal(str)
    test_button_clicked_signal = Signal(any)

    def __init__(self):
        super().__init__()
        self.server = server
        self.setWindowTitle("Connection Button")
        self.setFixedSize(846, 520)

        # Status bar unfinished
        # self.status_bar = QWidget()
        # self.status_bar.setObjectName("status_bar")
        # self.status_bar.setFixedSize(758, 112)
        # self.status_bar_layout = QHBoxLayout(self.status_bar)
        # self.status_label = QLabel("Status: Waiting...")
        # self.status_label.setAlignment(Qt.AlignCenter)
        # self.status_bar_layout.addWidget(self.status_label)

        # Clipboard button
        # self.clipboard_button = AnimatedButton("Clipboard")
        # self.clipboard_button.setObjectName("clipboardButton")
        # self.clipboard_button.setFixedSize(352, 112)
        # self.clipboard_button.setCursor(QCursor(Qt.PointingHandCursor))
        # self.clipboard_button.setIcon(QIcon("assets/icons/Paperclip.svg"))
        # self.clipboard_button.setIconSize(QSize(32, 32))
        # self.clipboard_button.setLayoutDirection(Qt.RightToLeft)

        


        # Filesharing button
        # self.filesharing_button = AnimatedButton("Filesharing")
        # self.filesharing_button.setObjectName("filesharingButton")
        # self.filesharing_button.setFixedSize(352, 112)
        # self.filesharing_button.setCursor(QCursor(Qt.PointingHandCursor))
        # self.filesharing_button.setIcon(QIcon("assets/icons/file.svg"))
        # self.filesharing_button.setIconSize(QSize(32, 32))
        # self.filesharing_button.setLayoutDirection(Qt.RightToLeft)

        # Share text button
        # self.text_button = AnimatedButton("Share text")
        # self.text_button.setObjectName("textButton")
        # self.text_button.setFixedSize(352, 112)
        # self.text_button.setCursor(QCursor(Qt.PointingHandCursor))
        # self.text_button.setIcon(QIcon("assets/icons/placeholder.svg"))
        # self.text_button.setIconSize(QSize(32, 32))
        # self.text_button.setLayoutDirection(Qt.RightToLeft)

        # QR box
        self.qrbox = QWidget()
        self.qrbox.setObjectName("box")
        self.qrbox.setFixedSize(382, 382)
        self.qrbox_layout = QVBoxLayout(self.qrbox)


        # # Layout
        # buttons_layout = QVBoxLayout()
        # buttons_layout.addWidget(self.clipboard_button)
        # buttons_layout.addWidget(self.filesharing_button)
        # buttons_layout.addWidget(self.text_button)
        # buttons_layout.setSpacing(24)

        # button_box_layout = QHBoxLayout()
        # button_box_layout.addWidget(self.qrbox)
        # button_box_layout.addLayout(buttons_layout)
        # button_box_layout.setSpacing(24)
        # button_box_layout.setAlignment(Qt.AlignCenter)

        layout = QVBoxLayout(self)
        # layout.addWidget(self.status_bar)
        layout.setAlignment(Qt.AlignCenter)
        layout.addSpacing(24)
        layout.addLayout(self.qrbox_layout)

        #signals
        self.file_received_signal.connect(self.handle_file)
        self.clipboard_received_signal.connect(self.handle_clipboard)
        self.text_received_signal.connect(self.handle_text)
        

        # self.clipboard_button.clicked.connect(self.text_received_signal)
    # def send_clipboard_to_phone(self):
    #     text = pyperclip.paste()
    #     if text: 
    #         # self.server.send_clipboard(text=text)
    #         pass
    #     else:
    #         print("clipboard is empty")


    def handle_callback(self, msg_type, content):
        if msg_type == "file":
            self.file_received_signal.emit(content)
        elif msg_type == "clipboard":
            self.clipboard_received_signal.emit(content)
        elif msg_type == "text":
            self.text_received_signal.emit(content)
        else:
            print(f"Unknown type: {msg_type}")

    def handle_file(self, file_info):
        fname = file_info.get("filename", "unknown")
        ftype = file_info.get("filetype", "unknown")
        toaster.show_toast(f"Received {ftype}", fname)

    def handle_clipboard(self, text):
        pyperclip.copy(text)
        toaster.show_toast("Copied to clipboard", text)
        while toaster.notification_active(): time.sleep(0.1)

    def handle_text(self, text):
        print(f"UI: Text received - {text}")

    def update_qr(self, data: dict,
                  fill_color: str = "#000",
                  back_color: str = "#000"):
        for i in reversed(range(self.qrbox_layout.count())):
            w = self.qrbox_layout.itemAt(i).widget()
            if w:
                w.setParent(None)
        payload = json.dumps(data, separators=(',', ':'))
        qr = qrcode.QRCode(
            version=1, error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10, border=4
        )
        qr.add_data(payload)
        qr.make(fit=True)
        pil_img = qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGB")
        qt_img = ImageQt(pil_img)
        pix = QPixmap.fromImage(qt_img)
        lbl = QLabel(alignment=Qt.AlignCenter)
        lbl.setPixmap(pix.scaled(400, 400, Qt.KeepAspectRatio))
        lbl.setStyleSheet("background: transparent;")
        self.qrbox_layout.addWidget(lbl)



if __name__ == "__main__":

    server = Server()
    app = QApplication(sys.argv)
    font_id = QFontDatabase.addApplicationFont("assets/fonts/poppins-v23-latin-700.ttf")
    if font_id != -1:
        app.setFont(QFontDatabase.applicationFontFamilies(font_id)[0])
    with open("styles/theme.qss", "r") as f:
        app.setStyleSheet(f.read())
    win = MainWindow()
    win.update_qr({"ip": server.ip_address, "port": server.port, "authToken": server.token, "name": "pc"},
                  fill_color="#2D2D2D", back_color="#D3D3D3")
    print(server.ip_address)
    server.start()
    server.register_callback('file', win.handle_file)
    server.register_callback('message', win.handle_callback)
    # server.send_clipboard(pyperclip.paste())
    win.show()
    sys.exit(app.exec())
