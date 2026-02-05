import sys
import os
from dataclasses import dataclass

import requests
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont
from PyQt5.QtWidgets import (
    QApplication,
    QFileDialog,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure


APP_QSS = """
QWidget {
    font-family: Segoe UI, Arial;
    font-size: 13px;
    color: #111827;
}

QMainWindow {
    background: #f3f6fb;
}

QGroupBox {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    margin-top: 12px;
    padding: 12px;
    background: #ffffff;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 12px;
    padding: 0 6px;
    color: #111827;
    font-weight: 700;
}

QLabel {
    color: #111827;
}

QLineEdit {
    padding: 8px 10px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    selection-background-color: rgba(59, 130, 246, 120);
}

QLineEdit:focus {
    border: 1px solid rgba(59, 130, 246, 200);
}

QPushButton {
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
}

QPushButton:hover {
    background: #f3f4f6;
}

QPushButton:pressed {
    background: #e5e7eb;
}

QPushButton:disabled {
    color: rgba(17, 24, 39, 120);
    border-color: #e5e7eb;
    background: #f9fafb;
}

QListWidget {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #ffffff;
    padding: 6px;
}

QListWidget::item {
    padding: 10px;
    margin: 6px 2px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #eef2f7;
}

QListWidget::item:selected {
    border: 1px solid rgba(59, 130, 246, 200);
    background: rgba(59, 130, 246, 24);
}

QTableWidget {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    background: #ffffff;
    gridline-color: #eef2f7;
}

QHeaderView::section {
    background: #f9fafb;
    color: #111827;
    padding: 8px;
    border: 0px;
    border-right: 1px solid #eef2f7;
    border-bottom: 1px solid #eef2f7;
    font-weight: 700;
}

QScrollBar:vertical {
    background: transparent;
    width: 10px;
    margin: 6px 2px;
}

QScrollBar::handle:vertical {
    background: rgba(17, 24, 39, 55);
    border-radius: 5px;
    min-height: 20px;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QMessageBox {
    background: #ffffff;
}
"""


@dataclass
class Auth:
    username: str
    password: str


class ApiClient:
    def __init__(self, base_url: str, auth: Auth):
        self.base_url = base_url.rstrip('/')
        self.auth = (auth.username, auth.password)

    def health(self):
        return requests.get(f"{self.base_url}/health/", timeout=10).json()

    def list_datasets(self):
        r = requests.get(f"{self.base_url}/datasets/", auth=self.auth, timeout=20)
        r.raise_for_status()
        return r.json()

    def upload_csv(self, file_path: str):
        with open(file_path, "rb") as f:
            filename = os.path.basename(file_path)
            files = {"file": (filename, f, "text/csv")}
            r = requests.post(f"{self.base_url}/datasets/", files=files, auth=self.auth, timeout=60)
            r.raise_for_status()
            return r.json()

    def dataset_data(self, dataset_id: int, limit: int = 200, offset: int = 0):
        r = requests.get(
            f"{self.base_url}/datasets/{dataset_id}/data/",
            params={"limit": limit, "offset": offset},
            auth=self.auth,
            timeout=30,
        )
        r.raise_for_status()
        return r.json()

    def download_report(self, dataset_id: int):
        r = requests.get(
            f"{self.base_url}/datasets/{dataset_id}/report/",
            auth=self.auth,
            timeout=60,
        )
        r.raise_for_status()
        return r.content

    def delete_dataset(self, dataset_id: int):
        r = requests.delete(
            f"{self.base_url}/datasets/{dataset_id}/",
            auth=self.auth,
            timeout=20,
        )
        r.raise_for_status()
        return True


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Chemical Equipment Visualizer (Desktop)")
        self.resize(1100, 700)

        # Polished look: global font + light theme
        self.setFont(QFont("Segoe UI", 10))
        app = QApplication.instance()
        if app is not None:
            app.setStyleSheet(APP_QSS)

        self.api = None
        self.datasets = []
        self.selected = None

        root = QWidget()
        self.setCentralWidget(root)
        layout = QVBoxLayout(root)

        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(14)

        layout.addWidget(self._build_auth_group())

        body = QHBoxLayout()
        layout.addLayout(body, 1)

        body.setSpacing(14)

        self.list_widget = QListWidget()
        self.list_widget.itemSelectionChanged.connect(self._on_select_dataset)
        body.addWidget(self.list_widget, 2)

        right = QVBoxLayout()
        body.addLayout(right, 5)

        self.summary_group = self._build_summary_group()
        right.addWidget(self.summary_group)

        self.figure = Figure(figsize=(5, 3))
        self.canvas = FigureCanvas(self.figure)
        right.addWidget(self.canvas, 2)

        self.table = QTableWidget()
        right.addWidget(self.table, 3)

        self.table.setAlternatingRowColors(True)
        self.table.setShowGrid(False)

        self._set_status("Enter credentials and click Connect")

    def _build_auth_group(self):
        box = QGroupBox("Backend Connection (Basic Auth)")
        grid = QGridLayout(box)

        grid.setHorizontalSpacing(10)
        grid.setVerticalSpacing(10)

        self.base_url = QLineEdit("http://127.0.0.1:8000/api")
        self.username = QLineEdit()
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)

        self.connect_btn = QPushButton("Connect")
        self.connect_btn.clicked.connect(self._connect)

        self.refresh_btn = QPushButton("Refresh History")
        self.refresh_btn.clicked.connect(self._refresh)
        self.refresh_btn.setEnabled(False)

        self.upload_btn = QPushButton("Upload CSV")
        self.upload_btn.clicked.connect(self._upload)
        self.upload_btn.setEnabled(False)

        self.pdf_btn = QPushButton("Save PDF Report")
        self.pdf_btn.clicked.connect(self._save_pdf)
        self.pdf_btn.setEnabled(False)

        self.delete_btn = QPushButton("Delete Selected")
        self.delete_btn.clicked.connect(self._delete_selected)
        self.delete_btn.setEnabled(False)

        grid.addWidget(QLabel("API Base URL"), 0, 0)
        grid.addWidget(self.base_url, 0, 1, 1, 3)

        grid.addWidget(QLabel("Username"), 1, 0)
        grid.addWidget(self.username, 1, 1)
        grid.addWidget(QLabel("Password"), 1, 2)
        grid.addWidget(self.password, 1, 3)

        buttons = QHBoxLayout()
        buttons.addWidget(self.connect_btn)
        buttons.addWidget(self.refresh_btn)
        buttons.addWidget(self.upload_btn)
        buttons.addWidget(self.pdf_btn)
        buttons.addWidget(self.delete_btn)
        buttons.addStretch(1)
        grid.addLayout(buttons, 2, 0, 1, 4)

        self.status = QLabel("")
        self.status.setWordWrap(True)
        self.status.setTextInteractionFlags(Qt.TextSelectableByMouse)
        self.status.setStyleSheet(
            "padding: 10px; border-radius: 12px; background: #f9fafb; border: 1px solid #eef2f7; color: #111827;"
        )
        grid.addWidget(self.status, 3, 0, 1, 4)

        return box

    def _build_summary_group(self):
        box = QGroupBox("Summary")
        grid = QGridLayout(box)

        grid.setHorizontalSpacing(14)
        grid.setVerticalSpacing(10)

        self.total_lbl = QLabel("-")
        self.flow_lbl = QLabel("-")
        self.press_lbl = QLabel("-")
        self.temp_lbl = QLabel("-")

        grid.addWidget(QLabel("Total"), 0, 0)
        grid.addWidget(self.total_lbl, 0, 1)
        grid.addWidget(QLabel("Avg Flowrate"), 0, 2)
        grid.addWidget(self.flow_lbl, 0, 3)

        grid.addWidget(QLabel("Avg Pressure"), 1, 0)
        grid.addWidget(self.press_lbl, 1, 1)
        grid.addWidget(QLabel("Avg Temperature"), 1, 2)
        grid.addWidget(self.temp_lbl, 1, 3)

        return box

    def _set_status(self, text: str):
        self.status.setText(text)

    def _connect(self):
        u = self.username.text().strip()
        p = self.password.text().strip()
        if not u or not p:
            QMessageBox.warning(self, "Missing", "Enter username and password")
            return

        self.api = ApiClient(self.base_url.text().strip(), Auth(u, p))
        try:
            h = self.api.health()
            self._set_status(f"Connected. Health: {h.get('status', h)}")
        except Exception as exc:
            self.api = None
            QMessageBox.critical(self, "Error", f"Cannot reach backend: {exc}")
            return

        self.refresh_btn.setEnabled(True)
        self.upload_btn.setEnabled(True)
        self._refresh()

    def _refresh(self):
        if not self.api:
            return
        try:
            self.datasets = self.api.list_datasets()
        except Exception as exc:
            QMessageBox.critical(self, "Error", str(exc))
            return

        self.list_widget.clear()
        for d in self.datasets:
            item = QListWidgetItem(f"#{d['id']} — {d['original_filename']} (rows: {d['row_count']})")
            item.setData(Qt.UserRole, d)
            self.list_widget.addItem(item)

        self._set_status(f"Loaded {len(self.datasets)} dataset(s)")
        self.pdf_btn.setEnabled(False)
        self.delete_btn.setEnabled(False)

    def _upload(self):
        if not self.api:
            return
        path, _ = QFileDialog.getOpenFileName(self, "Select CSV", "", "CSV Files (*.csv)")
        if not path:
            return
        try:
            created = self.api.upload_csv(path)
            self._set_status(f"Uploaded dataset #{created['id']}")
            self._refresh()
            # auto-select newest
            if self.list_widget.count() > 0:
                self.list_widget.setCurrentRow(0)
        except Exception as exc:
            QMessageBox.critical(self, "Upload failed", str(exc))

    def _on_select_dataset(self):
        items = self.list_widget.selectedItems()
        if not items:
            return
        self.selected = items[0].data(Qt.UserRole)
        summary = self.selected.get('summary') or {}
        averages = summary.get('averages') or {}

        self.total_lbl.setText(str(summary.get('total_count', '-')))
        self.flow_lbl.setText(str(averages.get('flowrate', '-')))
        self.press_lbl.setText(str(averages.get('pressure', '-')))
        self.temp_lbl.setText(str(averages.get('temperature', '-')))

        self._draw_chart(summary.get('type_distribution') or {})
        self._load_table(self.selected['id'])
        self.pdf_btn.setEnabled(True)
        self.delete_btn.setEnabled(True)

    def _delete_selected(self):
        if not self.api or not self.selected:
            return
        dataset_id = self.selected.get('id')
        if not dataset_id:
            return

        reply = QMessageBox.question(
            self,
            "Confirm delete",
            f"Delete dataset #{dataset_id} from history?",
            QMessageBox.Yes | QMessageBox.No,
        )
        if reply != QMessageBox.Yes:
            return

        try:
            self.api.delete_dataset(int(dataset_id))
            self._set_status(f"Deleted dataset #{dataset_id}")
            self.selected = None
            self._refresh()
        except Exception as exc:
            QMessageBox.critical(self, "Delete failed", str(exc))

    def _draw_chart(self, dist: dict):
        self.figure.clear()
        ax = self.figure.add_subplot(111)
        labels = list(dist.keys())
        values = [dist[k] for k in labels]
        self.figure.patch.set_facecolor('#ffffff')
        ax.set_facecolor('#ffffff')

        ax.bar(labels, values, color='#3b82f6')
        ax.set_title("Type Distribution", color='#111827')
        ax.set_ylabel("Count", color='#111827')
        ax.tick_params(axis='y', colors='#111827')
        ax.tick_params(axis='x', rotation=30)
        ax.tick_params(axis='x', colors='#111827')
        ax.grid(axis='y', color='#9ca3af', alpha=0.35, linestyle='-')

        for spine in ax.spines.values():
            spine.set_color((17/255, 24/255, 39/255, 0.18))
        self.figure.tight_layout()
        self.canvas.draw()

    def _load_table(self, dataset_id: int):
        if not self.api:
            return
        try:
            data = self.api.dataset_data(dataset_id, limit=200, offset=0)
        except Exception as exc:
            QMessageBox.critical(self, "Error", str(exc))
            return

        columns = data.get('columns') or []
        rows = data.get('rows') or []

        self.table.clear()
        self.table.setColumnCount(len(columns))
        self.table.setRowCount(len(rows))
        self.table.setHorizontalHeaderLabels(columns)

        for r_idx, row in enumerate(rows):
            for c_idx, col in enumerate(columns):
                value = row.get(col)
                item = QTableWidgetItem("" if value is None else str(value))
                self.table.setItem(r_idx, c_idx, item)

        self.table.resizeColumnsToContents()

    def _save_pdf(self):
        if not (self.api and self.selected):
            return
        dataset_id = self.selected['id']
        out_path, _ = QFileDialog.getSaveFileName(
            self,
            "Save PDF Report",
            f"dataset_{dataset_id}_report.pdf",
            "PDF Files (*.pdf)",
        )
        if not out_path:
            return
        try:
            content = self.api.download_report(dataset_id)
            with open(out_path, "wb") as f:
                f.write(content)
            self._set_status(f"Saved report to {out_path}")
        except Exception as exc:
            QMessageBox.critical(self, "Error", str(exc))


def main():
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
