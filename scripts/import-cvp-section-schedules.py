"""Build redacted CVP section defaults from the weekly workbook and extracted TBL rosters."""
import argparse
import json
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SECTIONS = {"Male - I": "M1", "Male - II": "M2", "Female - I": "F1", "Female - II": "F2"}
DAYS = ("B", "F", "J", "O", "U")
ROSTER_ROW = re.compile(r"^\s*\d{7,}\s+.*?\s{2,}([MF][12])\s+(\d{1,2})(?:\s|$)")
CELL = re.compile(r"([A-Z]+)(\d+)")


def column(value):
    result = 0
    for letter in value:
        result = result * 26 + ord(letter) - 64
    return result


def coordinate(value):
    name, row = CELL.fullmatch(value).groups()
    return column(name), int(row)


def tidy(text):
    return " ".join(text.split())


def read_workbook(file):
    with ZipFile(file) as workbook:
        strings = [
            "".join(node.text or "" for node in item.findall(".//s:t", NS))
            for item in ET.fromstring(workbook.read("xl/sharedStrings.xml"))
        ]
        root = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))
    cells = {}
    for cell in root.findall(".//s:c", NS):
        value = cell.findtext("s:v", namespaces=NS)
        if value is not None:
            cells[coordinate(cell.attrib["r"])] = strings[int(value)] if cell.get("t") == "s" else value
    merges = {}
    for merged in root.findall(".//s:mergeCell", NS):
        start, end = map(coordinate, merged.get("ref").split(":"))
        merges[start] = end
    return cells, merges


def read_teams(files):
    teams = defaultdict(set)
    for file in files:
        for line in file.read_text().splitlines():
            match = ROSTER_ROW.match(line)
            if match:
                section, number = match.groups()
                teams[section].add(int(number))
    actual = {section: sorted(values) for section, values in teams.items()}
    expected = {"M1": list(range(1, 18)), "M2": list(range(18, 29)),
                "F1": list(range(1, 23)), "F2": list(range(23, 38))}
    if actual != expected:
        raise ValueError(f"TBL group coverage differs from the verified roster ranges: {actual}")
    return {section: [section[0] + str(number) for number in values] for section, values in actual.items()}


def time_slot(text):
    match = re.fullmatch(r"(\d{1,2}):(\d\d) to (\d{1,2}):(\d\d) (am|pm)", tidy(text), re.I)
    if not match:
        return None
    sh, sm, eh, em, period = match.groups()
    end = int(eh) % 12 + (12 if period.lower() == "pm" else 0)
    start = int(sh) % 12 + (12 if period.lower() == "pm" else 0)
    if (start, int(sm)) >= (end, int(em)):
        start -= 12
    return f"{start:02}:{sm}", f"{end:02}:{em}"


def workbook_date(value):
    return (date(1899, 12, 30) + timedelta(days=int(value))).isoformat()


def lab_scope(title):
    match = re.search(r"\b([MF][12])\s*-?\s*([AB])\b", title, re.I)
    if not match:
        return None
    section, stream = (part.upper() for part in match.groups())
    groups = set(re.findall(r"\b[12]\.\d{1,2}\b", title))
    for first, last in re.findall(r"\b([12]\.\d{1,2})\s*[-–]\s*([12]\.\d{1,2})\b", title):
        start_prefix, start_number = first.split(".")
        end_prefix, end_number = last.split(".")
        if start_prefix == end_prefix and int(start_number) <= int(end_number):
            groups.update(f"{start_prefix}.{number}" for number in range(int(start_number), int(end_number) + 1))
    return section, stream, sorted(groups, key=lambda value: tuple(map(int, value.split("."))))


def event_label(text):
    if re.match(r"^TBL\s*-?\s*\d", text, re.I):
        return "CVP 112 · TBL " + re.search(r"\d+", text).group(), "tbl"
    if re.search(r"\bMOL\s+114\s+TBL", text, re.I):
        return "MOL 114 · TBL " + re.search(r"TBL\s*-?\s*(\d+)", text, re.I).group(1), "tbl"
    if re.search(r"\bOSPE\b", text, re.I):
        return text, "practical"
    if re.search(r"\bexam\b", text, re.I):
        return text, "exam"
    if text == "Prayer and Lunch":
        return text, "break"
    return text, "class"


def build(cells, merges, teams):
    blocks = sorted(row for (col, row), value in cells.items() if col == 1 and "WEEKLY SCHEDULE" in value)
    if len(blocks) != 7 or any("CVP 112 Block" not in cells[(1, row + 1)] for row in blocks):
        raise ValueError("Expected seven CVP 112 weekly blocks")
    groups = {section: {"classCode": section, "groupCode": section, "tblGroups": teams[section],
                        "lectures": [], "events": []} for section in SECTIONS.values()}
    titles, mol, lecture_dates, ignored = {}, {}, defaultdict(dict), []
    for week, first in enumerate(blocks, 1):
        last = blocks[week] if week < len(blocks) else 335
        headers = {col: SECTIONS[value] for (col, row), value in cells.items()
                   if row == first + 6 and value in SECTIONS}
        for col in list(headers):
            end, _ = merges.get((col, first + 6), (col, first + 6))
            for lane in range(col, end + 1):
                headers[lane] = headers[col]
        starts = [column(name) for name in DAYS]
        dates = {col: workbook_date(cells[(col, first + 5)]) for col in starts}
        slots = {row: time_slot(value) for (col, row), value in cells.items()
                 if col == 1 and first + 7 <= row < last and time_slot(value)}
        for (col, row), value in sorted(cells.items(), key=lambda item: (item[0][1], item[0][0])):
            if not first + 7 <= row < last or col not in headers:
                continue
            text = tidy(value)
            if row not in slots:
                if col in (2, 6):
                    lecture = re.match(r"^([AP]\d{1,2})(?:\.|\s)", text)
                    if lecture:
                        titles["CVP-" + lecture[1]] = re.sub(r"\s+Dr\.?\s+.*$", "", text, flags=re.I)
                if col == 15:
                    code = re.match(r"^MOL\s+(\d{1,2}):", text)
                    if code:
                        mol["MOL-" + code[1]] = re.sub(r"\s*\.?\s+Dr\.?\s+.*$", "", text.split(":", 1)[1].strip(), flags=re.I)
                continue
            if "General Requirements Courses" in text:
                continue
            end_col, end_row = merges.get((col, row), (col, row))
            days = [start for start in starts if start <= col]
            day = days[-1]
            if any(col < other <= end_col for other in starts):
                ignored.append((week, col, row, "cross-day merge"))
                continue
            target = {headers[lane] for lane in range(col, end_col + 1) if lane in headers}
            explicit = set(re.findall(r"\b[MF][12](?![.-]\d)\b", text)) if re.search(r"\b(?:online|sections?|LAB)\b", text, re.I) else set()
            scope = lab_scope(text)
            if scope:
                target &= {scope[0]}
            elif explicit:
                target &= explicit
            if not target:
                ignored.append((week, col, row, "section mismatch"))
                continue
            title, kind = event_label(text)
            start, end = slots[row]
            final_slot = max(slot for slot in slots if row <= slot <= end_row)
            end = slots[final_slot][1]
            if "(10-11:30)" in text:
                start, end = "10:00", "11:30"
            if "10 am-12 pm" in text:
                start, end = "10:00", "12:00"
            if re.search(r"\b1-3 pm\b", text):
                start, end = "13:00", "15:00"
            if re.search(r"\b3-5 pm\b", text):
                start, end = "15:00", "17:00"
            for section in target:
                event = {"title": title, "date": dates[day], "time": start, "end": end, "kind": kind}
                if scope:
                    event["labStream"] = scope[1]
                    if scope[2]:
                        event["labGroups"] = scope[2]
                if event not in groups[section]["events"]:
                    groups[section]["events"].append(event)
                code = re.match(r"^([AP]\d{1,2})(?:\.|\s|$)", text)
                if code:
                    lecture_dates[section].setdefault("CVP-" + code[1], dates[day])
    for section, group in groups.items():
        if len(lecture_dates[section]) != 51:
            missing = set(titles) - set(lecture_dates[section])
            raise ValueError(f"{section}: expected 51 CVP lectures, found {len(lecture_dates[section])}; missing {sorted(missing)}")
        group["lectures"] = [
            {"id": ident, "title": titles[ident], "course": "CVP 112", "availableOn": first}
            for ident, first in sorted(lecture_dates[section].items(), key=lambda item: (item[1], item[0]))
        ]
        group["lectures"] += [{"id": ident, "title": mol[ident], "course": "MOL 114"}
                              for ident in sorted(mol, key=lambda value: int(value.split("-")[1]))]
        group["labGroups"] = {
            stream: sorted({number for event in group["events"] if event.get("labStream") == stream
                            for number in event.get("labGroups", [])},
                           key=lambda value: tuple(map(int, value.split("."))))
            for stream in ("A", "B")
        }
        group["events"].sort(key=lambda event: (event["date"], event["time"], event["title"]))
        print(section, len(group["lectures"]), "lectures,", len(group["events"]), "events,", len(group["tblGroups"]), "TBL teams")
    for item in ignored:
        print("Review workbook cell", item)
    return list(groups.values())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("male_roster_text", type=Path)
    parser.add_argument("female_roster_text", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    data = build(*read_workbook(args.workbook), read_teams((args.male_roster_text, args.female_roster_text)))
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
