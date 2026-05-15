"""
Split Cambridge Statement of Results PDFs: one page per candidate when text is extractable.
Keeps original bundle PDFs. Writes SOR_<apellido1>_<apellido2>_<nombres>_<EXAM>_<YYYYMMDD>.pdf

Run (PowerShell), example:
  python split_sor_statements.py --root "D:/ruta/resultados cambridge"
"""

from __future__ import annotations

import argparse
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader, PdfWriter

EXAM_MAP = [
    ("Key English Test", "KEY"),
    ("Preliminary English Test", "PET"),
    ("First Certificate in English", "FCE"),
]

MONTHS = {
    "JANUARY": "01",
    "FEBRUARY": "02",
    "MARCH": "03",
    "APRIL": "04",
    "MAY": "05",
    "JUNE": "06",
    "JULY": "07",
    "AUGUST": "08",
    "SEPTEMBER": "09",
    "OCTOBER": "10",
    "NOVEMBER": "11",
    "DECEMBER": "12",
}


def strip_accents(s: str) -> str:
    nk = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nk if not unicodedata.combining(c))


def safe_filename(s: str) -> str:
    s = strip_accents(s).upper()
    s = re.sub(r"[^A-Z0-9_\-]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s[:180] if len(s) > 180 else s


def parse_session_date(text: str) -> str | None:
    m = re.search(r"Session\s*\n?\s*(\d{1,2})\s+([A-Z]+)\s+(\d{4})", text, re.I | re.M)
    if not m:
        return None
    day, mon, year = m.group(1), m.group(2).upper(), m.group(3)
    mm = MONTHS.get(mon)
    if not mm:
        return None
    return f"{year}{mm}{int(day):02d}"


def parse_candidate_name(text: str) -> str | None:
    m = re.search(r"Candidate name\s*\n?\s*(.+?)\s*\n\s*Place of entry", text, re.I | re.S)
    if not m:
        return None
    return re.sub(r"\s+", " ", m.group(1)).strip()


def detect_exam(text: str) -> str | None:
    for needle, code in EXAM_MAP:
        if needle in text:
            return code
    return None


def name_to_slug(full: str) -> str:
    parts = [p for p in full.strip().split() if p]
    if len(parts) >= 4:
        ap1, ap2 = parts[-2], parts[-1]
        noms = parts[:-2]
    elif len(parts) == 3:
        noms, ap1, ap2 = [parts[0]], parts[1], parts[2]
    elif len(parts) == 2:
        noms, ap1, ap2 = [parts[0]], parts[1], ""
    else:
        return safe_filename(full)
    nom = "_".join(noms)
    if ap2:
        return safe_filename(f"{ap1}_{ap2}_{nom}")
    return safe_filename(f"{ap1}_{nom}")


def should_process(path: Path) -> bool:
    n = path.name
    if "escaneado" in n.lower():
        return False
    return n.startswith(("KEY_OD_", "PET_OD_", "FCE_FS_")) and n.endswith(".pdf")


def split_pdf(path: Path, dry_run: bool) -> list[str]:
    reader = PdfReader(str(path))
    out_log: list[str] = []
    used: set[str] = set()

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if len(text.strip()) < 80:
            out_log.append(f"  skip page {i+1}: little or no text")
            continue
        name = parse_candidate_name(text)
        exam = detect_exam(text)
        date = parse_session_date(text)
        if not name or not exam or not date:
            out_log.append(f"  skip page {i+1}: missing field name={bool(name)} exam={exam} date={date}")
            continue

        slug = name_to_slug(name)
        base = f"SOR_{slug}_{exam}_{date}"
        fname = f"{base}.pdf"
        if fname in used:
            for k in range(2, 99):
                alt = f"{base}_{k:02d}.pdf"
                if alt not in used:
                    fname = alt
                    break
        used.add(fname)
        dest = path.parent / fname
        if dest.exists():
            out_log.append(f"  skip exists: {fname}")
            continue
        if dry_run:
            out_log.append(f"  would write: {fname}")
            continue
        w = PdfWriter()
        w.add_page(page)
        with open(dest, "wb") as f:
            w.write(f)
        out_log.append(f"  wrote: {fname}")

    return out_log


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--root",
        type=Path,
        default=Path(r"C:\Users\luuis\Downloads\Cambridge\resultados cambridge"),
    )
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root: Path = args.root
    if not root.is_dir():
        raise SystemExit(f"Not a directory: {root}")

    targets = sorted({p for p in root.rglob("SOR/*.pdf") if should_process(p)})
    print(f"Found {len(targets)} bundle PDF(s) under .../SOR/")
    for p in targets:
        print(f"\n{p.relative_to(root)}")
        for line in split_pdf(p, args.dry_run):
            print(line)


if __name__ == "__main__":
    main()
