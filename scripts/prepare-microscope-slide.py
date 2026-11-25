#!/usr/bin/env python3
"""Convert an Olympus VSI/ETS scan to a packed, range-readable JPEG pyramid."""
import argparse
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess
import tempfile

import pyvips


def package_pyramid(source, output):
    with tempfile.TemporaryDirectory(prefix="review-slide-") as folder:
        prefix = Path(folder) / "pyramid"
        image = pyvips.Image.new_from_file(str(source))
        image.dzsave(str(prefix), tile_size=512, overlap=1, depth="onepixel", suffix=".jpg[Q=88]", background=[255, 255, 255])
        tiles = {}
        root = prefix.with_name("pyramid_files")
        offset = 0
        files = sorted(root.glob("*/*.jpg"))
        for tile in files:
            size = tile.stat().st_size
            tiles[str(tile.relative_to(root).with_suffix(""))] = [offset, size]
            offset += size
        if not tiles:
            raise ValueError("The slide did not produce any tiles.")
        header = json.dumps({"width": image.width, "height": image.height, "tileSize": 512, "overlap": 1, "tiles": tiles}, separators=(",", ":")).encode()
        pending = output.with_suffix(".part")
        with pending.open("wb") as dest:
            dest.write(struct.pack(">I", len(header)))
            dest.write(header)
            for tile in files:
                with tile.open("rb") as data:
                    shutil.copyfileobj(data, dest)
        pending.replace(output)


def command(args, entry, flags):
    return [args.java, "-Xmx3g", "-cp", args.bioformats, "loci.formats.tools." + entry, *flags]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--java", default="java")
    parser.add_argument("--bioformats", help="Path to the Bio-Formats package jar")
    parser.add_argument("--list-series", action="store_true")
    parser.add_argument("--series", default="0", help="Non-thumbnail series index from --list-series")
    args = parser.parse_args()
    if args.input.suffix.lower() != ".vsi":
        return package_pyramid(args.input, args.output)
    if not args.bioformats or not list(args.input.with_name("_" + args.input.stem + "_").rglob("*.ets")):
        parser.error("Provide --bioformats and keep the companion _<slide>_ folder with its ETS files beside the VSI.")
    info = subprocess.check_output(command(args, "ImageInfo", ["-nopix", "-noflat", str(args.input)]), text=True)
    sections = re.split(r"(?m)^Series #(\d+) :", info)[1:]
    indexes = {}
    flat_index = 0
    for number, metadata in zip(sections[::2], sections[1::2]):
        indexes[number] = flat_index
        resolutions = re.search(r"Resolutions = (\d+)", metadata)
        flat_index += int(resolutions[1]) if resolutions else 1
    if args.list_series:
        print("\n".join(line.strip() for line in info.splitlines() if re.match(r"Series #|\s*(Width|Height|Thumbnail series) =", line)))
        return
    if args.series not in indexes:
        parser.error("The selected scan is not in the source file.")
    with tempfile.TemporaryDirectory(prefix="review-bioformats-") as folder:
        tiff = Path(folder) / "scan.ome.tiff"
        # Export the highest-resolution series only. libvips builds the display pyramid.
        subprocess.run(command(args, "ImageConverter", ["-series", str(indexes[args.series]), "-z", "0", "-timepoint", "0", "-bigtiff", "-tilex", "512", "-tiley", "512", "-compression", "LZW", str(args.input), str(tiff)]), check=True, stdout=subprocess.DEVNULL)
        package_pyramid(tiff, args.output)


if __name__ == "__main__":
    main()
