import glob
import os
import xarray as xr

INPUT_PATTERN = "data/processed/glorys_2021-01-*_025deg.nc"
OUTPUT = "data/processed/glorys_2021_01_025deg.nc"


def main():
    files = sorted(glob.glob(INPUT_PATTERN))

    print("==========================================")
    print("COMBINING JANUARY 2021 GLORYS FILES")
    print("==========================================")

    print(f"\nFiles found: {len(files)}")

    if len(files) != 31:
        raise RuntimeError(
            f"Expected 31 daily files, but found {len(files)}"
        )

    print("\nOpening daily files...")

    ds = xr.open_mfdataset(
        files,
        combine="by_coords",
        chunks={"time": 1}
    )

    print("\nCombined dataset:")
    print(ds)

    print("\nDimensions:")
    for name, size in ds.sizes.items():
        print(f"{name:10s}: {size}")

    print("\nWriting combined file...")

    encoding = {
        "thetao": {
            "dtype": "float32",
            "zlib": True,
            "complevel": 4
        }
    }

    ds.to_netcdf(
        OUTPUT,
        mode="w",
        encoding=encoding
    )

    ds.close()

    print("\n==========================================")
    print("COMBINATION COMPLETE")
    print("==========================================")

    print(f"Output: {OUTPUT}")

    print("\nVerifying output...")

    check = xr.open_dataset(OUTPUT)

    print(check)

    print("\nFinal dimensions:")
    for name, size in check.sizes.items():
        print(f"{name:10s}: {size}")

    print("\nTime range:")
    print(f"First: {check.time.values[0]}")
    print(f"Last : {check.time.values[-1]}")

    check.close()

    print("\n==========================================")
    print("VERIFICATION COMPLETE")
    print("==========================================")


if __name__ == "__main__":
    main()