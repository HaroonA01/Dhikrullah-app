"""
Parse ELM 2026 prayer timetable PDF into JSON.

Usage: python3 scripts/parse_elm_timetable.py
Output: data/elm-prayer-times.json

Column layout (0-indexed tokens after stripping day_abbr and day_num):
  0  fajr_begins
  1  fajr_jamah
  2  sunrise
  3  dhuhr_begins
  4  dhuhr_jamah
  5  asr_shafi  (1 Mithl)
  6  asr_hanafi (2 Mithl)
  7  asr_jamah
  8  maghrib_begins
  9  maghrib_jamah
  10 isha_begins
  11 isha_jamah

We keep indices [0, 2, 3, 5, 6, 8, 10].
"""

import json
import re
import sys
from pathlib import Path

try:
    import pypdf
except ImportError:
    sys.exit("pypdf not installed. Run: pip3 install pypdf")

MONTH_NAMES = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]

DAY_ROW = re.compile(
    r'(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*(\d{1,2})\s+(.*)'
)
TIME_RE = re.compile(r'^\d+:\d{2}$')

KEEP = [0, 2, 3, 5, 6, 8, 10]
KEYS = ["fajr", "sunrise", "dhuhr", "asrShafi", "asrHanafi", "maghrib", "isha"]


def to_minutes(t: str) -> int:
    h, m = t.split(':')
    return int(h) * 60 + int(m)


def convert_to_24h(raw_times: list[str]) -> list[str]:
    """
    Convert a list of 7 times (in document 12h order) to 24h format.
    Each time must be >= previous in the sequence; if not, add 12 hours.
    """
    result = []
    prev = 0
    for t in raw_times:
        total = to_minutes(t)
        if total <= prev:
            total += 720
        h, m = divmod(total, 60)
        result.append(f"{h:02d}:{m:02d}")
        prev = total
    return result


def extract_month(text: str):
    for i, name in enumerate(MONTH_NAMES, start=1):
        if name in text.upper():
            return i
    return None


def parse_row(line: str):
    m = DAY_ROW.match(line.strip())
    if not m:
        return None
    day = int(m.group(2))
    rest = m.group(3).split()
    # Filter to time tokens only (handles stray asterisks/footnotes)
    times = [t for t in rest if TIME_RE.match(t)]
    if len(times) < 12:
        return None
    selected = [times[i] for i in KEEP]
    return day, selected


def main():
    project_root = Path(__file__).parent.parent
    pdf_path = Path.home() / "Downloads" / "elm2026timetableonly.pdf"
    out_path = project_root / "data" / "elm-prayer-times.json"

    if not pdf_path.exists():
        sys.exit(f"PDF not found: {pdf_path}")

    reader = pypdf.PdfReader(str(pdf_path))
    result: dict[str, dict] = {}

    for page_num, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        month = extract_month(text)
        if month is None:
            print(f"  Page {page_num + 1}: no month found, skipping")
            continue

        month_name = MONTH_NAMES[month - 1]
        rows_found = 0

        for line in text.splitlines():
            parsed = parse_row(line)
            if parsed is None:
                continue
            day, raw_times = parsed
            times_24h = convert_to_24h(raw_times)
            key = f"{month:02d}-{day:02d}"
            result[key] = dict(zip(KEYS, times_24h))
            rows_found += 1

        print(f"  Page {page_num + 1}: {month_name} — {rows_found} days")

    # Sort by key for readability
    result = dict(sorted(result.items()))

    print(f"\nTotal entries: {len(result)}")
    if len(result) != 365:
        print(f"  WARNING: expected 365, got {len(result)}")

    # Spot-check
    for check_key in ["01-01", "06-01", "12-31"]:
        if check_key in result:
            print(f"  {check_key}: {result[check_key]}")

    out_path.write_text(json.dumps(result, indent=2) + "\n")
    print(f"\nWritten to: {out_path}")


if __name__ == "__main__":
    main()
