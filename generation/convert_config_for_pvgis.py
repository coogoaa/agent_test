#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from pathlib import Path


def normalize_to_180(x: float) -> float:
    """Normalize angle to (-180, 180] for PVGIS aspect."""
    while x > 180:
        x -= 360
    while x <= -180:
        x += 360
    return x


def looks_swapped_latlon(lat: float, lon: float) -> bool:
    """Heuristic: if |lat|>90 and |lon|<=90, assume swapped."""
    return abs(lat) > 90 and abs(lon) <= 90


def convert_config(input_path: Path, output_path: Path) -> None:
    with input_path.open('r', encoding='utf-8') as f:
        cfg = json.load(f)

    # Fix location if obviously swapped
    lat = cfg['location']['latitude']
    lon = cfg['location']['longitude']
    swapped = False
    if looks_swapped_latlon(lat, lon):
        cfg['location']['latitude'], cfg['location']['longitude'] = lon, lat
        swapped = True

    # Convert each surface azimuth from bearing (0°=North, clockwise) to PVGIS aspect (0°=South)
    # Formula: aspect = 180 - bearing  (then normalize to [-180, 180])
    for s in cfg.get('roof_surfaces', []):
        if 'azimuth' in s and isinstance(s['azimuth'], (int, float)):
            bearing = float(s['azimuth'])
            aspect = 180.0 - bearing
            aspect = normalize_to_180(aspect)
            s['azimuth'] = aspect
            # Optional: annotate description
            desc = s.get('description', '')
            note = f" [bearing={bearing}° -> aspect(PVGIS)={aspect}°]"
            s['description'] = (desc + note).strip()

    # Mark conversion in description
    loc_desc = cfg['location'].get('description', '')
    flags = []
    if swapped:
        flags.append('lat/lon corrected')
    flags.append('azimuth converted to PVGIS aspect (0°=South)')
    if loc_desc:
        cfg['location']['description'] = f"{loc_desc} | {'; '.join(flags)}"
    else:
        cfg['location']['description'] = '; '.join(flags)

    with output_path.open('w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

    print(f"Converted config written to: {output_path}")


def main():
    # Default paths
    default_input = Path(__file__).with_name('config_australia.json')
    default_output = Path(__file__).with_name('config_pvgis_converted.json')

    args = sys.argv[1:]
    if len(args) == 0:
        input_path = default_input
        output_path = default_output
    elif len(args) == 1:
        input_path = Path(args[0])
        output_path = default_output
    else:
        input_path = Path(args[0])
        output_path = Path(args[1])

    if not input_path.exists():
        print(f"Error: input config not found: {input_path}")
        sys.exit(1)

    convert_config(input_path, output_path)


if __name__ == '__main__':
    main()
