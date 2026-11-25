# Microscope Lab

More → Microscope Lab uses OpenSeadragon to browse the professor-provided REN 123 slides. It requests the visible tiles at the current magnification. The originals stay in their original folders. Shared conversions use the same authenticated, range-enabled R2 storage as other site materials. The viewer library is loaded when a slide is first opened.

The Renal catalog uses the professor’s [Kidney and Lower Urinary Tract folders](https://drive.google.com/drive/folders/1xIYZylMv6aaEjZEw_WGc4qfew6tUyKdu?usp=sharing). Each specimen card uses its original embedded overview image. The displayed title and accession follow the photographed label when legible. One card can open several tissue scans. Scan 1 stays in the cover area. If there is no tissue scan beyond the label, the card shows a cover without a viewer action. Cover images and the catalog use the same private asset bindings as scan tiles.

## Import another Olympus slide

Keep the `.vsi` file beside the original `_<slide>_` directory, including its `.ets` files. Bio-Formats reads those files together. Use Java with the [Bio-Formats package](https://bio-formats.readthedocs.io/en/stable/users/comlinetools/conversion.html) and Python with `pyvips` and libvips.

1. Run `python scripts/prepare-microscope-slide.py source.vsi out.rslide --bioformats /path/to/bioformats_package.jar --list-series` to identify tissue scans and distinguish them from label thumbnails.
2. Run the same command with `--series N` in place of `--list-series`. The conversion reads the full-resolution pixels for that scan and produces a JPEG tile pyramid with libvips.
3. Open the output with **Open a local slide** to verify the crop, magnification and source identity. The viewer also opens local JPEG, PNG and WebP files. Local selections remain on the device.
4. For shared slides, add the reviewed name and source grouping to the private microscope catalog. Register exact byte counts and SHA-256 digests in `lib/microscope-assets.json`. If the package exceeds the upload bound, split it into ordered binary chunks and list their individual URLs and sizes under `parts`. The viewer reads the chunks as one address space. Store the catalog and slide packages or chunks in the approved private bucket with the [standard content-addressed asset transfer](cloudflare/ASSET-TRANSFER.md).
5. Check authenticated byte-range access in staging and exercise pan, pinch, zoom and fit in the browser before a reviewed release. Keep original academic scans, package files and the catalog out of Git.
