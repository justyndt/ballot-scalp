#!/usr/bin/env python3
"""Reconcile source:dos races against data/CandidateList.txt (DOS downloadcanlist.asp)."""

from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIST = ROOT / "data" / "CandidateList.txt"
RACES_PATHS = [
    ROOT / "scaffold" / "src" / "data" / "races.json",
    ROOT / "data" / "races.json",
]

PARTY_MAP = {
    "DEM": "Democrat",
    "REP": "Republican",
    "NPA": "No Party Affiliation",
    "LPF": "Libertarian",
    "WRI": "Write-In",
    "NOP": "Nonpartisan office",
    "IND": "Independent Party of Florida",
    "CPF": "Constitution Party of Florida",
}

STATUS_MAP = {
    "Did Not Qualify": "Did not qualify",
    "Withdrew": "Withdrew",
}

SKIP_STATUS = {"Transferred to Local", "Removed", "Deceased"}

# Site statuses that already encode more than the extract's Qualified/Unopposed.
KEEP_STATUS = {
    "Qualified, unopposed primary",
    "Unopposed, elected",
    "On the ballot for retention",
    "Elected without opposition",
}

SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def load_list(path: Path) -> list[dict]:
    rows = []
    with path.open(encoding="utf-8") as f:
        header = f.readline().rstrip("\n").split("\t")
        for line in f:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < len(header):
                parts += [""] * (len(header) - len(parts))
            rows.append(dict(zip(header, parts)))
    return rows


def norm_j(j: str) -> str:
    j = (j or "").strip()
    return j.zfill(3) if j.isdigit() else j


def race_key(race: dict) -> tuple[str, str, str] | None:
    office = race["office"]
    if "United States Senator" in office:
        return ("USS", "", "")
    if "United States Representative" in office:
        return ("USR", "002", "")
    if "Governor" in office:
        return ("GOV", "", "")
    if office == "Attorney General":
        return ("ATG", "", "")
    if "Chief Financial" in office:
        return ("CFO", "", "")
    if "Agriculture" in office:
        return ("AGR", "", "")
    if "Supreme Court" in office:
        return ("SCJ", "", "")
    if "District Court of Appeal" in office:
        return ("DCA", "001", "")
    if "State Representative" in office:
        return ("STR", norm_j(race.get("districtNumber") or ""), "")
    if "Circuit Judge" in office:
        return ("CTJ", "002", norm_j(race.get("districtNumber") or ""))
    return None


def curly_quotes(s: str) -> str:
    out = []
    open_q = True
    for ch in s:
        if ch == '"':
            out.append("\u201c" if open_q else "\u201d")
            open_q = not open_q
        else:
            out.append(ch)
    return "".join(out)


def display_name(r: dict) -> str:
    first = r["NameFirst"].strip()
    mid = curly_quotes(r["NameMiddle"].strip())
    last = r["NameLast"].strip()
    return " ".join(p for p in (first, mid, last) if p)


def treasurer_name(r: dict) -> str | None:
    bits = [
        r.get("TrsNameFirst", "").strip(),
        r.get("TrsNameMiddle", "").strip(),
        r.get("TrsNameLast", "").strip(),
    ]
    name = " ".join(b for b in bits if b)
    return curly_quotes(name) if name else None


def format_phone(raw: str) -> str | None:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    return None


def clean_email(raw: str) -> str | None:
    e = (raw or "").strip()
    if not e or "@" not in e or " " in e:
        return None
    return e


def last_name_key(name: str) -> str:
    parts = re.sub(r'["“”(),.]', "", name).strip().split()
    while len(parts) > 1 and parts[-1].lower() in SUFFIXES:
        parts.pop()
    return (parts[-1] if parts else name).lower()


def slugify(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "candidate"


def unique_id(base: str, used: set[str]) -> str:
    if base not in used:
        used.add(base)
        return base
    n = 2
    while f"{base}-{n}" in used:
        n += 1
    uid = f"{base}-{n}"
    used.add(uid)
    return uid


def new_candidate(r: dict, photo: str, used_ids: set[str], governor: bool) -> dict:
    party_code = r["PartyCode"]
    party = PARTY_MAP.get(party_code)
    if party is None:
        raise ValueError(f"Unsupported party {party_code} for {r['AcctNum']}")
    status = STATUS_MAP[r["StatusDesc"]]
    name = display_name(r)
    cid = unique_id(slugify(name), used_ids)
    c = {
        "id": cid,
        "name": name,
        "party": party,
        "incumbent": False,
        "writeIn": party_code == "WRI",
        "status": status,
        "qualified": None,
        "announced": None,
        "petitionMet": None,
        "qualifyingMethod": None,
        "treasurer": treasurer_name(r),
        "treasurerFiled": None,
        "email": clean_email(r.get("Email", "")),
        "phone": format_phone(r.get("Phone", "")),
        "website": None,
        "note": None,
        "photo": photo,
        "recordUrl": f"https://dos.elections.myflorida.com/candidates/CanDetail.asp?account={r['AcctNum']}",
        "financeUrl": f"https://dos.elections.myflorida.com/cgi-bin/TreSel.exe?account={r['AcctNum']}",
        "financeRaised": None,
        "financeInKind": None,
        "financeSpent": None,
    }
    if status == "Withdrew":
        c["withdrew"] = None
    if governor:
        c["runningMate"] = None
    return c


def main() -> None:
    rows = load_list(LIST)
    by_acct = {r["AcctNum"]: r for r in rows}
    extract_by: dict[tuple[str, str, str], list[dict]] = defaultdict(list)
    for r in rows:
        if r["StatusDesc"] in SKIP_STATUS:
            continue
        key = (r["OfficeCode"], norm_j(r["Juris1num"]), norm_j(r["Juris2num"]))
        extract_by[key].append(r)

    data = json.loads(RACES_PATHS[0].read_text(encoding="utf-8"))

    for src in data["meta"]["sources"]:
        if src["id"] == "dos":
            src["label"] = "Florida Division of Elections: Candidate List Download"
            src["url"] = "https://dos.elections.myflorida.com/candidates/downloadcanlist.asp"

    photos = sorted(
        {c["photo"] for race in data["races"] for c in race["candidates"] if c.get("photo")}
    )
    photo_i = 0

    used_ids = {c["id"] for race in data["races"] for c in race["candidates"]}
    existing_accts = set()
    for race in data["races"]:
        for c in race["candidates"]:
            m = re.search(r"account=(\d+)", c.get("recordUrl") or "")
            if m:
                existing_accts.add(m.group(1))

    stats = {
        "updated_treasurer": 0,
        "updated_phone": 0,
        "updated_email": 0,
        "added": 0,
        "skipped_party": 0,
    }
    skipped: list[str] = []

    for race in data["races"]:
        if race.get("source") != "dos":
            continue
        key = race_key(race)
        if not key:
            continue
        governor = "Governor" in race["office"]

        for c in race["candidates"]:
            m = re.search(r"account=(\d+)", c.get("recordUrl") or "")
            if not m:
                continue
            r = by_acct.get(m.group(1))
            if not r:
                continue

            t = treasurer_name(r)
            if t and c.get("treasurer") != t:
                c["treasurer"] = t
                stats["updated_treasurer"] += 1

            ph = format_phone(r.get("Phone", ""))
            if ph and c.get("phone") != ph:
                c["phone"] = ph
                stats["updated_phone"] += 1

            em = clean_email(r.get("Email", ""))
            if em and c.get("email") != em:
                c["email"] = em
                stats["updated_email"] += 1

            finance = f"https://dos.elections.myflorida.com/cgi-bin/TreSel.exe?account={r['AcctNum']}"
            if c.get("financeUrl") != finance:
                c["financeUrl"] = finance

            # Only overwrite status when extract says they left the field.
            mapped = STATUS_MAP.get(r["StatusDesc"])
            if mapped and c["status"] not in KEEP_STATUS and c["status"] != mapped:
                c["status"] = mapped
                if mapped == "Withdrew" and "withdrew" not in c:
                    c["withdrew"] = None

        for r in extract_by.get(key, []):
            if r["AcctNum"] in existing_accts:
                continue
            if r["StatusDesc"] not in STATUS_MAP:
                continue
            if r["PartyCode"] not in PARTY_MAP:
                stats["skipped_party"] += 1
                skipped.append(
                    f"{race['id']}: {display_name(r)} ({r['PartyCode']}/{r['StatusDesc']})"
                )
                continue
            photo = photos[photo_i % len(photos)]
            photo_i += 1
            cand = new_candidate(r, photo, used_ids, governor=governor)
            race["candidates"].append(cand)
            existing_accts.add(r["AcctNum"])
            stats["added"] += 1

        race["candidates"].sort(key=lambda c: (last_name_key(c["name"]), c["name"].lower()))

    text = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    for path in RACES_PATHS:
        path.write_text(text, encoding="utf-8")

    n_cands = sum(len(r["candidates"]) for r in data["races"])
    print(json.dumps({**stats, "total_candidates": n_cands, "skipped": skipped}, indent=2))


if __name__ == "__main__":
    main()
