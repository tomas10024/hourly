"""Low-fidelity wireframes for Hourly (lab 3).

Run `python docs/wireframes/generate.py`; the SVGs are written next to this file.
Each screen is drawn twice: a desktop frame (1280 px, >= 768 px breakpoint)
and a phone frame (390 px). Grayscale on purpose: colour and effects belong to
the implementation, the wireframe only fixes layout and content order.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent
FONT = "Arial, Helvetica, sans-serif"
C = {
    "canvas": "#f4f4f5", "frame": "#ffffff", "line": "#a1a1aa", "soft": "#d4d4d8",
    "block": "#e4e4e7", "block2": "#d4d4d8", "text": "#18181b", "muted": "#71717a",
    "note": "#2563eb", "dark": "#18181b",
}

DW, MW = 1280, 390          # frame widths
CHROME = 32                 # browser / phone status bar
DX, MX = 40, 1380           # frame x positions
TOP = 120                   # frames start


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Ctx:
    """Drawing context with an origin; all coordinates are frame-relative."""

    def __init__(self, parts, ox, oy, w):
        self.p, self.ox, self.oy, self.w = parts, ox, oy, w

    # primitives ---------------------------------------------------------
    def rect(self, x, y, w, h, fill=None, stroke=None, r=6, dash=None, sw=1, opacity=None):
        fill = C["block"] if fill is None else fill
        a = f'x="{self.ox + x}" y="{self.oy + y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"'
        if stroke:
            a += f' stroke="{stroke}" stroke-width="{sw}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        if opacity is not None:
            a += f' fill-opacity="{opacity}"'
        self.p.append(f"<rect {a}/>")

    def line(self, x1, y1, x2, y2, stroke=None, sw=1, dash=None):
        a = f'x1="{self.ox + x1}" y1="{self.oy + y1}" x2="{self.ox + x2}" y2="{self.oy + y2}" stroke="{stroke or C["line"]}" stroke-width="{sw}"'
        if dash:
            a += f' stroke-dasharray="{dash}"'
        self.p.append(f"<line {a}/>")

    def circle(self, cx, cy, r, fill="none", stroke=None, sw=1.5):
        self.p.append(f'<circle cx="{self.ox + cx}" cy="{self.oy + cy}" r="{r}" fill="{fill}" stroke="{stroke or C["muted"]}" stroke-width="{sw}"/>')

    def text(self, x, y, s, size=14, weight=400, fill=None, anchor="start", italic=False):
        style = ' font-style="italic"' if italic else ""
        self.p.append(
            f'<text x="{self.ox + x}" y="{self.oy + y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill or C["text"]}" text-anchor="{anchor}"{style}>{esc(s)}</text>'
        )

    # components ---------------------------------------------------------
    def img(self, x, y, w, h, label="Paveiksliukas"):
        self.rect(x, y, w, h, fill=C["block"], stroke=C["line"], r=8)
        self.line(x, y, x + w, y + h, stroke=C["soft"])
        self.line(x + w, y, x, y + h, stroke=C["soft"])
        self.rect(x + w / 2 - len(label) * 3.6 - 10, y + h / 2 - 14, len(label) * 7.2 + 20, 28, fill="#ffffff", r=4)
        self.text(x + w / 2, y + h / 2 + 5, label, 13, fill=C["muted"], anchor="middle")

    def bars(self, x, y, w, n=3, gap=16, h=8):
        for i in range(n):
            ww = w * (0.62 if i == n - 1 and n > 1 else 1)
            self.rect(x, y + i * gap, ww, h, fill=C["block"], r=4)
        return y + n * gap

    def btn(self, x, y, w, label, kind="primary", h=36, icon=False):
        if kind == "primary":
            self.rect(x, y, w, h, fill=C["dark"], r=h / 2)
            col = "#ffffff"
        elif kind == "secondary":
            self.rect(x, y, w, h, fill="#ffffff", stroke=C["line"], r=h / 2)
            col = C["text"]
        elif kind == "danger":
            self.rect(x, y, w, h, fill="#ffffff", stroke=C["text"], r=h / 2, dash="4 3")
            col = C["text"]
        else:
            col = C["muted"]
        tx = x + w / 2
        if icon:
            self.rect(x + 14, y + h / 2 - 6, 12, 12, fill="none", stroke=col, r=2)
            tx += 8
        self.text(tx, y + h / 2 + 5, label, 13, 600 if kind != "ghost" else 400, fill=col, anchor="middle")

    def field(self, x, y, w, label, kind="text", value="", h=36):
        self.text(x, y, label, 12, 600)
        by = y + 8
        hh = 84 if kind == "textarea" else h
        self.rect(x, by, w, hh, fill="#ffffff", stroke=C["line"], r=8)
        if value:
            self.text(x + (36 if kind == "search" else 12), by + 23, value.strip(), 13, fill=C["muted"])
        if kind == "select":
            self.text(x + w - 16, by + 23, "▾", 13, fill=C["muted"], anchor="middle")
        elif kind == "date":
            self.rect(x + w - 28, by + 11, 14, 14, fill="none", stroke=C["muted"], r=2)
            self.line(x + w - 28, by + 16, x + w - 14, by + 16, stroke=C["muted"])
        elif kind == "number":
            self.text(x + w - 16, by + 17, "▴", 10, fill=C["muted"], anchor="middle")
            self.text(x + w - 16, by + 29, "▾", 10, fill=C["muted"], anchor="middle")
        elif kind == "search":
            self.circle(x + 18, by + 16, 6, stroke=C["muted"])
            self.line(x + 22, by + 21, x + 27, by + 26, stroke=C["muted"], sw=1.5)
        elif kind == "password":
            self.text(x + 12, by + 24, "••••••••", 13, fill=C["muted"])
        return by + hh

    def switch(self, x, y, label, on=True):
        self.rect(x, y, 36, 20, fill=C["dark"] if on else C["block2"], r=10)
        self.circle(x + (26 if on else 10), y + 10, 7, fill="#ffffff", stroke="#ffffff")
        self.text(x + 46, y + 15, label, 13)

    def checkbox(self, x, y, label, on=True):
        self.rect(x, y, 16, 16, fill=C["dark"] if on else "#ffffff", stroke=C["line"], r=3)
        if on:
            self.text(x + 8, y + 13, "✓", 12, 700, fill="#ffffff", anchor="middle")
        self.text(x + 26, y + 13, label, 13)

    def radio_cards(self, x, y, w, label, options, selected=0):
        self.text(x, y, label, 12, 600)
        n = len(options)
        cw = (w - (n - 1) * 8) / n
        for i, (t, sub) in enumerate(options):
            cx = x + i * (cw + 8)
            self.rect(cx, y + 8, cw, 52, fill="#ffffff", stroke=C["dark"] if i == selected else C["line"], sw=2 if i == selected else 1, r=8)
            self.circle(cx + 16, y + 26, 5, fill=C["dark"] if i == selected else "none")
            self.text(cx + 28, y + 30, t, 13, 600)
            self.text(cx + 28, y + 48, sub, 11, fill=C["muted"])
        return y + 60

    def badge(self, x, y, label, dashed=False):
        w = len(label) * 6.6 + 18
        self.rect(x, y, w, 22, fill="#ffffff", stroke=C["line"], r=6, dash="3 2" if dashed else None)
        self.text(x + w / 2, y + 15, label, 11, 600, fill=C["muted"], anchor="middle")
        return x + w + 8

    def icon(self, x, y, s=16):
        self.rect(x, y, s, s, fill="none", stroke=C["muted"], r=3, sw=1.5)

    def label(self, x, y, s):
        self.text(x, y, s.upper(), 11, 700, fill=C["muted"])

    def card(self, x, y, w, h):
        self.rect(x, y, w, h, fill="#ffffff", stroke=C["soft"], r=14)

    def hamburger(self, x, y):
        self.rect(x, y, 36, 36, fill="#ffffff", stroke=C["line"], r=10)
        for i in range(3):
            self.line(x + 10, y + 12 + i * 6, x + 26, y + 12 + i * 6, stroke=C["text"], sw=2)

    def logo(self, x, y, size=17):
        self.rect(x, y - 13, 16, 16, fill=C["dark"], r=2)
        self.text(x + 24, y, "hourly", size, 700)

    def overlay(self, h):
        self.rect(0, 0, self.w, h, fill=C["dark"], r=0, opacity=0.45)

    def table(self, x, y, w, cols, rows, widths=None, row_h=44):
        widths = widths or [1] * len(cols)
        tot = sum(widths)
        xs, cx = [], x
        for wt in widths:
            xs.append(cx)
            cx += w * wt / tot
        for i, c in enumerate(cols):
            self.text(xs[i] + 12, y + 14, c.upper(), 10.5, 700, fill=C["muted"])
        self.line(x, y + 24, x + w, y + 24, stroke=C["soft"])
        yy = y + 24
        for r in rows:
            for i, cell in enumerate(r):
                if cell == "~":
                    self.rect(xs[i] + 12, yy + row_h / 2 - 4, (w * widths[i] / tot) * 0.6, 8, r=4)
                elif cell.startswith("[") and cell.endswith("]"):
                    self.badge(xs[i] + 12, yy + row_h / 2 - 11, cell[1:-1])
                elif cell == "⋯":
                    self.rect(xs[i] + 12, yy + row_h / 2 - 14, 28, 28, fill="#ffffff", stroke=C["line"], r=8)
                    self.text(xs[i] + 26, yy + row_h / 2 + 4, "⋯", 14, 700, fill=C["muted"], anchor="middle")
                else:
                    self.text(xs[i] + 12, yy + row_h / 2 + 5, cell, 13)
            yy += row_h
            self.line(x, yy, x + w, yy, stroke=C["block"])
        return yy

    def modal(self, x, y, w, h, title):
        self.rect(x + 6, y + 10, w, h, fill=C["dark"], r=18, opacity=0.18)
        self.rect(x, y, w, h, fill="#ffffff", stroke=C["line"], r=18)
        self.text(x + 24, y + 38, title, 22, 400)
        self.text(x + w - 28, y + 36, "✕", 16, fill=C["muted"], anchor="middle")
        self.line(x, y + 60, x + w, y + 60, stroke=C["soft"])
        return y + 84

    def modal_foot(self, x, y, w, primary, secondary="Atšaukti"):
        self.line(x, y, x + w, y, stroke=C["soft"])
        self.btn(x + w - 24 - 130, y + 16, 130, primary)
        self.btn(x + w - 24 - 130 - 110, y + 16, 100, secondary, "ghost")
        return y + 68


# ---------------------------------------------------------------- layouts
def marketing_header(c, mobile, active=None):
    w = c.w
    c.logo(24 if mobile else 80, 40)
    if mobile:
        c.hamburger(w - 24 - 36, 22)
    else:
        x = 640
        for item in ["Aikštelė", "Kaip veikia", "API"]:
            c.icon(x, 28, 14)
            c.text(x + 22, 40, item, 14, 600 if item == active else 400, fill=C["text"] if item == active else C["muted"])
            x += 120
        c.btn(1000, 22, 90, "Prisijungti", "ghost")
        c.btn(1090, 22, 110, "Registruotis")
    c.line(0, 80, w, 80, stroke=C["soft"])
    return 80


def marketing_footer(c, y, mobile):
    w = c.w
    c.line(0, y, w, y, stroke=C["soft"])
    if mobile:
        c.logo(24, y + 40, 15)
        c.bars(24, y + 58, 220, 2)
        for i, h in enumerate(["Produktas", "Ištekliai"]):
            c.label(24 + i * 180, y + 120, h)
            c.bars(24 + i * 180, y + 134, 120, 3)
        c.circle(30, y + 204, 4, fill=C["muted"])
        c.text(42, y + 208, "API veikia", 12, fill=C["muted"])
        return y + 230
    c.logo(80, y + 44, 15)
    c.bars(80, y + 62, 260, 2)
    c.circle(86, y + 112, 4, fill=C["muted"])
    c.text(98, y + 116, "API veikia (/health/ready)", 12, fill=C["muted"])
    for i, h in enumerate(["Produktas", "Ištekliai", "Paskyra"]):
        c.label(560 + i * 220, y + 44, h)
        c.bars(560 + i * 220, y + 60, 120, 3)
    return y + 150


APP_NAV = [("Apžvalga", "grid"), ("Projektai", "folder"), ("Aikštelė", "brief"), ("Pasiūlymai", "send"),
           ("Darbo žurnalas", "clock"), ("Paskyra", "user")]
ADMIN_NAV = ["Naudotojai", "Visi projektai"]


def app_shell(c, h, mobile, active, title, actions=None):
    """Sidebar + top bar + thin footer. Returns (content x, content y, content width)."""
    w = c.w
    if mobile:
        c.hamburger(16, 14)
        c.text(64, 38, title, 17, 700)
        c.rect(w - 16 - 92, 18, 92, 28, fill="#ffffff", stroke=C["line"], r=14)
        c.circle(w - 16 - 78, 32, 4, fill=C["dark"], stroke=C["dark"])
        c.text(w - 16 - 66, 37, "01:23:10", 12, 600)
        c.line(0, 64, w, 64, stroke=C["soft"])
        c.line(0, h - 40, w, h - 40, stroke=C["soft"])
        c.text(16, h - 16, "v0.3 · API veikia", 11, fill=C["muted"])
        return 16, 88, w - 32
    sw = 240
    c.rect(0, 0, sw, h, fill="#fafafa", r=0)
    c.line(sw, 0, sw, h, stroke=C["soft"])
    c.logo(24, 40)
    y = 84
    for name, _ in APP_NAV:
        if name == active:
            c.rect(12, y - 20, sw - 24, 34, fill=C["block"], r=8)
        c.icon(26, y - 11, 16)
        c.text(54, y + 2, name, 14, 600 if name == active else 400, fill=C["text"] if name == active else C["muted"])
        y += 40
    c.label(26, y + 10, "Administravimas")
    y += 40
    for name in ADMIN_NAV:
        if name == active:
            c.rect(12, y - 20, sw - 24, 34, fill=C["block"], r=8)
        c.icon(26, y - 11, 16)
        c.text(54, y + 2, name, 14, 600 if name == active else 400, fill=C["text"] if name == active else C["muted"])
        y += 40
    c.line(0, h - 72, sw, h - 72, stroke=C["soft"])
    c.circle(40, h - 36, 14, fill=C["block"], stroke=C["line"])
    c.text(64, h - 40, "Tomas Jankauskas", 13, 600)
    c.text(64, h - 24, "Specialistas", 11, fill=C["muted"])
    # top bar
    c.text(sw + 32, 44, title, 20, 700)
    c.rect(w - 32 - 36 - 12 - 120, 22, 120, 32, fill="#ffffff", stroke=C["line"], r=16)
    c.circle(w - 32 - 36 - 12 - 120 + 18, 38, 4, fill=C["dark"], stroke=C["dark"])
    c.text(w - 32 - 36 - 12 - 120 + 30, 43, "01:23:10", 13, 600)
    c.circle(w - 32 - 18, 38, 16, fill=C["block"], stroke=C["line"])
    if actions:
        x = w - 32 - 36 - 12 - 120 - 16
        for label, kind in reversed(actions):
            bw = len(label) * 7.4 + 36
            x -= bw
            c.btn(x, 20, bw, label, kind, icon=kind == "primary")
            x -= 10
    c.line(sw, 76, w, 76, stroke=C["soft"])
    c.line(sw, h - 40, w, h - 40, stroke=C["soft"])
    c.text(sw + 32, h - 16, "v0.3 · API veikia · /api/docs", 11, fill=C["muted"])
    return sw + 32, 108, w - sw - 64


# ---------------------------------------------------------------- screens
def w1(d, m):
    # desktop
    y = marketing_header(d, False)
    d.label(80, y + 70, "// laiko apskaita · darbų aikštelė")
    d.text(80, y + 140, "Laikas, kurį galima", 56, 400)
    d.text(80, y + 204, "parodyti", 56, 400, italic=True)
    d.bars(80, y + 240, 480, 3)
    d.btn(80, y + 312, 170, "Registruotis")
    d.btn(262, y + 312, 170, "Naršyti aikštelę", "secondary")
    d.img(680, y + 48, 520, 330, "Programos ekrano nuotrauka")
    y += 440
    d.line(80, y, 1200, y, stroke=C["soft"])
    d.label(80, y + 50, "// funkcijos")
    d.text(80, y + 92, "Ką gali Hourly", 36)
    for i, t in enumerate(["Laikmatis prie užduoties", "Ataskaita ir CSV", "Peržiūros nuoroda"]):
        x = 80 + i * 384
        d.card(x, y + 120, 352, 300)
        d.img(x + 16, y + 136, 320, 170, "Nuotrauka")
        d.text(x + 20, y + 340, t, 16, 700)
        d.bars(x + 20, y + 358, 300, 3, gap=14)
    y += 470
    d.label(80, y + 20, "// rolės")
    d.text(80, y + 62, "Kam skirta", 36)
    for i, t in enumerate(["Užsakovas", "Specialistas", "Tiesioginis darbas"]):
        x = 80 + i * 384
        d.card(x, y + 90, 352, 150)
        d.rect(x + 20, y + 110, 64, 22, fill=C["block2"], r=4)
        d.text(x + 20, y + 160, t, 16, 700)
        d.bars(x + 20, y + 178, 300, 3, gap=14)
    y += 280
    d.rect(80, y, 1120, 140, fill=C["block"], r=18)
    d.text(112, y + 64, "Pradėk registruoti laiką šiandien", 30)
    d.bars(112, y + 86, 380, 1)
    d.btn(1020, y + 52, 150, "Registruotis")
    y += 190
    yd = marketing_footer(d, y, False)

    # mobile
    y = marketing_header(m, True)
    m.label(24, y + 48, "// laiko apskaita")
    m.text(24, y + 96, "Laikas, kurį", 38)
    m.text(24, y + 138, "galima parodyti", 38, italic=True)
    m.bars(24, y + 164, 330, 3)
    m.btn(24, y + 224, 342, "Registruotis")
    m.btn(24, y + 270, 342, "Naršyti aikštelę", "secondary")
    m.img(24, y + 330, 342, 214, "Ekrano nuotrauka")
    y += 590
    m.label(24, y, "// funkcijos")
    m.text(24, y + 36, "Ką gali Hourly", 26)
    y += 56
    for t in ["Laikmatis prie užduoties", "Ataskaita ir CSV", "Peržiūros nuoroda"]:
        m.card(24, y, 342, 246)
        m.img(36, y + 12, 318, 140, "Nuotrauka")
        m.text(40, y + 182, t, 15, 700)
        m.bars(40, y + 198, 290, 2, gap=14)
        y += 262
    m.label(24, y + 20, "// rolės")
    m.text(24, y + 56, "Kam skirta", 26)
    y += 76
    for t in ["Užsakovas", "Specialistas", "Tiesioginis darbas"]:
        m.card(24, y, 342, 110)
        m.text(40, y + 34, t, 15, 700)
        m.bars(40, y + 52, 290, 3, gap=14)
        y += 122
    m.rect(24, y + 8, 342, 150, fill=C["block"], r=18)
    m.text(44, y + 52, "Pradėk registruoti", 22)
    m.text(44, y + 80, "laiką šiandien", 22)
    m.btn(44, y + 102, 302, "Registruotis")
    y += 190
    ym = marketing_footer(m, y, True)
    return yd, ym, [
        "Header lipnus; ≥ 768px – navigacija su ikonomis, < 768px – hamburger (stalčius kaip W5).",
        "Paveiksliukai: hero ir 3 funkcijų nuotraukos; plotis kinta su langu (next/image, sizes).",
        "Svečias mato „Registruotis“; prisijungusiam vietoj to – „Į programą“.",
        "Footer: API būsena iš GET /health/ready.",
    ]


def w2(d, m):
    d.logo(80, 52)
    d.card(80, 120, 520, 640)
    d.text(112, 184, "Sukurti paskyrą", 34)
    d.bars(112, 204, 360, 1)
    y = d.field(112, 250, 456, "Vardas arba įmonės pavadinimas", value="Tomas Jankauskas")
    y = d.field(112, y + 28, 456, "El. paštas", "text", "tomas@frontend.lt")
    y = d.field(112, y + 28, 456, "Slaptažodis", "password")
    y = d.radio_cards(112, y + 28, 456, "Rolė", [("Užsakovas", "skelbiu darbus"), ("Specialistas", "atlieku darbus")], 1)
    d.checkbox(112, y + 24, "Sutinku su naudojimo taisyklėmis")
    d.btn(112, y + 64, 456, "Registruotis")
    d.text(340, y + 128, "Jau turi paskyrą? Prisijungti", 13, fill=C["muted"], anchor="middle")
    d.img(660, 120, 540, 640, "Programos ekrano nuotrauka")
    d.line(0, 820, 1280, 820, stroke=C["soft"])
    d.text(80, 852, "© Hourly · KTU T120B165", 12, fill=C["muted"])

    m.logo(24, 44)
    m.text(24, 110, "Sukurti paskyrą", 30)
    m.bars(24, 130, 300, 1)
    y = m.field(24, 172, 342, "Vardas arba įmonės pavadinimas", value="Tomas Jankauskas")
    y = m.field(24, y + 26, 342, "El. paštas", "text", "tomas@frontend.lt")
    y = m.field(24, y + 26, 342, "Slaptažodis", "password")
    y = m.radio_cards(24, y + 26, 342, "Rolė", [("Užsakovas", "skelbiu"), ("Specialistas", "atlieku")], 1)
    m.checkbox(24, y + 22, "Sutinku su taisyklėmis")
    m.btn(24, y + 60, 342, "Registruotis")
    m.text(195, y + 124, "Jau turi paskyrą? Prisijungti", 13, fill=C["muted"], anchor="middle")
    m.line(0, y + 160, 390, y + 160, stroke=C["soft"])
    m.text(24, y + 190, "© Hourly", 12, fill=C["muted"])
    return 880, y + 210, [
        "Prisijungimas – tas pats maketas, tik el. paštas ir slaptažodis.",
        "Nuotrauka šone matoma tik ≥ 768px.",
        "Įvedimo elementai: text, email, password, radio kortelės, checkbox.",
        "Klaidos (422, 409 „el. paštas užimtas“, 429 „bandykite po N min.“) – prie lauko arba virš mygtuko.",
    ]


def project_card(c, x, y, w, title_lines, client, short=False):
    c.card(x, y, w, 230)
    c.badge(x + 20, y + 20, "Paskelbtas")
    for i, t in enumerate(title_lines):
        c.text(x + 20, y + 72 + i * 22, t, 16, 700)
    yy = y + 72 + len(title_lines) * 22
    c.text(x + 20, yy, client, 13, fill=C["muted"])
    for i, (k, v) in enumerate([("Biudžetas", "1 200–2 000 €"), ("Terminas", "2026-11-30")]):
        c.text(x + 20, yy + 32 + i * 22, k, 13, fill=C["muted"])
        c.text(x + w - 20, yy + 32 + i * 22, v, 13, 600, anchor="end")
    c.line(x + 20, yy + 70, x + w - 20, yy + 70, stroke=C["block"])
    c.text(x + 20, yy + 94, "3 pasiūlymai", 12, fill=C["muted"])
    c.text(x + w - 20, yy + 94, "Peržiūrėti →", 12, 600, anchor="end")


def w3(d, m):
    y = marketing_header(d, False, "Aikštelė")
    d.text(80, y + 80, "Aikštelė", 40)
    d.bars(80, y + 100, 420, 1)
    d.field(80, y + 140, 520, "Paieška", "search", "          pvz., svetainė, API")
    d.field(624, y + 140, 200, "Būsena", "select", "Paskelbti")
    d.field(848, y + 140, 200, "Kilmė", "select", "Visi")
    d.text(1200, y + 172, "24 projektai", 13, fill=C["muted"], anchor="end")
    titles = [["Kavinės išankstinių", "užsakymų sistema"], ["Mokyklos svetainės", "atnaujinimas"], ["Kirpyklos", "internetinė svetainė"],
              ["Logotipas ir", "stiliaus gairės"], ["Senos apskaitos", "duomenų perkėlimas"], ["Sandėlio likučių", "ataskaitos"]]
    clients = ["Kavinė „Pupa“", "MB „Žalia Lanka“", "UAB „Pavyzdys“", "Gabija Petrauskaitė", "UAB „Pavyzdys“", "UAB „Pavyzdys“"]
    for i, t in enumerate(titles):
        project_card(d, 80 + (i % 3) * 384, y + 220 + (i // 3) * 254, 352, t, clients[i])
    py = y + 740
    for i, lab in enumerate(["←", "1", "2", "3", "→"]):
        d.rect(520 + i * 48, py, 40, 36, fill=C["dark"] if lab == "1" else "#ffffff", stroke=C["line"], r=8)
        d.text(540 + i * 48, py + 23, lab, 13, 600, fill="#ffffff" if lab == "1" else C["text"], anchor="middle")
    yd = marketing_footer(d, py + 80, False)

    y = marketing_header(m, True)
    m.text(24, y + 60, "Aikštelė", 32)
    yy = m.field(24, y + 96, 342, "Paieška", "search", "          svetainė, API")
    m.field(24, yy + 26, 165, "Būsena", "select", "Paskelbti")
    m.field(201, yy + 26, 165, "Kilmė", "select", "Visi")
    yy += 100
    for t, cl in zip(titles[:3], clients[:3]):
        project_card(m, 24, yy, 342, t, cl)
        yy += 246
    for i, lab in enumerate(["←", "1", "2", "3", "→"]):
        m.rect(83 + i * 48, yy + 8, 40, 36, fill=C["dark"] if lab == "1" else "#ffffff", stroke=C["line"], r=8)
        m.text(103 + i * 48, yy + 31, lab, 13, 600, fill="#ffffff" if lab == "1" else C["text"], anchor="middle")
    ym = marketing_footer(m, yy + 70, True)
    return yd, ym, [
        "GET /projects?scope=marketplace&q=&status=&origin=&page= – filtrai ir puslapis laikomi URL parametruose.",
        "Kortelės: 3 stulpeliai ≥ 1024px, 2 – planšetėje, 1 – < 768px.",
        "Įvedimo elementai: search, select.",
    ]


def w4(d, m):
    h = 940
    y = marketing_header(d, False, "Aikštelė")
    d.text(80, y + 50, "← Aikštelė", 13, fill=C["muted"])
    d.badge(80, y + 72, "Paskelbtas")
    d.text(80, y + 140, "Kavinės išankstinių užsakymų sistema", 38)
    d.text(80, y + 170, "Kavinė „Pupa“ · paskelbta 2026-09-28", 14, fill=C["muted"])
    d.bars(80, y + 204, 700, 5)
    d.text(80, y + 320, "Užduotys", 18, 700)
    for i, t in enumerate(["Reikalavimų sąrašas", "Meniu struktūra", "Užsakymo forma"]):
        d.rect(80, y + 340 + i * 52, 700, 44, fill="#ffffff", stroke=C["soft"], r=10)
        d.text(100, y + 367 + i * 52, t, 14)
        d.badge(690, y + 351 + i * 52, "TODO")
    d.card(840, y + 72, 360, 300)
    for i, (k, v) in enumerate([("Biudžetas", "1 200–2 000 €"), ("Terminas", "2026-11-30"), ("Užduotis sudaro", "specialistas"), ("Pasiūlymų", "3")]):
        d.text(864, y + 116 + i * 36, k, 13, fill=C["muted"])
        d.text(1176, y + 116 + i * 36, v, 13, 600, anchor="end")
    d.btn(864, y + 280, 312, "Pateikti pasiūlymą")
    # modal
    d.overlay(h)
    mx, mw = 400, 480
    yy = d.modal(mx, 150, mw, 560, "Pateikti pasiūlymą")
    d.field(mx + 24, yy, 206, "Kaina, €", "number", "1 600")
    d.field(mx + 250, yy, 206, "Įkainis, €/val.", "number", "40")
    yy = d.field(mx + 24, yy + 72, 432, "Numatoma trukmė, d.", "number", "21")
    yy = d.field(mx + 24, yy + 28, 432, "Žinutė užsakovui", "textarea", "Turiu patirties su…")
    d.checkbox(mx + 24, yy + 26, "Esu susipažinęs su užduotimis")
    d.modal_foot(mx, 150 + 560 - 68, mw, "Pateikti")

    hm = 900
    y = marketing_header(m, True)
    m.text(24, y + 40, "← Aikštelė", 13, fill=C["muted"])
    m.badge(24, y + 60, "Paskelbtas")
    m.text(24, y + 120, "Kavinės išankstinių", 28)
    m.text(24, y + 154, "užsakymų sistema", 28)
    m.text(24, y + 182, "Kavinė „Pupa“", 13, fill=C["muted"])
    m.bars(24, y + 206, 342, 4)
    m.overlay(hm)
    # bottom sheet
    m.rect(0, 250, 390, hm - 250, fill="#ffffff", r=20)
    m.rect(175, 262, 40, 4, fill=C["block2"], r=2)
    m.text(24, 306, "Pateikti pasiūlymą", 22)
    m.text(366, 304, "✕", 16, fill=C["muted"], anchor="end")
    m.line(0, 326, 390, 326, stroke=C["soft"])
    m.field(24, 356, 165, "Kaina, €", "number", "1 600")
    yy = m.field(201, 356, 165, "Įkainis, €/val.", "number", "40")
    yy = m.field(24, yy + 26, 342, "Numatoma trukmė, d.", "number", "21")
    yy = m.field(24, yy + 26, 342, "Žinutė užsakovui", "textarea", "Turiu patirties su…")
    m.checkbox(24, yy + 22, "Esu susipažinęs su užduotimis")
    m.btn(24, yy + 60, 342, "Pateikti")
    m.btn(24, yy + 104, 342, "Atšaukti", "ghost")
    return h, hm, [
        "Mygtukas „Pateikti pasiūlymą“ rodomas tik jei atsakyme yra _links['submit-proposal'] (specialistas, projektas paskelbtas).",
        "Modalas: natūralus <dialog>; < 768px – apatinis lapas per visą plotį.",
        "POST /projects/{id}/proposals; 409 – jau pateiktas pasiūlymas, 422 – klaidos prie laukų.",
    ]


def w5(d, m):
    h = 900
    cx, cy, cw = app_shell(d, h, False, "Apžvalga", "Apžvalga", [("Naujas projektas", "primary")])
    # timer HUD
    d.rect(cx, cy, cw * 0.58, 230, fill="#ffffff", stroke=C["text"], r=0, sw=1.5)
    for (ax, ay, dx, dy) in [(cx, cy, 1, 1), (cx + cw * 0.58, cy, -1, 1), (cx, cy + 230, 1, -1), (cx + cw * 0.58, cy + 230, -1, -1)]:
        d.line(ax - dx * 8, ay - dy * 8, ax + dx * 16, ay - dy * 8, stroke=C["note"], sw=2)
        d.line(ax - dx * 8, ay - dy * 8, ax - dx * 8, ay + dy * 16, stroke=C["note"], sw=2)
    d.label(cx + 24, cy + 36, "● REC · vykdoma sesija")
    d.text(cx + 24, cy + 110, "01:23:10", 64, 700)
    d.text(cx + 24, cy + 150, "Ataskaitų šablonai · 45 €/val. · sukaupta 62,38 €", 14, fill=C["muted"])
    d.btn(cx + 24, cy + 172, 140, "Sustabdyti", icon=True)
    d.btn(cx + 176, cy + 172, 190, "Įvesti rankiniu būdu", "secondary")
    sx = cx + cw * 0.58 + 24
    sw2 = cw - cw * 0.58 - 24
    for i, (k, v) in enumerate([("Šią savaitę", "18 val. 40 min."), ("Uždarbis", "812,50 €"), ("Vykdomi projektai", "2")]):
        d.card(sx, cy + i * 80, sw2, 68)
        d.text(sx + 20, cy + i * 80 + 28, k, 12, fill=C["muted"])
        d.text(sx + 20, cy + i * 80 + 52, v, 20, 700)
    ty = cy + 270
    d.text(cx, ty, "Naujausios užduotys", 18, 700)
    d.text(cx + cw, ty, "Visos →", 13, fill=C["muted"], anchor="end")
    d.table(cx, ty + 16, cw, ["Užduotis", "Projektas", "Būsena", "Valandos", ""],
            [["Ataskaitų šablonai", "~", "[Vykdoma]", "9,5", "⋯"], ["Užsakymų sąrašas", "~", "[Vykdoma]", "6,0", "⋯"],
             ["Registracijos forma", "~", "[Atlikta]", "4,5", "⋯"], ["Prieinamumo patikra", "~", "[TODO]", "0,0", "⋯"]],
            [2.2, 2.2, 1.2, 0.8, 0.4])

    hm = 860
    mx_, my_, mw_ = app_shell(m, hm, True, "Apžvalga", "Apžvalga")
    m.rect(16, my_, 358, 200, fill="#ffffff", stroke=C["text"], r=0, sw=1.5)
    m.label(32, my_ + 30, "● REC · vykdoma sesija")
    m.text(32, my_ + 90, "01:23:10", 48, 700)
    m.text(32, my_ + 118, "Ataskaitų šablonai · 62,38 €", 13, fill=C["muted"])
    m.btn(32, my_ + 140, 326, "Sustabdyti", icon=True)
    for i, (k, v) in enumerate([("Šią savaitę", "18 val. 40 min."), ("Uždarbis", "812,50 €")]):
        m.card(16 + i * 183, my_ + 216, 175, 68)
        m.text(32 + i * 183, my_ + 244, k, 12, fill=C["muted"])
        m.text(32 + i * 183, my_ + 268, v, 16, 700)
    # drawer open (hamburger state)
    m.overlay(hm)
    m.rect(0, 0, 290, hm, fill="#ffffff", r=0)
    m.line(290, 0, 290, hm, stroke=C["line"])
    m.logo(20, 40)
    m.text(266, 40, "✕", 16, fill=C["muted"], anchor="end")
    y = 92
    for name, _ in APP_NAV:
        if name == "Apžvalga":
            m.rect(12, y - 22, 266, 38, fill=C["block"], r=8)
        m.icon(26, y - 11, 16)
        m.text(54, y + 2, name, 15, 600 if name == "Apžvalga" else 400)
        y += 46
    m.label(26, y + 6, "Administravimas")
    y += 40
    for name in ADMIN_NAV:
        m.icon(26, y - 11, 16)
        m.text(54, y + 2, name, 15)
        y += 46
    m.line(0, hm - 80, 290, hm - 80, stroke=C["soft"])
    m.circle(36, hm - 44, 14, fill=C["block"], stroke=C["line"])
    m.text(60, hm - 48, "Tomas Jankauskas", 13, 600)
    m.text(60, hm - 30, "Atsijungti", 12, fill=C["muted"])
    return h, hm, [
        "Programos karkasas: šoninė juosta su ikonomis (punktai – iš GET /api _links), viršutinė juosta su veikiančiu laikmačiu, plona poraštė.",
        "< 768px: šoninė juosta → hamburger + stalčius iš kairės (telefono kadre parodytas atidarytas).",
        "Laikmatis – HUD rėmelis (mėlyni kampai – ctOS akcentas realizacijoje). GET /sessions?running=true; stabdymas per _links.stop.",
        "Administravimo punktai matomi tik ADMIN rolei.",
    ]


def workspace_head(c, cx, cy, cw, mobile=False):
    c.text(cx, cy - 4, "← Projektai", 13, fill=C["muted"])
    x = c.badge(cx, cy + 12, "Vykdomas")
    c.badge(x, cy + 12, "Aikštelė")
    if mobile:
        c.text(cx, cy + 72, "Sandėlio likučių", 24, 700)
        c.text(cx, cy + 100, "ataskaitos", 24, 700)
        c.text(cx, cy + 124, "UAB „Pavyzdys“ · 45 €/val.", 13, fill=C["muted"])
        ty = cy + 150
        tabs = ["Užduotys", "Pasiūlymai", "Nuorodos", "Atask…"]
        x = cx
        for i, t in enumerate(tabs):
            c.text(x, ty + 20, t, 14, 700 if i == 0 else 400, fill=C["text"] if i == 0 else C["muted"])
            if i == 0:
                c.line(x, ty + 34, x + len(t) * 8, ty + 34, stroke=C["text"], sw=2)
            x += len(t) * 8 + 24
        c.line(cx - 16, ty + 34, cx + cw + 16, ty + 34, stroke=C["soft"])
        return ty + 60
    c.text(cx, cy + 76, "Sandėlio likučių ataskaitos", 30, 700)
    c.text(cx, cy + 102, "UAB „Pavyzdys“ · vykdo Tomas Jankauskas · 45 €/val.", 13, fill=C["muted"])
    ty = cy + 128
    x = cx
    for i, t in enumerate(["Užduotys", "Pasiūlymai", "Nuorodos", "Ataskaita", "Nustatymai"]):
        c.icon(x, ty + 8, 14)
        c.text(x + 22, ty + 20, t, 14, 700 if i == 0 else 400, fill=C["text"] if i == 0 else C["muted"])
        if i == 0:
            c.line(x, ty + 34, x + 22 + len(t) * 8, ty + 34, stroke=C["text"], sw=2)
        x += 22 + len(t) * 8 + 36
    c.line(cx, ty + 34, cx + cw, ty + 34, stroke=C["soft"])
    return ty + 60


def w6(d, m):
    h = 900
    cx, cy, cw = app_shell(d, h, False, "Projektai", "Projektai")
    y = workspace_head(d, cx, cy, cw)
    d.field(cx, y + 6, 320, "Paieška", "search", "          užduoties pavadinimas")
    d.field(cx + 340, y + 6, 180, "Būsena", "select", "Visos")
    d.btn(cx + cw - 160, y + 14, 160, "Nauja užduotis", icon=True)
    y = d.table(cx, y + 80, cw, ["#", "Užduotis", "Būsena", "Įvertis", "Užregistruota", "Įkainis", ""],
                [["1", "Duomenų šaltinių auditas", "[Atlikta]", "12 val.", "12,0 val.", "45 €", "⋯"],
                 ["2", "Ataskaitų šablonai", "[Vykdoma]", "14 val.", "9,5 val.", "45 €", "⋯"],
                 ["3", "Automatinis siuntimas", "[TODO]", "8 val.", "0,0 val.", "45 €", "⋯"],
                 ["4", "Eksportas į Excel", "[Laukia patvirtinimo]", "6 val.", "—", "50 €", "⋯"]],
                [0.3, 2.4, 1.6, 0.8, 1, 0.7, 0.4])
    d.text(cx, y + 30, "Rodoma 1–4 iš 4", 12, fill=C["muted"])
    # row menu
    d.rect(cx + cw - 190, y - 4 * 44 + 30, 170, 148, fill="#ffffff", stroke=C["line"], r=10)
    for i, t in enumerate(["Atidaryti", "Redaguoti", "Keisti būseną", "Šalinti"]):
        d.icon(cx + cw - 176, y - 4 * 44 + 46 + i * 34, 14)
        d.text(cx + cw - 154, y - 4 * 44 + 58 + i * 34, t, 13)

    hm = 860
    mx_, my_, mw_ = app_shell(m, hm, True, "Projektai", "Projektas")
    y = workspace_head(m, mx_, my_ + 10, mw_, True)
    m.btn(mx_, y, mw_, "Nauja užduotis", icon=True)
    y += 52
    for t, b, hrs in [("Duomenų šaltinių auditas", "Atlikta", "12,0 / 12 val."), ("Ataskaitų šablonai", "Vykdoma", "9,5 / 14 val."),
                      ("Automatinis siuntimas", "TODO", "0,0 / 8 val."), ("Eksportas į Excel", "Laukia patvirt.", "— / 6 val.")]:
        m.card(mx_, y, mw_, 96)
        m.text(mx_ + 16, y + 30, t, 15, 700)
        m.badge(mx_ + 16, y + 46, b)
        m.text(mx_ + mw_ - 16, y + 62, hrs, 13, fill=C["muted"], anchor="end")
        m.text(mx_ + mw_ - 16, y + 30, "⋯", 16, 700, fill=C["muted"], anchor="end")
        y += 108
    return h, hm, [
        "Skirtukai: Užduotys · Pasiūlymai · Nuorodos · Ataskaita · Nustatymai; < 768px – horizontaliai slenkami.",
        "„Nauja užduotis“ ir „Redaguoti“ – modalai (W10); „Šalinti“ – patvirtinimo modalas; eilutės meniu punktai su ikonomis.",
        "Lentelė < 768px virsta kortelėmis. Veiksmai rodomi pagal kiekvienos užduoties _links.",
        "„Laukia patvirtinimo“ – specialisto pasiūlyta užduotis; užsakovas mato mygtuką „Patvirtinti“.",
    ]


def w7(d, m):
    h = 900
    cx, cy, cw = app_shell(d, h, False, "Projektai", "Projektai")
    y = workspace_head(d, cx, cy, cw)
    d.table(cx, y + 80, cw, ["#", "Užduotis", "Būsena", "Užregistruota"],
            [["1", "Duomenų šaltinių auditas", "[Atlikta]", "12,0 val."], ["2", "Ataskaitų šablonai", "[Vykdoma]", "9,5 val."],
             ["3", "Automatinis siuntimas", "[TODO]", "0,0 val."]], [0.3, 2.4, 1.2, 1])
    d.overlay(h)
    px = 1280 - 520
    d.rect(px, 0, 520, h, fill="#ffffff", r=0)
    d.line(px, 0, px, h, stroke=C["line"])
    d.text(px + 28, 50, "Ataskaitų šablonai", 24, 700)
    d.text(1280 - 28, 48, "✕", 16, fill=C["muted"], anchor="end")
    d.badge(px + 28, 66, "Vykdoma")
    for i, (k, v) in enumerate([("Įvertis", "14 val."), ("Užregistruota", "9,5 val."), ("Įkainis", "45 €/val. (projekto)"), ("Suma", "427,50 €")]):
        d.text(px + 28, 130 + i * 28, k, 13, fill=C["muted"])
        d.text(1280 - 28, 130 + i * 28, v, 13, 600, anchor="end")
    d.bars(px + 28, 250, 460, 2)
    d.btn(px + 28, 290, 110, "Redaguoti", "secondary")
    d.btn(px + 148, 290, 100, "Šalinti", "danger")
    d.line(px, 350, 1280, 350, stroke=C["soft"])
    d.text(px + 28, 388, "Darbo sesijos", 17, 700)
    d.btn(1280 - 28 - 140, 366, 140, "Nauja sesija", icon=True)
    d.table(px + 28, 410, 464, ["Data", "Trukmė", "Suma", ""],
            [["2026-10-04", "3 val. 15 min.", "146,25 €", "⋯"], ["2026-10-02", "4 val. 05 min.", "183,75 €", "⋯"],
             ["2026-09-30", "2 val. 10 min.", "97,50 €", "⋯"], ["šiuo metu", "● 01:23:10", "62,38 €", "⋯"]], [1.2, 1.2, 1, 0.3])
    d.text(px + 28, 660, "1–4 iš 6 ·  ← 1 2 →", 12, fill=C["muted"])

    hm = 860
    m.rect(0, 0, 390, hm, fill="#ffffff", r=0)
    m.text(16, 40, "←", 18, fill=C["muted"])
    m.text(44, 40, "Ataskaitų šablonai", 18, 700)
    m.line(0, 64, 390, 64, stroke=C["soft"])
    m.badge(16, 84, "Vykdoma")
    for i, (k, v) in enumerate([("Įvertis", "14 val."), ("Užregistruota", "9,5 val."), ("Įkainis", "45 €/val."), ("Suma", "427,50 €")]):
        m.text(16, 140 + i * 26, k, 13, fill=C["muted"])
        m.text(374, 140 + i * 26, v, 13, 600, anchor="end")
    m.btn(16, 248, 171, "Redaguoti", "secondary")
    m.btn(203, 248, 171, "Šalinti", "danger")
    m.text(16, 330, "Darbo sesijos", 17, 700)
    m.btn(374 - 120, 308, 120, "Nauja", icon=True)
    y = 360
    for dte, dur, s in [("2026-10-04", "3 val. 15 min.", "146,25 €"), ("2026-10-02", "4 val. 05 min.", "183,75 €"),
                        ("2026-09-30", "2 val. 10 min.", "97,50 €"), ("šiuo metu", "● 01:23:10", "62,38 €")]:
        m.card(16, y, 358, 72)
        m.text(32, y + 30, dte, 13, fill=C["muted"])
        m.text(32, y + 52, dur, 15, 700)
        m.text(358, y + 52, s, 14, 600, anchor="end")
        y += 84
    return h, hm, [
        "Užduoties skydelis (Drawer) iš dešinės: GET /projects/{p}/tasks/{t} ir GET …/tasks/{t}/sessions (3 lygių adresas).",
        "< 768px – skydelis per visą ekraną su „←“.",
        "„Nauja sesija“, sesijos redagavimas – modalai; šalinimas – patvirtinimo modalas.",
    ]


def w8(d, m):
    h = 900
    cx, cy, cw = app_shell(d, h, False, "Darbo žurnalas", "Darbo žurnalas", [("Įvesti rankiniu būdu", "secondary"), ("Pradėti laikmatį", "primary")])
    d.field(cx, cy + 10, 180, "Nuo", "date", "2026-09-01")
    d.field(cx + 196, cy + 10, 180, "Iki", "date", "2026-10-05")
    d.field(cx + 392, cy + 10, 240, "Projektas", "select", "Visi")
    d.switch(cx + 660, cy + 28, "Tik vykdomos")
    d.table(cx, cy + 90, cw, ["Data", "Užduotis", "Projektas", "Trukmė", "Suma", ""],
            [["2026-10-05", "Ataskaitų šablonai", "~", "● 01:23:10", "62,38 €", "⋯"],
             ["2026-10-04", "Ataskaitų šablonai", "~", "3 val. 15 min.", "146,25 €", "⋯"],
             ["2026-10-03", "Užsakymų sąrašas", "~", "2 val. 40 min.", "93,33 €", "⋯"],
             ["2026-10-02", "Ataskaitų šablonai", "~", "4 val. 05 min.", "183,75 €", "⋯"],
             ["2026-10-01", "Registracijos forma", "~", "1 val. 30 min.", "45,00 €", "⋯"]],
            [1, 1.8, 2, 1.1, 0.9, 0.3])
    d.overlay(h)
    mx, mw = 400, 480
    yy = d.modal(mx, 130, mw, 600, "Rankinis įvedimas")
    yy = d.field(mx + 24, yy, 432, "Užduotis", "select", "Ataskaitų šablonai — Sandėlio likučių…")
    d.field(mx + 24, yy + 28, 206, "Pradžia", "date", "2026-10-03 09:00")
    yy = d.field(mx + 250, yy + 28, 206, "Pabaiga", "date", "2026-10-03 12:15")
    d.text(mx + 24, yy + 26, "Trukmė: 3 val. 15 min. · 146,25 €", 13, fill=C["muted"])
    yy = d.field(mx + 24, yy + 56, 432, "Komentaras", "textarea", "Ataskaitos šablono maketas…")
    d.modal_foot(mx, 130 + 600 - 68, mw, "Išsaugoti")

    hm = 860
    mx_, my_, mw_ = app_shell(m, hm, True, "Darbo žurnalas", "Darbo žurnalas")
    m.rect(16, my_, 358, 120, fill="#ffffff", stroke=C["text"], r=0, sw=1.5)
    m.label(32, my_ + 28, "● REC")
    m.text(32, my_ + 72, "01:23:10", 36, 700)
    m.btn(374 - 16 - 130, my_ + 44, 130, "Sustabdyti", icon=True)
    m.text(32, my_ + 102, "Ataskaitų šablonai", 13, fill=C["muted"])
    m.field(16, my_ + 156, 171, "Nuo", "date", "2026-09-01")
    m.field(203, my_ + 156, 171, "Iki", "date", "2026-10-05")
    m.switch(16, my_ + 226, "Tik vykdomos", False)
    y = my_ + 268
    for dte, t, dur, s in [("2026-10-04", "Ataskaitų šablonai", "3 val. 15 min.", "146,25 €"), ("2026-10-03", "Užsakymų sąrašas", "2 val. 40 min.", "93,33 €"),
                           ("2026-10-02", "Ataskaitų šablonai", "4 val. 05 min.", "183,75 €")]:
        m.card(16, y, 358, 84)
        m.text(32, y + 26, dte, 12, fill=C["muted"])
        m.text(32, y + 48, t, 15, 700)
        m.text(32, y + 70, dur, 13)
        m.text(358, y + 70, s, 14, 600, anchor="end")
        y += 96
    m.btn(16, y + 4, 358, "Įvesti rankiniu būdu", "secondary")
    return h, hm, [
        "GET /sessions?from=&to=&projectId=&running= – visų savo sesijų žurnalas; eilutė veda į sesijos detales (3 lygių adresas).",
        "Rankinis įvedimas – modalas: select, datetime-local ×2, textarea; trukmė ir suma skaičiuojamos gyvai.",
        "Įvedimo elementai: date, select, switch. 409 – persidengia su vykdoma sesija.",
    ]


def w9(d, m):
    h = 860
    cx, cy, cw = app_shell(d, h, False, "Naudotojai", "Naudotojai")
    d.field(cx, cy + 10, 360, "Paieška", "search", "          vardas arba el. paštas")
    d.field(cx + 380, cy + 10, 180, "Rolė", "select", "Visos")
    d.field(cx + 580, cy + 10, 180, "Būsena", "select", "Visi")
    d.table(cx, cy + 90, cw, ["Naudotojas", "El. paštas", "Rolė", "Būsena", "Užsiregistravo", ""],
            [["Tomas Jankauskas", "tomas@frontend.lt", "[Specialistas]", "[Aktyvus]", "2026-08-12", "⋯"],
             ["UAB „Pavyzdys“", "uzsakovas@hourly.lt", "[Užsakovas]", "[Aktyvus]", "2026-08-10", "⋯"],
             ["Gabija Petrauskaitė", "gabija@dizainas.lt", "[Specialistas]", "[Užblokuotas]", "2026-08-20", "⋯"],
             ["Kavinė „Pupa“", "mindaugas@kavinepupa.lt", "[Užsakovas]", "[Aktyvus]", "2026-09-01", "⋯"]],
            [1.6, 1.8, 1.1, 1.1, 1, 0.3])
    d.overlay(h)
    mx, mw = 420, 440
    yy = d.modal(mx, 220, mw, 300, "Užblokuoti naudotoją?")
    d.text(mx + 24, yy + 6, "Gabija Petrauskaitė nebegalės prisijungti,", 14)
    d.text(mx + 24, yy + 28, "o galiojantys žetonai nustos veikti iš karto.", 14)
    yy = d.field(mx + 24, yy + 56, 392, "Priežastis (neprivaloma)", "text", "Pažeistos taisyklės")
    d.line(mx, 220 + 300 - 68, mx + mw, 220 + 300 - 68, stroke=C["soft"])
    d.btn(mx + mw - 24 - 130, 220 + 300 - 52, 130, "Užblokuoti", "danger")
    d.btn(mx + mw - 24 - 240, 220 + 300 - 52, 100, "Atšaukti", "ghost")

    hm = 800
    mx_, my_, mw_ = app_shell(m, hm, True, "Naudotojai", "Naudotojai")
    yy = m.field(16, my_, 358, "Paieška", "search", "          vardas, el. paštas")
    m.field(16, yy + 26, 171, "Rolė", "select", "Visos")
    m.field(203, yy + 26, 171, "Būsena", "select", "Visi")
    y = yy + 104
    for n, e, r, s in [("Tomas Jankauskas", "tomas@frontend.lt", "Specialistas", "Aktyvus"), ("UAB „Pavyzdys“", "uzsakovas@hourly.lt", "Užsakovas", "Aktyvus"),
                       ("Gabija Petrauskaitė", "gabija@dizainas.lt", "Specialistas", "Užblokuotas")]:
        m.card(16, y, 358, 110)
        m.circle(44, y + 34, 16, fill=C["block"], stroke=C["line"])
        m.text(70, y + 30, n, 15, 700)
        m.text(70, y + 50, e, 12, fill=C["muted"])
        x = m.badge(32, y + 70, r)
        m.badge(x, y + 70, s)
        m.text(358, y + 30, "⋯", 16, 700, fill=C["muted"], anchor="end")
        y += 122
    return h, hm, [
        "GET /users?q=&role=&blocked=; blokavimas – PATCH /users/{id}, šalinimas – DELETE /users/{id} (409, jei turi darbo istorijos).",
        "Abu veiksmai – tik per patvirtinimo modalą; sėkmė / klaida – pranešimas (toast), ne alert().",
        "„Visi projektai“ (GET /projects?scope=all) – tas pats maketas su projektų lentele.",
    ]


def w10(d, m):
    # Three modals side by side on the desktop canvas, phone shows one full-screen modal.
    h = 760
    d.rect(0, 0, 1280, h, fill=C["block"], r=0)
    # 1 create / edit form
    x, w = 32, 400
    yy = d.modal(x, 40, w, 680, "Naujas projektas")
    yy = d.field(x + 24, yy, 352, "Pavadinimas", "text", "Kavinės išankstinių užsakymų…")
    yy = d.field(x + 24, yy + 26, 352, "Aprašymas", "textarea", "Klientai užsisako kavą iš…")
    d.field(x + 24, yy + 26, 166, "Biudžetas nuo, €", "number", "1 200")
    yy = d.field(x + 210, yy + 26, 166, "Biudžetas iki, €", "number", "2 000")
    yy = d.field(x + 24, yy + 26, 352, "Pageidaujamas terminas", "date", "2026-11-30")
    yy = d.radio_cards(x + 24, yy + 26, 352, "Užduotis sudaro", [("Užsakovas", "aš"), ("Specialistas", "laimėjęs")], 0)
    d.switch(x + 24, yy + 16, "Iš karto paskelbti")
    d.modal_foot(x, 40 + 680 - 68, w, "Sukurti")
    # 2 delete confirm
    x, w = 456, 380
    yy = d.modal(x, 40, w, 270, "Šalinti užduotį?")
    d.text(x + 24, yy + 6, "„Automatinis siuntimas“ ir visos jos", 14)
    d.text(x + 24, yy + 28, "darbo sesijos bus pašalintos negrįžtamai.", 14)
    d.checkbox(x + 24, yy + 54, "Suprantu", False)
    d.line(x, 40 + 270 - 68, x + w, 40 + 270 - 68, stroke=C["soft"])
    d.btn(x + w - 24 - 120, 40 + 270 - 52, 120, "Šalinti", "danger")
    d.btn(x + w - 24 - 230, 40 + 270 - 52, 100, "Atšaukti", "ghost")
    # toast below delete
    d.rect(x, 360, w, 64, fill="#ffffff", stroke=C["line"], r=12)
    d.rect(x, 360, 4, 64, fill=C["dark"], r=0)
    d.text(x + 20, 386, "> uzduotis_pasalinta [204]", 13, 700)
    d.text(x + 20, 406, "Pranešimas (toast) po sėkmingo veiksmo", 12, fill=C["muted"])
    # 3 share link shown once
    x, w = 860, 388
    yy = d.modal(x, 40, w, 400, "Peržiūros nuoroda sukurta")
    d.text(x + 24, yy + 4, "Nuoroda rodoma tik kartą – nukopijuokite ją", 13, fill=C["muted"])
    d.text(x + 24, yy + 22, "dabar. Vėliau ją galėsite tik atšaukti.", 13, fill=C["muted"])
    d.rect(x + 24, yy + 44, w - 48, 40, fill=C["block"], r=8)
    d.text(x + 36, yy + 69, "hourly.lt/p/k3Jd9…Qe2", 13)
    d.rect(x + w - 24 - 76, yy + 50, 68, 28, fill="#ffffff", stroke=C["line"], r=14)
    d.text(x + w - 24 - 42, yy + 69, "Kopijuoti", 12, 600, anchor="middle")
    for i, (k, v) in enumerate([("Galioja iki", "2026-10-19"), ("Teisės", "tik skaitymas")]):
        d.text(x + 24, yy + 124 + i * 26, k, 13, fill=C["muted"])
        d.text(x + w - 24, yy + 124 + i * 26, v, 13, 600, anchor="end")
    d.modal_foot(x, 40 + 400 - 68, w, "Uždaryti", "")
    d.text(32, 750, "1 – kūrimo / redagavimo forma · 2 – šalinimo patvirtinimas + pranešimas · 3 – vienkartinė nuoroda", 12, fill=C["muted"])

    hm = 860
    m.rect(0, 0, 390, hm, fill=C["block"], r=0)
    m.rect(0, 40, 390, hm - 40, fill="#ffffff", r=20)
    m.text(24, 90, "Naujas projektas", 22)
    m.text(366, 88, "✕", 16, fill=C["muted"], anchor="end")
    m.line(0, 112, 390, 112, stroke=C["soft"])
    yy = m.field(24, 140, 342, "Pavadinimas", "text", "Kavinės išankstinių…")
    yy = m.field(24, yy + 24, 342, "Aprašymas", "textarea", "Klientai užsisako…")
    m.field(24, yy + 24, 165, "Nuo, €", "number", "1 200")
    yy = m.field(201, yy + 24, 165, "Iki, €", "number", "2 000")
    yy = m.field(24, yy + 24, 342, "Terminas", "date", "2026-11-30")
    yy = m.radio_cards(24, yy + 24, 342, "Užduotis sudaro", [("Užsakovas", "aš"), ("Specialistas", "laimėjęs")], 0)
    m.switch(24, yy + 16, "Iš karto paskelbti")
    m.btn(24, yy + 56, 342, "Sukurti")
    m.btn(24, yy + 100, 342, "Atšaukti", "ghost")
    return h, hm, [
        "Visi kūrimo / redagavimo veiksmai 3 objektams (projektas, užduotis, sesija) ir visi šalinimai – modaluose (<dialog>).",
        "< 768px modalas užima visą ekraną (apatinis lapas).",
        "Įvedimo elementai: text, textarea, number, date, radio kortelės, switch, checkbox.",
        "Sėkmė / klaida – terminalo stiliaus pranešimas (toast); alert() / confirm() nenaudojami.",
    ]


SCREENS = [
    ("01-titulinis", "W1 · Titulinis puslapis", "/", w1),
    ("02-registracija", "W2 · Registracija ir prisijungimas", "/register, /login", w2),
    ("03-aikstele", "W3 · Projektų aikštelė", "/projects", w3),
    ("04-projektas-pasiulymas", "W4 · Viešas projektas ir pasiūlymo modalas", "/projects/[id]", w4),
    ("05-programos-karkasas", "W5 · Programos karkasas ir apžvalga", "/app", w5),
    ("06-projekto-aplinka", "W6 · Projekto darbo aplinka (užduotys)", "/app/projects/[id]", w6),
    ("07-uzduoties-skydelis", "W7 · Užduoties skydelis ir sesijos", "/app/projects/[id] → užduotis", w7),
    ("08-darbo-zurnalas", "W8 · Darbo žurnalas, laikmatis, rankinis įvedimas", "/app/sessions", w8),
    ("09-administravimas", "W9 · Administravimas: naudotojai", "/app/admin/users", w9),
    ("10-modalai", "W10 · Modaliniai langai ir pranešimai", "/app (visa programa)", w10),
]


def frame_chrome(parts, x, y, w, h, mobile, path):
    if mobile:
        parts.append(f'<rect x="{x - 10}" y="{y - 10}" width="{w + 20}" height="{h + CHROME + 20}" rx="44" fill="#27272a"/>')
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h + CHROME}" rx="34" fill="{C["frame"]}"/>')
        parts.append(f'<text x="{x + 28}" y="{y + 22}" font-family="{FONT}" font-size="12" font-weight="700" fill="{C["text"]}">9:41</text>')
        parts.append(f'<rect x="{x + w / 2 - 50}" y="{y + 8}" width="100" height="20" rx="10" fill="#27272a"/>')
    else:
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h + CHROME}" rx="10" fill="{C["frame"]}" stroke="{C["line"]}"/>')
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{CHROME}" rx="10" fill="#e4e4e7"/>')
        parts.append(f'<rect x="{x}" y="{y + CHROME - 10}" width="{w}" height="10" fill="#e4e4e7"/>')
        for i in range(3):
            parts.append(f'<circle cx="{x + 18 + i * 16}" cy="{y + 16}" r="5" fill="#a1a1aa"/>')
        parts.append(f'<rect x="{x + 90}" y="{y + 7}" width="420" height="18" rx="9" fill="#ffffff"/>')
        parts.append(f'<text x="{x + 104}" y="{y + 20}" font-family="{FONT}" font-size="11" fill="{C["muted"]}">hourly.lt{esc(path.split(",")[0].split(" ")[0])}</text>')


def render(slug, title, path, fn):
    dparts, mparts = [], []
    d = Ctx(dparts, DX, TOP + CHROME, DW)
    m = Ctx(mparts, MX, TOP + CHROME, MW)
    dh, mh, notes = fn(d, m)
    dh, mh = int(dh) + 20, int(mh) + 20
    body_h = max(dh, mh) + CHROME
    notes_y = TOP + body_h + 60
    total_h = notes_y + 30 + len(notes) * 24 + 40
    width = MX + MW + 40
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{total_h}" viewBox="0 0 {width} {total_h}">',
        f'<rect width="{width}" height="{total_h}" fill="{C["canvas"]}"/>',
        f'<text x="{DX}" y="52" font-family="{FONT}" font-size="26" font-weight="700" fill="{C["text"]}">{esc(title)}</text>',
        f'<text x="{DX}" y="80" font-family="{FONT}" font-size="14" fill="{C["muted"]}">{esc(path)} · Hourly · žemos detalės wireframe</text>',
        f'<text x="{DX}" y="{TOP - 12}" font-family="{FONT}" font-size="12" font-weight="700" fill="{C["muted"]}">≥ 768 PX (1280)</text>',
        f'<text x="{MX}" y="{TOP - 12}" font-family="{FONT}" font-size="12" font-weight="700" fill="{C["muted"]}">&lt; 768 PX (390)</text>',
    ]
    frame_chrome(parts, DX, TOP, DW, dh, False, path)
    parts.append(f'<svg x="{DX}" y="{TOP}" width="{DW}" height="{dh + CHROME}" overflow="hidden"><g transform="translate({-DX} {-TOP})">')
    parts += dparts
    parts.append("</g></svg>")
    frame_chrome(parts, MX, TOP, MW, mh, True, path)
    parts.append(f'<svg x="{MX}" y="{TOP}" width="{MW}" height="{mh + CHROME}" overflow="hidden"><g transform="translate({-MX} {-TOP})">')
    parts += mparts
    parts.append("</g></svg>")
    parts.append(f'<text x="{DX}" y="{notes_y}" font-family="{FONT}" font-size="13" font-weight="700" fill="{C["note"]}">PASTABOS</text>')
    for i, n in enumerate(notes):
        parts.append(f'<text x="{DX}" y="{notes_y + 26 + i * 24}" font-family="{FONT}" font-size="14" fill="{C["note"]}">{i + 1}. {esc(n)}</text>')
    parts.append("</svg>")
    (OUT / f"{slug}.svg").write_text("\n".join(parts), encoding="utf-8")
    return slug, width, total_h


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for s in SCREENS:
        print(*render(*s))
