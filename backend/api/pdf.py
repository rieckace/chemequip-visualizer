from __future__ import annotations

from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas


def build_dataset_report_pdf(*, title: str, summary: dict[str, Any]) -> bytes:
    buffer = BytesIO()
    canvas = Canvas(buffer, pagesize=letter)
    width, height = letter

    x = 0.75 * inch
    y = height - 0.9 * inch

    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawString(x, y, title)

    y -= 0.4 * inch
    canvas.setFont("Helvetica", 11)

    canvas.drawString(x, y, f"Total equipment count: {summary.get('total_count', '-')}")
    y -= 0.25 * inch

    averages = summary.get('averages') or {}
    canvas.drawString(x, y, f"Average Flowrate: {averages.get('flowrate', '-')}")
    y -= 0.2 * inch
    canvas.drawString(x, y, f"Average Pressure: {averages.get('pressure', '-')}")
    y -= 0.2 * inch
    canvas.drawString(x, y, f"Average Temperature: {averages.get('temperature', '-')}")
    y -= 0.35 * inch

    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(x, y, "Equipment Type Distribution")
    y -= 0.25 * inch
    canvas.setFont("Helvetica", 11)

    dist = summary.get('type_distribution') or {}
    if not dist:
        canvas.drawString(x, y, "(no data)")
        y -= 0.2 * inch
    else:
        for equipment_type, count in dist.items():
            canvas.drawString(x, y, f"- {equipment_type}: {count}")
            y -= 0.2 * inch
            if y < 1.0 * inch:
                canvas.showPage()
                y = height - 0.9 * inch
                canvas.setFont("Helvetica", 11)

    canvas.showPage()
    canvas.save()
    return buffer.getvalue()
