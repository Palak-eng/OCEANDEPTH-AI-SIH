"""
src/data/fetch_argo.py

Fetches Argo float profiles (temperature/salinity vs pressure) as monthly
.nc chunks, using region bounds from config/config.yaml. Argo's native
vertical coordinate is PRESSURE (dbar), not depth in metres — we use the
0-1000m target_depths range from config as an approximate 0-1000 dbar
pressure range for the initial pull. Proper pressure->depth conversion
happens later in preprocessing when we align Argo against GLORYS's true
depth grid.

Setup (one-time):
    pip install argopy

Usage:
    python src/data/fetch_argo.py --start 2021-01-01 --end 2021-06-30
    python src/data/fetch_argo.py --start 2021-01-01 --end 2021-06-30 --overwrite

Output:
    data/raw/argo_2021_01.nc
    data/raw/argo_2021_02.nc
    ...
"""

import argparse
import calendar
from datetime import date
from pathlib import Path

import yaml
from argopy import DataFetcher

CONFIG_PATH = Path(__file__).resolve().parents[2] / "config" / "config.yaml"


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)


def month_ranges(start_date: str, end_date: str):
    """Split a start/end date range into (month_start, month_end, label) tuples."""
    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date)

    if start > end:
        raise ValueError(f"start_date {start} is after end_date {end}")

    ranges = []
    year, month = start.year, start.month

    while (year, month) <= (end.year, end.month):
        _, last_day = calendar.monthrange(year, month)
        month_first = date(year, month, 1)
        month_last = date(year, month, last_day)

        chunk_start = max(month_first, start)
        chunk_end = min(month_last, end)
        label = f"{year}_{month:02d}"

        ranges.append((chunk_start.isoformat(), chunk_end.isoformat(), label))

        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1

    return ranges


def fetch_argo_month(region, pressure_min, pressure_max, raw_dir,
                      chunk_start, chunk_end, label, overwrite=False, max_retries=2):
    out_name = f"argo_{label}.nc"
    out_path = raw_dir / out_name

    if out_path.exists() and not overwrite:
        print(f"  [skip] {out_name} already exists")
        return True

    for attempt in range(1, max_retries + 1):
        try:
            print(f"  [fetch] {label}: {chunk_start} to {chunk_end} "
                  f"(attempt {attempt}/{max_retries})")

            f = DataFetcher(src="erddap", mode="standard").region([
                region["longitude_min"], region["longitude_max"],
                region["latitude_min"], region["latitude_max"],
                pressure_min, pressure_max,
                chunk_start, chunk_end,
            ])

            ds = f.to_xarray()

            n_points = ds.sizes.get("N_POINTS", 0)

            if n_points == 0:
             print(f"  [warn] {label}: no Argo data found in this window")
             return False

            ds.to_netcdf(out_path)
            print(f"  [done] {out_name} — {n_points} data points")
            return True

        except Exception as e:
            print(f"  [error] {label} attempt {attempt} failed: {e}")
            if attempt == max_retries:
                print(f"  [FAILED] {label} — giving up after {max_retries} attempts")
                return False

    return False


def fetch_argo(start_date: str, end_date: str, overwrite=False):
    cfg = load_config()
    region = cfg["region"]
    depths = cfg["target_depths"]
    raw_dir = Path(cfg["paths"]["raw_data"])
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Argo's vertical coordinate is pressure (dbar), not depth (m).
    # Using target_depths range as an approximate pressure range for now —
    # 1 dbar ~ 1.02 m in the upper ocean, close enough for the initial pull.
    # True depth <-> pressure conversion happens in preprocessing.
    pressure_min, pressure_max = min(depths), max(depths)

    chunks = month_ranges(start_date, end_date)
    print(f"Fetching Argo in {len(chunks)} monthly chunk(s): "
          f"{chunks[0][2]} to {chunks[-1][2]}")
    print(f"Region: {region}, pressure {pressure_min}-{pressure_max} dbar\n")

    succeeded, failed = [], []

    for chunk_start, chunk_end, label in chunks:
        ok = fetch_argo_month(
            region, pressure_min, pressure_max, raw_dir,
            chunk_start, chunk_end, label, overwrite=overwrite,
        )
        (succeeded if ok else failed).append(label)

    print("\n--- Summary ---")
    print(f"Succeeded: {len(succeeded)}/{len(chunks)}")
    if failed:
        print(f"Failed: {failed}")
        print("Re-run the same command to retry only the missing months "
              "(already-downloaded ones are skipped).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="YYYY-MM-DD")
    parser.add_argument("--overwrite", action="store_true",
                         help="Re-download months even if the file already exists")
    args = parser.parse_args()

    fetch_argo(args.start, args.end, overwrite=args.overwrite)
