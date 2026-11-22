#!/usr/bin/env python3
"""Verify only tracked academic asset manifests, without contacting Cloudflare."""
import argparse
from contextlib import ExitStack
import hashlib
import json
from pathlib import Path
import re
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / ".sites-runtime" / "staging"
SHA = re.compile(r"[a-f0-9]{64}")
SAFE_ID = re.compile(r"[A-Za-z0-9_.-]{1,160}")


def manifest(filename):
    source = (ROOT / "lib" / filename).read_text()
    return json.JSONDecoder().raw_decode(source[source.index("[", source.index("=")):])[0]


def check(entry, data, output=None):
    digest = hashlib.sha256()
    size = 0
    for chunk in iter(lambda: data.read(1024 * 1024), b""):
        digest.update(chunk)
        if output is not None:
            output.write(chunk)
        size += len(chunk)
    if size != entry["size"] or digest.hexdigest() != entry["sha"]:
        raise ValueError(f"Checksum or size mismatch for {entry['key']}")


def approved_asset_plan():
    entries = {}
    for category, name, prefix in [
        ("curriculum", "site-assets-manifest.ts", "site-assets/data/"),
        ("study", "study-asset-registry.ts", "study-assets-v1/"),
        ("privatePublisher", "publisher-packs-manifest.ts", "publisher-packs/v1/"),
    ]:
        group = manifest(name)
        if category == "privatePublisher":
            group = [row for row in group if row.get("private") is True]
        for row in group:
            sha = row["sha"]
            if not SHA.fullmatch(sha) or not isinstance(row["size"], int) or row["size"] <= 0:
                raise ValueError("Invalid tracked asset manifest")
            key = prefix + sha
            reference = row.get("id", row.get("path"))
            if category == "study" and not SAFE_ID.fullmatch(reference):
                raise ValueError("Invalid study asset ID")
            entry = entries.setdefault(key, {
                "key": key, "sha": sha, "size": row["size"], "category": category,
                "references": [], "contentType": row.get("type"),
            })
            if entry["size"] != row["size"]:
                raise ValueError("Conflicting size for a content-addressed key")
            entry["references"].append(reference)
    return entries


def verify_sources(entries, prepare_root):
    approved_pdfs = json.loads((STAGING / "phase3-private-originals.json").read_text())
    pdf_paths = {item["objectKey"]: item for item in approved_pdfs if item.get("private") is True}
    if set(pdf_paths) != {key for key, entry in entries.items() if entry["category"] == "privatePublisher"}:
        raise ValueError("Private publisher input set does not match the tracked selection")
    with ExitStack() as resources:
        archives = {}
        for path in sorted((STAGING / "study-assets").glob("*.zip")):
            package = resources.enter_context(ZipFile(path))
            for name in package.namelist():
                if name in archives:
                    raise ValueError("Duplicate study asset in approved archives")
                archives[name] = package
        for key, entry in entries.items():
            if entry["category"] == "curriculum":
                source = (STAGING / "course-assets" / entry["sha"]).open("rb")
            elif entry["category"] == "study":
                identifier = entry["references"][0]
                source = archives[identifier].open(identifier)
            else:
                metadata = pdf_paths[key]
                if metadata["path"] != entry["references"][0] or metadata["sha"] != entry["sha"]:
                    raise ValueError("Publisher source does not match the approved document")
                source = Path(metadata["source"]).open("rb")
            with source:
                if prepare_root is None:
                    check(entry, source)
                    continue
                destination = prepare_root / key
                destination.parent.mkdir(parents=True, exist_ok=True)
                try:
                    with destination.open("xb") as output:
                        check(entry, source, output)
                except ValueError:
                    destination.unlink()
                    raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--readback-root", type=Path, help="Local file tree of downloaded destination objects, using exact R2 keys")
    mode.add_argument("--prepare-root", type=Path, help="Create a new private transfer directory of approved source objects")
    parser.add_argument("--inventory", type=Path, help="Write receipt and expected keys to an ignored local path")
    args = parser.parse_args()
    entries = approved_asset_plan()
    if args.readback_root is None:
        if args.prepare_root is not None:
            args.prepare_root.mkdir(mode=0o700)
        verify_sources(entries, args.prepare_root)
    else:
        found = {str(path.relative_to(args.readback_root)) for path in args.readback_root.rglob("*") if path.is_file()}
        if found != entries.keys():
            raise ValueError(f"Readback inventory has {len(entries.keys() - found)} missing and {len(found - entries.keys())} extra objects")
        for key, entry in entries.items():
            with (args.readback_root / key).open("rb") as data:
                check(entry, data)
    counts = {
        category: {
            "entries": sum(len(row["references"]) for row in entries.values() if row["category"] == category),
            "objects": sum(row["category"] == category for row in entries.values()),
            "bytes": sum(row["size"] for row in entries.values() if row["category"] == category),
        }
        for category in ("curriculum", "study", "privatePublisher")
    }
    report = {"verifiedFrom": "source" if args.readback_root is None else "local readback tree",
              "counts": counts, "objects": list(entries.values())}
    if args.inventory:
        with args.inventory.open("x") as output:
            json.dump(report, output, indent=2)
            output.write("\n")
    print(json.dumps({"verifiedFrom": report["verifiedFrom"], "counts": counts}))


if __name__ == "__main__":
    main()
