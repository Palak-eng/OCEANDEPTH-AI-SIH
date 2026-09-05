import glob
import os
import numpy as np
import xarray as xr


PROCESSED_PATTERN = "data/processed/glorys_2021-01-*_025deg.nc"


def main():

    files = sorted(glob.glob(PROCESSED_PATTERN))

    print("==========================================")
    print("GLORYS PROCESSED DATA INSPECTION")
    print("==========================================")

    print(f"\nFiles found: {len(files)}")

    if len(files) == 0:
        raise FileNotFoundError(
            f"No files found matching: {PROCESSED_PATTERN}"
        )

    # ------------------------------------------
    # Open lazily with Dask
    # ------------------------------------------

    print("\nOpening processed dataset...")

    ds = xr.open_mfdataset(
        files,
        combine="by_coords"
    )

    thetao = ds["thetao"]

    print("\nDataset:")
    print(ds)

    # ------------------------------------------
    # Basic dimensions
    # ------------------------------------------

    print("\n==========================================")
    print("1. DIMENSIONS")
    print("==========================================")

    for name, size in ds.sizes.items():
        print(f"{name:10s}: {size}")

    # ------------------------------------------
    # Coordinate ranges
    # ------------------------------------------

    print("\n==========================================")
    print("2. COORDINATE RANGES")
    print("==========================================")

    print(
        f"Latitude : "
        f"{float(ds.latitude.min()):.2f} "
        f"to "
        f"{float(ds.latitude.max()):.2f}"
    )

    print(
        f"Longitude: "
        f"{float(ds.longitude.min()):.2f} "
        f"to "
        f"{float(ds.longitude.max()):.2f}"
    )

    print(
        f"Depth    : "
        f"{float(ds.depth.min()):.3f} "
        f"to "
        f"{float(ds.depth.max()):.3f} m"
    )

    print(
        f"Time     : "
        f"{ds.time.values[0]} "
        f"to "
        f"{ds.time.values[-1]}"
    )

    # ------------------------------------------
    # Temperature statistics
    # ------------------------------------------

    print("\n==========================================")
    print("3. TEMPERATURE STATISTICS")
    print("==========================================")

    print("\nComputing statistics...")

    minimum = float(thetao.min().compute())
    maximum = float(thetao.max().compute())
    mean = float(thetao.mean().compute())
    std = float(thetao.std().compute())

    print(f"Minimum : {minimum:.4f} °C")
    print(f"Maximum : {maximum:.4f} °C")
    print(f"Mean    : {mean:.4f} °C")
    print(f"Std     : {std:.4f} °C")

    # ------------------------------------------
    # NaN statistics
    # ------------------------------------------

    print("\n==========================================")
    print("4. MISSING VALUES")
    print("==========================================")

    print("\nChecking NaNs...")

    total_values = thetao.size

    nan_count = int(
        thetao.isnull().sum().compute()
    )

    nan_percentage = (
        nan_count / total_values
    ) * 100

    print(f"Total values : {total_values:,}")
    print(f"NaN values   : {nan_count:,}")
    print(f"NaN percentage: {nan_percentage:.4f}%")

    # ------------------------------------------
    # NaNs by depth
    # ------------------------------------------

    print("\n==========================================")
    print("5. NaNs BY DEPTH")
    print("==========================================")

    nan_by_depth = (
        thetao.isnull()
        .mean(dim=("time", "latitude", "longitude"))
        .compute()
    )

    print("\nDepth (m)     Missing (%)")
    print("--------------------------------")

    for depth, percentage in zip(
        ds.depth.values,
        nan_by_depth.values * 100
    ):
        print(
            f"{float(depth):8.3f}      "
            f"{float(percentage):8.3f}"
        )

    # ------------------------------------------
    # Mean temperature by depth
    # ------------------------------------------

    print("\n==========================================")
    print("6. MEAN TEMPERATURE BY DEPTH")
    print("==========================================")

    depth_mean = (
        thetao
        .mean(dim=("time", "latitude", "longitude"))
        .compute()
    )

    print("\nDepth (m)     Mean Temp (°C)")
    print("--------------------------------")

    for depth, temperature in zip(
        ds.depth.values,
        depth_mean.values
    ):
        print(
            f"{float(depth):8.3f}      "
            f"{float(temperature):10.4f}"
        )

    # ------------------------------------------
    # Daily mean temperature
    # ------------------------------------------

    print("\n==========================================")
    print("7. DAILY MEAN TEMPERATURE")
    print("==========================================")

    daily_mean = (
        thetao
        .mean(dim=("depth", "latitude", "longitude"))
        .compute()
    )

    print("\nDate          Mean Temp (°C)")
    print("--------------------------------")

    for date, temperature in zip(
        ds.time.values,
        daily_mean.values
    ):
        print(
            f"{str(date)[:10]}      "
            f"{float(temperature):10.4f}"
        )

    # ------------------------------------------
    # Check physically suspicious values
    # ------------------------------------------

    print("\n==========================================")
    print("8. SUSPICIOUS VALUES")
    print("==========================================")

    below_minus_5 = int(
        (thetao < -5).sum().compute()
    )

    above_40 = int(
        (thetao > 40).sum().compute()
    )

    print(f"Values below -5°C : {below_minus_5:,}")
    print(f"Values above 40°C : {above_40:,}")

    # ------------------------------------------
    # Final summary
    # ------------------------------------------

    print("\n==========================================")
    print("INSPECTION COMPLETE")
    print("==========================================")

    ds.close()


if __name__ == "__main__":
    main()