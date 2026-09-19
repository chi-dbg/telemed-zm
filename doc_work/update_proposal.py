from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt
from docx.text.paragraph import Paragraph
from docx.oxml import OxmlElement
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "2300072_CHIPEGO_SHAMBEZA_Project_Proposal_ORIGINAL.docx"
OUTPUT = ROOT / "2300072_CHIPEGO_SHAMBEZA_Project_Proposal_UPDATED.docx"
DIAGRAM_DIR = ROOT / "doc_work" / "updated_diagrams"
DIAGRAM_DIR.mkdir(parents=True, exist_ok=True)

GREEN = "#1a7f5e"
DARK = "#0a3f2f"
LIGHT = "#f0f6f3"
BORDER = "#8fb8a7"
BLUE = "#1e6f9f"
WARN = "#c87600"
DANGER = "#b9413c"
TEXT = "#1a3329"
MUTED = "#5b7a6b"
WHITE = "#ffffff"


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


F_TITLE = font(34, True)
F_H = font(24, True)
F_BODY = font(19)
F_SMALL = font(17)
F_TINY = font(15)


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw, text, fnt, max_width):
    words = str(text).split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_size(draw, candidate, fnt)[0] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_centered_text(draw, rect, text, fnt, fill=TEXT, line_gap=5):
    x1, y1, x2, y2 = rect
    lines = wrap_text(draw, text, fnt, x2 - x1 - 24)
    heights = [text_size(draw, line, fnt)[1] for line in lines]
    total_h = sum(heights) + line_gap * max(0, len(lines) - 1)
    y = y1 + ((y2 - y1) - total_h) / 2
    for line, h in zip(lines, heights):
        w, _ = text_size(draw, line, fnt)
        draw.text((x1 + ((x2 - x1) - w) / 2, y), line, font=fnt, fill=fill)
        y += h + line_gap


def draw_box(draw, rect, title, body=None, fill=WHITE, outline=BORDER, title_fill=DARK, radius=18):
    x1, y1, x2, y2 = rect
    draw.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=3)
    if body is None:
        draw_centered_text(draw, rect, title, F_BODY, fill=TEXT)
        return
    draw.text((x1 + 18, y1 + 14), title, font=F_H, fill=title_fill)
    y = y1 + 52
    for item in body:
        lines = wrap_text(draw, item, F_SMALL, x2 - x1 - 48)
        for line in lines:
            draw.text((x1 + 26, y), line, font=F_SMALL, fill=TEXT)
            y += 21
        y += 3


def draw_arrow(draw, start, end, fill=GREEN, width=5):
    draw.line([start, end], fill=fill, width=width)
    x1, y1 = start
    x2, y2 = end
    import math
    angle = math.atan2(y2 - y1, x2 - x1)
    length = 16
    spread = 0.55
    points = [
        end,
        (x2 - length * math.cos(angle - spread), y2 - length * math.sin(angle - spread)),
        (x2 - length * math.cos(angle + spread), y2 - length * math.sin(angle + spread)),
    ]
    draw.polygon(points, fill=fill)


def title(draw, text, width):
    draw.text((52, 30), text, font=F_TITLE, fill=DARK)
    draw.line((52, 78, width - 52, 78), fill=GREEN, width=4)


def save_canvas(name, size=(1600, 980)):
    img = Image.new("RGB", size, "#ffffff")
    return img, ImageDraw.Draw(img)


def diagram_conceptual():
    img, d = save_canvas("conceptual", (1600, 900))
    title(d, "Conceptual Framework - Current System", 1600)
    cols = [(80, 140, 430, 760), (625, 140, 975, 760), (1170, 140, 1520, 760)]
    draw_box(d, cols[0], "Inputs", [
        "Patients needing remote access",
        "Licensed doctors and pharmacists",
        "Mobile/desktop web browsers",
        "React/Vite frontend",
        "PHP API, Socket.IO, MySQL",
        "Zambian telemedicine guidance",
    ], fill=LIGHT)
    draw_box(d, cols[1], "Platform Process", [
        "Account registration and RBAC",
        "Symptom capture and triage",
        "Doctor approval of chat/video request",
        "Real-time chat and local video calls",
        "Catalog or manual prescription entry",
        "Records, referrals, audit, export",
    ], fill="#ffffff")
    draw_box(d, cols[2], "Outcomes", [
        "Improved access to care",
        "Reduced travel and waiting time",
        "Traceable e-prescriptions",
        "Safer prescribing decisions",
        "Complete patient medical history",
        "Faster pharmacy dispensing workflow",
    ], fill="#f7faf9")
    draw_arrow(d, (430, 450), (625, 450))
    draw_arrow(d, (975, 450), (1170, 450))
    img.save(DIAGRAM_DIR / "conceptual_framework.png")


def diagram_architecture():
    img, d = save_canvas("architecture", (1600, 1000))
    title(d, "Current System Architecture", 1600)
    clients = [
        (90, 150, 380, 265, "Patient Web/Mobile UI"),
        (460, 150, 750, 265, "Doctor Dashboard"),
        (830, 150, 1120, 265, "Pharmacist Dashboard"),
    ]
    for box in clients:
        draw_box(d, box[:4], box[4], fill=LIGHT)
    draw_box(d, (320, 360, 1280, 470), "React/Vite Single Page Application", [
        "Responsive navigation, consultation module, records, prescriptions, referrals, profile, overview KPIs"
    ], fill="#ffffff")
    draw_box(d, (130, 570, 690, 725), "PHP REST API on Apache/XAMPP", [
        "Authentication, RBAC, consultations, prescriptions, patient records, allergies, referrals, notifications, audit logs"
    ], fill="#ffffff")
    draw_box(d, (910, 570, 1470, 725), "Node.js Socket.IO Service", [
        "Persistent real-time chat, room membership, video signalling events for local WebRTC calls"
    ], fill="#ffffff")
    draw_box(d, (470, 820, 1130, 930), "MySQL Database", [
        "users, patients, doctors, pharmacists, consultations, chat_messages, prescriptions, drugs, health_records, referrals"
    ], fill=LIGHT)
    for x in [235, 605, 975]:
        draw_arrow(d, (x, 265), (690, 360))
    draw_arrow(d, (620, 470), (410, 570))
    draw_arrow(d, (980, 470), (1190, 570))
    draw_arrow(d, (410, 725), (680, 820))
    draw_arrow(d, (1190, 725), (920, 820))
    d.line((235, 150, 975, 150), fill=BLUE, width=3)
    d.text((395, 106), "WebRTC media flows peer-to-peer between patient and doctor after approval", font=F_SMALL, fill=BLUE)
    img.save(DIAGRAM_DIR / "architecture.png")


def diagram_context():
    img, d = save_canvas("context", (1600, 940))
    title(d, "System Context Model", 1600)
    center = (560, 300, 1040, 610)
    draw_box(d, center, "Telemed ZM Platform", [
        "Consultation approval",
        "Chat/video consultation",
        "E-prescriptions and pharmacy routing",
        "Medical records and export",
        "Referral scheduling and notifications",
    ], fill=LIGHT)
    actors = [
        ((90, 150, 390, 285), "Patient", "Submits symptoms, requests chat/video, views records and prescriptions"),
        ((90, 650, 390, 800), "Pharmacist", "Receives prescriptions, dispenses or marks unavailable"),
        ((1210, 150, 1510, 300), "Doctor", "Accepts requests, reviews history, chats/videos, prescribes or refers"),
        ((1210, 650, 1510, 800), "Clinic/Referral Site", "Receives referral details for physical review when required"),
    ]
    for rect, head, body in actors:
        draw_box(d, rect, head, [body], fill="#ffffff")
        sx = rect[2] if rect[0] < center[0] else rect[0]
        sy = (rect[1] + rect[3]) // 2
        ex = center[0] if rect[0] < center[0] else center[2]
        ey = (center[1] + center[3]) // 2
        draw_arrow(d, (sx, sy), (ex, ey), fill=GREEN)
    img.save(DIAGRAM_DIR / "context_model.png")


def diagram_use_case():
    img, d = save_canvas("use_case", (1600, 1050))
    title(d, "Use Case Model - Implemented Scope", 1600)
    actors = [
        (70, 190, 270, 270, "Patient"),
        (70, 470, 270, 550, "Doctor"),
        (70, 750, 270, 830, "Pharmacist"),
    ]
    for rect in actors:
        draw_box(d, rect[:4], rect[4], fill=LIGHT)
    groups = [
        ((380, 140, 760, 395), "Patient Use Cases", [
            "Register / login",
            "Create consultation",
            "Select symptoms and chat/video mode",
            "Join approved chat or video",
            "View and download full record",
        ]),
        ((840, 140, 1220, 395), "Doctor Use Cases", [
            "Review queue",
            "Approve request",
            "Chat/video with patient",
            "Prescribe from catalog or manual entry",
            "Refer or close consultation",
        ]),
        ((380, 520, 760, 775), "Pharmacy Use Cases", [
            "View incoming prescriptions",
            "Check prescription details",
            "Mark dispensed or unavailable",
            "Handle refill requests",
        ]),
        ((840, 520, 1220, 775), "System Use Cases", [
            "Authenticate and authorize roles",
            "Persist chat messages",
            "Signal video calls",
            "Generate prescription IDs",
            "Maintain audit trail and notifications",
        ]),
    ]
    for rect, head, body in groups:
        draw_box(d, rect, head, body, fill="#ffffff")
    for y in [230, 510, 790]:
        draw_arrow(d, (270, y), (380, 250 if y == 230 else 640))
    draw_arrow(d, (270, 510), (840, 250))
    draw_arrow(d, (760, 650), (840, 650))
    draw_arrow(d, (1220, 650), (1340, 650))
    draw_box(d, (1340, 570, 1525, 730), "MySQL Data Store", fill=LIGHT)
    img.save(DIAGRAM_DIR / "use_case_model.png")


def diagram_sequence():
    img, d = save_canvas("sequence", (1600, 1120))
    title(d, "Consultation, Chat/Video, and Prescription Sequence", 1600)
    actors = ["Patient", "React/Vite UI", "PHP API", "Socket.IO", "Doctor", "MySQL", "Pharmacy"]
    xs = [110, 330, 550, 770, 990, 1210, 1430]
    for x, name in zip(xs, actors):
        draw_box(d, (x - 80, 130, x + 80, 190), name, fill=LIGHT)
        d.line((x, 190, x, 1030), fill="#b8c8c0", width=2)
    steps = [
        (110, 330, 240, "Submit symptoms + chat/video request"),
        (330, 550, 300, "POST consultation"),
        (550, 1210, 360, "Save queued request"),
        (550, 990, 420, "Notify doctor queue"),
        (990, 550, 500, "Approve request"),
        (550, 1210, 560, "Assign doctor; activate communication"),
        (110, 770, 640, "Join chat/video room"),
        (990, 770, 700, "Join chat/video room"),
        (770, 1210, 760, "Persist chat messages"),
        (770, 110, 820, "Deliver realtime messages / video signalling"),
        (990, 550, 900, "Issue prescription or referral"),
        (550, 1210, 960, "Store RX, notes, audit"),
        (550, 1430, 1020, "Transmit prescription notification"),
    ]
    for x1, x2, y, label in steps:
        draw_arrow(d, (x1, y), (x2, y), fill=BLUE if "chat" in label.lower() or "video" in label.lower() else GREEN, width=4)
        d.text((min(x1, x2) + 12, y - 28), label, font=F_TINY, fill=TEXT)
    img.save(DIAGRAM_DIR / "sequence_diagram.png")


def diagram_state():
    img, d = save_canvas("state", (1600, 900))
    title(d, "Consultation State Machine", 1600)
    states = {
        "Queued": (110, 180, 360, 280),
        "Assigned": (500, 180, 750, 280),
        "In Progress": (890, 180, 1140, 280),
        "Prescribed": (280, 520, 530, 620),
        "Referred": (670, 520, 920, 620),
        "Completed": (1060, 520, 1310, 620),
        "Cancelled": (670, 720, 920, 820),
    }
    for name, rect in states.items():
        draw_box(d, rect, name, fill=LIGHT if name in ["Queued", "Assigned", "In Progress"] else "#ffffff")
    draw_arrow(d, (360, 230), (500, 230))
    d.text((390, 200), "Doctor approves", font=F_SMALL, fill=TEXT)
    draw_arrow(d, (750, 230), (890, 230))
    d.text((775, 200), "Chat/video active", font=F_SMALL, fill=TEXT)
    draw_arrow(d, (1015, 280), (405, 520))
    d.text((585, 375), "Doctor issues prescription", font=F_SMALL, fill=TEXT)
    draw_arrow(d, (1015, 280), (795, 520))
    d.text((850, 375), "Physical exam needed", font=F_SMALL, fill=TEXT)
    draw_arrow(d, (1015, 280), (1185, 520))
    d.text((1120, 375), "Advice only", font=F_SMALL, fill=TEXT)
    draw_arrow(d, (625, 280), (780, 720), fill=DANGER)
    d.text((585, 470), "Patient/doctor cancels", font=F_SMALL, fill=DANGER)
    img.save(DIAGRAM_DIR / "state_machine.png")


def diagram_activity():
    img, d = save_canvas("activity", (1600, 1050))
    title(d, "Activity Diagram - Main Workflow", 1600)
    lanes = [
        (60, 130, 510, 950, "Patient"),
        (575, 130, 1025, 950, "Doctor"),
        (1090, 130, 1540, 950, "Pharmacist/System"),
    ]
    for x1, y1, x2, y2, name in lanes:
        d.rounded_rectangle((x1, y1, x2, y2), radius=20, outline=BORDER, width=3, fill="#ffffff")
        d.rectangle((x1, y1, x2, y1 + 52), fill=LIGHT, outline=BORDER)
        draw_centered_text(d, (x1, y1, x2, y1 + 52), name, F_H, fill=DARK)
    patient_steps = [
        ("Register / log in", 205),
        ("Submit symptoms", 330),
        ("Request chat or video", 455),
        ("Wait for approval", 580),
        ("Join chat/video", 705),
        ("View/download history", 830),
    ]
    doctor_steps = [
        ("Review queue", 250),
        ("Approve request", 390),
        ("Review history and symptoms", 530),
        ("Chat/video consultation", 670),
        ("Prescribe, refer, or close", 810),
    ]
    system_steps = [
        ("Run triage and save request", 330),
        ("Persist messages and signal video", 605),
        ("Send prescription to pharmacy", 760),
        ("Dispense/update status", 880),
    ]
    def step(xc, y, text, w=300):
        rect = (xc - w // 2, y - 38, xc + w // 2, y + 38)
        draw_box(d, rect, text, fill=LIGHT)
        return rect
    prev = None
    for text, y in patient_steps:
        rect = step(285, y, text)
        if prev:
            draw_arrow(d, ((prev[0]+prev[2])//2, prev[3]), ((rect[0]+rect[2])//2, rect[1]))
        prev = rect
    prev = None
    for text, y in doctor_steps:
        rect = step(800, y, text)
        if prev:
            draw_arrow(d, ((prev[0]+prev[2])//2, prev[3]), ((rect[0]+rect[2])//2, rect[1]))
        prev = rect
    prev = None
    for text, y in system_steps:
        rect = step(1315, y, text)
        if prev:
            draw_arrow(d, ((prev[0]+prev[2])//2, prev[3]), ((rect[0]+rect[2])//2, rect[1]))
        prev = rect
    draw_arrow(d, (435, 455), (650, 390))
    draw_arrow(d, (950, 390), (1165, 330))
    draw_arrow(d, (435, 705), (650, 670), fill=BLUE)
    draw_arrow(d, (950, 670), (1165, 605), fill=BLUE)
    draw_arrow(d, (950, 810), (1165, 760))
    img.save(DIAGRAM_DIR / "activity_diagram.png")


def diagram_class():
    img, d = save_canvas("class", (1600, 1120))
    title(d, "Class / Data Model Diagram", 1600)
    boxes = [
        ((70, 135, 390, 305), "users", ["user_id PK", "full_name, email, password_hash", "role: patient/doctor/pharmacist", "is_active"]),
        ((450, 135, 770, 305), "patients", ["patient_id PK", "user_id FK", "dob, gender, address", "emergency_contact"]),
        ((830, 135, 1150, 305), "doctors", ["doctor_id PK", "user_id FK", "license_number", "specialisation, institution"]),
        ((1210, 135, 1530, 305), "pharmacists", ["pharmacist_id PK", "user_id FK", "pharmacy_name", "registration, address"]),
        ((70, 420, 390, 620), "consultations", ["consultation_id PK", "patient_id FK", "doctor_id FK", "communication_mode", "status, symptoms, triage"]),
        ((450, 420, 770, 620), "chat_messages", ["message_id PK", "consultation_id FK", "sender_user_id FK", "sender_role, message_text"]),
        ((830, 420, 1150, 620), "prescriptions", ["prescription_id PK", "consultation_id FK", "patient/doctor/pharmacist FK", "medication, dosage, status"]),
        ((1210, 420, 1530, 620), "drugs", ["drug_id PK", "name, strength, form", "common_dosage", "common_frequency"]),
        ((70, 735, 390, 935), "health_records", ["record_id PK", "patient_id FK", "consultation_id FK", "title, content, created_at"]),
        ((450, 735, 770, 935), "allergies / conditions", ["allergy_id / condition_id PK", "patient_id FK", "severity / diagnosed_date", "reaction / notes"]),
        ((830, 735, 1150, 935), "referrals", ["referral_id PK", "consultation_id FK", "clinic details", "appointment date/time"]),
        ((1210, 735, 1530, 935), "audit_logs / notifications", ["actor_user_id", "action, entity_type", "related_id", "title/message"]),
    ]
    for rect, head, fields in boxes:
        draw_box(d, rect, head, fields, fill="#ffffff")
    links = [
        ((390, 220), (450, 220)), ((390, 220), (830, 220)), ((390, 220), (1210, 220)),
        ((230, 305), (230, 420)), ((610, 305), (230, 420)), ((990, 305), (230, 420)),
        ((390, 520), (450, 520)), ((390, 520), (830, 520)), ((390, 520), (70, 735)),
        ((990, 620), (990, 735)), ((990, 620), (1370, 735)),
    ]
    for start, end in links:
        draw_arrow(d, start, end, fill=MUTED, width=3)
    img.save(DIAGRAM_DIR / "class_data_model.png")


def generate_diagrams():
    diagram_conceptual()
    diagram_architecture()
    diagram_context()
    diagram_use_case()
    diagram_sequence()
    diagram_state()
    diagram_activity()
    diagram_class()


def clear_and_set(paragraph, text, bold=False, align=None):
    paragraph.clear()
    run = paragraph.add_run(text)
    run.bold = bold
    run.font.size = Pt(10.5)
    if align is not None:
        paragraph.alignment = align


def set_caption(paragraph, text):
    clear_and_set(paragraph, text, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)


def insert_picture_after(paragraph, path, width=6.35):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    new_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = new_para.add_run()
    run.add_picture(str(path), width=Inches(width))
    return new_para


def insert_paragraph_after(paragraph, text=None, bold=False, align=None):
    new_p = OxmlElement("w:p")
    paragraph._p.addnext(new_p)
    new_para = Paragraph(new_p, paragraph._parent)
    if text:
        clear_and_set(new_para, text, bold=bold, align=align)
    return new_para


def remove_paragraph(paragraph):
    element = paragraph._element
    parent = element.getparent()
    if parent is not None:
        parent.remove(element)


def find_para(doc, startswith):
    for paragraph in doc.paragraphs:
        if paragraph.text.strip().startswith(startswith):
            return paragraph
    raise ValueError(f"Paragraph not found: {startswith}")


def replace_text(doc, startswith, replacement):
    paragraph = find_para(doc, startswith)
    paragraph.text = replacement


def update_tables(doc):
    # Sprint plan
    table = doc.tables[2]
    table.rows[3].cells[1].text = (
        "Frontend development using React.js with Vite, HTML5, CSS3, and JavaScript. "
        "Implementation of responsive dashboards, authentication screens, consultation request forms, "
        "records, prescriptions, referrals, and mobile navigation."
    )
    table.rows[4].cells[1].text = (
        "Backend development using PHP REST routes on XAMPP/Apache with MySQL, plus a Node.js Socket.IO "
        "service for real-time chat persistence and WebRTC video signalling. Implementation of RBAC, "
        "consultation approval, e-prescriptions, pharmacy workflow, patient records, audit logs, and notifications."
    )
    table.rows[5].cells[1].text = (
        "System integration, LAN/mobile testing, chat and video-call testing, responsive-layout bug fixing, "
        "record export, performance optimisation, documentation, and final evaluation."
    )

    # Patient requirements
    table = doc.tables[3]
    table.rows[4].cells[1].text = (
        "The system shall allow patients to request either a chat or video consultation and wait for a doctor "
        "to approve the request before the communication module becomes active."
    )
    table.rows[5].cells[1].text = (
        "The system shall enable patients to communicate with doctors through real-time chat and, where approved, "
        "a local video consultation module during an active consultation."
    )
    table.rows[6].cells[1].text = (
        "The system shall allow patients to view their consultation history, electronic prescriptions, referrals, "
        "doctor notes, allergies, chronic conditions, and download a full medical-history export."
    )

    # Doctor requirements
    table = doc.tables[4]
    table.rows[3].cells[1].text = (
        "The system shall allow doctors to view incoming consultation requests and explicitly approve a requested "
        "chat or video consultation before communication begins."
    )
    table.rows[5].cells[1].text = (
        "The system shall enable doctors to communicate with patients through real-time chat and approved local video "
        "consultations during the consultation session."
    )
    table.rows[6].cells[1].text = (
        "The system shall allow doctors to generate electronic prescriptions by selecting a medicine from the drug "
        "catalogue or manually entering medicine name, form, dosage, frequency, duration, and instructions."
    )

    # System requirements
    table = doc.tables[6]
    extras = [
        ("FR-S-07", "The system shall persist real-time chat messages and expose them in chronological order whenever the consultation page is reopened."),
        ("FR-S-08", "The system shall support approved local video consultations using Socket.IO signalling and browser WebRTC media APIs."),
        ("FR-S-09", "The system shall provide a responsive interface whose sidebar, header, and content areas adjust correctly on desktop and mobile screens."),
    ]
    existing = {row.cells[0].text.strip() for row in table.rows}
    for rid, desc in extras:
        if rid not in existing:
            cells = table.add_row().cells
            cells[0].text = rid
            cells[1].text = desc

    # Database design table
    table = doc.tables[8]
    db_rows = [
        ("referrals", "Stores referral appointments created when a physical examination or clinic visit is required."),
        ("allergies", "Stores patient allergy records, severity levels, and reactions used during prescribing review."),
        ("chronic_conditions", "Stores long-term conditions and notes visible to the doctor before prescribing."),
        ("chat_messages", "Stores consultation chat messages with sender role and timestamp for persistent real-time chat history."),
        ("drugs", "Stores the structured drug catalogue, common dosage, form, frequency, and notes for safer prescribing."),
        ("audit_logs", "Stores traceable events for prescription creation, transmission, dispensing, and other sensitive actions."),
    ]
    existing = {row.cells[0].text.strip().lower() for row in table.rows}
    for name, desc in db_rows:
        if name.lower() not in existing:
            cells = table.add_row().cells
            cells[0].text = name
            cells[1].text = desc

    # Use case summaries
    doc.tables[9].rows[4].cells[1].text = (
        "1. Patient navigates to the new consultation page. 2. Patient selects symptoms and enters a free-text complaint. "
        "3. Patient chooses chat or video as the requested consultation mode. 4. The system calculates a triage recommendation "
        "and stores the request as queued. 5. A doctor reviews and approves the request before chat/video becomes available."
    )
    doc.tables[10].rows[4].cells[1].text = (
        "1. Doctor reviews submitted symptoms, triage result, allergies, chronic conditions, and past records. "
        "2. Doctor selects a medicine from the catalogue or chooses manual medicine entry. 3. Doctor enters dosage, frequency, "
        "duration, instructions, and pharmacy. 4. The system generates a unique prescription ID and transmits it to the selected pharmacy."
    )

    # Technology table
    table = doc.tables[12]
    updates = {
        "React.js": "Frontend library used with Vite to build reusable UI components, role-based dashboards, consultation screens, records, and responsive navigation.",
        "Node.js": "Runtime used for the separate Socket.IO service that persists chat messages and handles WebRTC video-call signalling for local development.",
        "PHP": "Server-side language used for the REST API routes running under Apache/XAMPP, including authentication, RBAC, consultations, prescriptions, records, referrals, and notifications.",
        "MySQL": "Relational database used to store persistent system data including accounts, consultations, chat messages, prescriptions, drugs, records, referrals, audit logs, allergies, and conditions.",
        "XAMPP": "Local development server stack that hosts Apache, PHP, and MySQL for development, testing, and LAN access from mobile devices.",
        "Postman": "API testing tool used to test and validate PHP REST endpoints and supporting service calls before frontend integration.",
    }
    for row in table.rows:
        key = row.cells[0].text.strip()
        if key in updates:
            row.cells[1].text = updates[key]
    existing = {row.cells[0].text.strip() for row in table.rows}
    additions = [
        ("Vite", "Frontend development and build tool used to run the React app locally and compile production assets into the public folder."),
        ("Socket.IO", "Real-time messaging library used for consultation room membership, chat delivery, chat persistence, and video signalling events."),
        ("WebRTC", "Browser media technology used for local patient-doctor video calls after a doctor approves the consultation request."),
    ]
    for tool, role in additions:
        if tool not in existing:
            cells = table.add_row().cells
            cells[0].text = tool
            cells[1].text = role

    # End-user hardware
    table = doc.tables[14]
    table.rows[5].cells[1].text = (
        "Minimum 1 Mbps broadband or mobile data connection for standard consultation and prescription features; stronger local Wi-Fi is recommended for video calls."
    )
    if not any("Camera" in row.cells[0].text for row in table.rows):
        cells = table.add_row().cells
        cells[0].text = "Camera / Microphone"
        cells[1].text = "Required only for video consultations; chat consultations remain available without camera or microphone access."


def patch_document():
    doc = Document(INPUT)

    replacements = {
        "Feasibility Check: Each requirement will be assessed": (
            "Feasibility Check: Each requirement was assessed against the selected implementation stack: React.js with Vite for the frontend, "
            "PHP REST routes on a local XAMPP/Apache server, MySQL for persistence, and a Node.js Socket.IO service for real-time chat and local video-call signalling."
        ),
        "The software design specifications describe": (
            "The software design specifications describe the implemented architectural structure, data models, and interface designs that guide the Web-Based Telemedicine Platform. "
            "The design follows separation of concerns across a React/Vite presentation layer, PHP REST API layer, Socket.IO real-time service, and MySQL data layer."
        ),
        "The proposed system follows a three-tier": (
            "The implemented system follows a three-tier client-server architecture with an additional real-time communication service:"
        ),
        "Presentation Layer (Frontend): Built using HTML": (
            "Presentation Layer (Frontend): Built using React.js with Vite, HTML5, CSS3, and JavaScript, the presentation layer delivers responsive dashboards for patients, doctors, and pharmacists. "
            "It handles consultation requests, symptom selection, chat/video panels, prescriptions, records, referrals, overview KPIs, and mobile navigation."
        ),
        "Application Layer (Backend): Built using Node.js and PHP": (
            "Application Layer (Backend): Built primarily as PHP REST routes running on Apache/XAMPP, the backend enforces authentication, role-based access control, consultation approval, prescription workflow, medical records, referrals, notifications, and audit logging. "
            "A separate Node.js Socket.IO service supports real-time chat persistence and WebRTC video-call signalling."
        ),
        "Data Layer (Database): Built using MySQL": (
            "Data Layer (Database): Built using MySQL, the data layer stores user accounts, patient profiles, consultations, chat messages, prescriptions, the drug catalogue, pharmacies, health records, allergies, chronic conditions, referrals, notifications, and audit logs."
        ),
        "The database will be designed": (
            "The database is designed using a relational model in MySQL. The following core tables form the current database schema:"
        ),
        "This chapter presented the complete methodology": (
            "This chapter presented the methodology for designing and implementing the Web-Based Telemedicine Platform with an Electronic Prescription Management System. "
            "Agile Scrum supported iterative development of the consultation, prescription, record, referral, pharmacy, chat, video, and mobile-responsive modules."
        ),
        "The software design specifications detailed": (
            "The software design specifications detailed the current architecture, MySQL schema, real-time communication service, and use case descriptions. "
            "The technology stack comprises React.js with Vite, PHP REST APIs on XAMPP/Apache, MySQL, Node.js Socket.IO, and browser WebRTC for local video consultations."
        ),
        "The proposed system adopts a three-tier client-server architecture": (
            "The implemented system adopts a three-tier client-server architecture supported by a separate real-time communication service. "
            "The architecture comprises a React/Vite Presentation Layer, a PHP REST Application Layer, a MySQL Data Layer, and a Node.js Socket.IO service for persistent chat and video signalling."
        ),
        "Presentation Layer (Frontend): This layer is responsible": (
            "Presentation Layer (Frontend): This layer is responsible for the user interface and interaction. It is built with React.js, Vite, HTML, CSS, and JavaScript, providing responsive dashboards for patients, doctors, and pharmacists. "
            "It handles symptom submission, consultation requests, approved chat/video panels, prescriptions, referrals, record export, profile management, and mobile navigation."
        ),
        "Application Layer (Backend): Developed using Node.js and PHP": (
            "Application Layer (Backend): The primary backend is implemented as PHP REST routes under Apache/XAMPP. It manages authentication, role-based access control, consultation approval, prescriptions, records, referrals, notifications, and audit logs. "
            "Node.js is used as a dedicated Socket.IO service for real-time chat and video-call signalling."
        ),
        "Data Layer (Database): This layer consists": (
            "Data Layer (Database): This layer consists of a MySQL relational database storing accounts, profiles, consultations, chat messages, prescriptions, drug catalogue entries, pharmacy records, allergies, chronic conditions, health records, referrals, notifications, and audit events."
        ),
        "Mermaid syntax was utilized": (
            "The software diagrams were updated as rendered PNG figures to reflect the implemented React/Vite frontend, PHP API, MySQL database, Socket.IO chat/video service, WebRTC video flow, and current consultation workflow."
        ),
        "The contextual model, also known": (
            "The contextual model illustrates how patients, doctors, pharmacists, and referral clinics interact with the Web-Based Telemedicine Platform. It shows consultation requests, approved chat/video communication, e-prescriptions, pharmacy updates, patient records, and referral information crossing the system boundary."
        ),
        "The use case model describes": (
            "The use case model describes the implemented functional requirements from the perspective of patients, doctors, pharmacists, and the system. It includes registration, consultation requests, doctor approval, chat/video communication, prescription management, manual medicine entry, records export, pharmacy dispensing, and referrals."
        ),
        "The sequence diagram illustrates": (
            "The sequence diagram illustrates the time-ordered interaction for a typical consultation: a patient submits symptoms and requests chat or video, the doctor approves the request, the platform activates chat/video communication, the doctor reviews the record, then prescribes, refers, or closes the case."
        ),
        "The state machine diagram models": (
            "The state machine diagram models the consultation lifecycle from queued request through doctor approval, active communication, and final outcomes such as prescribed, referred, completed, or cancelled."
        ),
        "An activity diagram depicts": (
            "The activity diagram depicts the implemented workflow across patient, doctor, pharmacist, and system responsibilities, including symptom capture, doctor approval, chat/video consultation, prescription routing, dispensing, and record access."
        ),
        "The class diagram provides": (
            "The class/data model diagram provides a static view of the current database-backed system, including users, role profiles, consultations, chat messages, prescriptions, drug catalogue records, health records, referrals, allergies, conditions, notifications, and audit logs."
        ),
    }
    for startswith, replacement in replacements.items():
        replace_text(doc, startswith, replacement)

    update_tables(doc)

    # Captions and diagrams.
    captions = [
        ("Figure 4.2.1", "Figure 4.2.1: Current Architectural Design", "architecture.png"),
        ("Figure 4.3.2.1", "Figure 4.3.2.1 Contextual Model", "context_model.png"),
        ("Figure 4.3.2.2", "Figure 4.3.2.2 Use Case Model", "use_case_model.png"),
        ("Figure 4.3.2.3", "Figure 4.3.2.3: Sequence Diagram", "sequence_diagram.png"),
        ("Figure 4.3.2.4", "Figure 4.3.2.4: State Machine Diagram", "state_machine.png"),
        ("Figure 4.3.2.5", "Figure 4.3.2.5: Activity Diagram", "activity_diagram.png"),
        ("Figure 4.3.2.6", "Figure 4.3.2.6: Class / Data Model Diagram", "class_data_model.png"),
    ]

    original_paragraphs = list(doc.paragraphs)
    removal_ranges = [
        range(110, 122),
        range(359, 373),
        range(391, 408),
        range(411, 432),
        range(435, 466),
        range(469, 496),
        range(499, 517),
        range(520, 535),
    ]
    to_remove = []
    for rng in removal_ranges:
        for idx in rng:
            if idx < len(original_paragraphs):
                to_remove.append(original_paragraphs[idx])

    conceptual_heading = find_para(doc, "Conceptual Framework")
    conceptual_caption = insert_paragraph_after(
        conceptual_heading,
        "Figure 1.8.1 Conceptual Framework for the Current Web-Based Telemedicine Platform with Electronic Prescription Management System",
        bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
    )
    insert_picture_after(conceptual_caption, DIAGRAM_DIR / "conceptual_framework.png")

    for startswith, caption_text, filename in captions:
        paragraph = find_para(doc, startswith)
        set_caption(paragraph, caption_text)
        insert_picture_after(paragraph, DIAGRAM_DIR / filename)

    for paragraph in to_remove:
        remove_paragraph(paragraph)

    doc.save(OUTPUT)


if __name__ == "__main__":
    generate_diagrams()
    patch_document()
    print(OUTPUT)
