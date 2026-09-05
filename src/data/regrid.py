import os
import gc
import numpy as np
import xarray as xr

INPUT = "data/raw/glorys_2021_03.nc"
OUTPUT_DIR = "data/processed"

# Target 0.25° grid
NEW_LAT = np.arange(5.0, 30.0 + 0.25, 0.25, dtype=np.float32)
NEW_LON = np.arange(45.0, 105.0 + 0.25, 0.25, dtype=np.float32)


def main():

    print("Opening source dataset...")

    ds = xr.open_dataset(INPUT)

    thetao = ds["thetao"]

    print("\nSource dataset:")
    print(f"  Time      : {ds.sizes['time']}")
    print(f"  Depth     : {ds.sizes['depth']}")
    print(f"  Latitude  : {ds.sizes['latitude']}")
    print(f"  Longitude : {ds.sizes['longitude']}")

    print("\nTarget grid:")
    print(f"  Latitude  : {len(NEW_LAT)}")
    print(f"  Longitude : {len(NEW_LON)}")

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for t in range(ds.sizes["time"]):

        date_str = str(ds.time.values[t])[:10]

        output_file = os.path.join(
            OUTPUT_DIR,
            f"glorys_{date_str}_025deg.nc"
        )

        print(f"\nProcessing day {t + 1}/{ds.sizes['time']}")
        print(f"Output: {output_file}")

        # Remove incomplete file from an earlier run.
        if os.path.exists(output_file):
            os.remove(output_file)

        depth_results = []

        for z in range(ds.sizes["depth"]):

            print(
                f"  Processing depth {z + 1}/{ds.sizes['depth']}",
                end="\r"
            )

            # Load ONLY one 2-D spatial slice.
            source_slice = thetao.isel(
                time=t,
                depth=z
            ).load()

            # Interpolate ONLY this small 2-D slice.
            result = source_slice.interp(
                latitude=NEW_LAT,
                longitude=NEW_LON,
                method="linear"
            )

            # Store as float32 to reduce output size.
            result = result.astype(np.float32)

            depth_results.append(result)

            del source_slice
            gc.collect()

        print()

        # Combine the 35 depth slices for this day.
        day = xr.concat(
            depth_results,
            dim="depth"
        )

        day = day.assign_coords(
            depth=ds.depth.values
        )

        # Add exactly one time dimension.
        day = day.expand_dims(
            time=[ds.time.values[t]]
        )

        day_ds = day.to_dataset(
            name="thetao"
        )

        encoding = {
            "thetao": {
                "dtype": "float32",
                "zlib": True,
                "complevel": 4
            }
        }

        print("  Writing daily output...")

        day_ds.to_netcdf(
            output_file,
            mode="w",
            encoding=encoding
        )

        print(f"Day {t + 1} completed.")

        # Free memory before processing the next day.
        del depth_results
        del day
        del day_ds

        gc.collect()

    ds.close()

    print("\n===================================")
    print("REGRIDDING COMPLETE")
    print("===================================")
    print(f"Output directory: {OUTPUT_DIR}")

    # Verify all generated files.
    print("\nVerifying output files...")

    files = sorted(
        f for f in os.listdir(OUTPUT_DIR)
        if f.endswith("_025deg.nc")
    )

    print(f"Processed files found: {len(files)}")

    for filename in files:

        path = os.path.join(
            OUTPUT_DIR,
            filename
        )

        check = xr.open_dataset(path)

        print(
            f"  {filename}: "
            f"{dict(check.sizes)}"
        )

        check.close()


if __name__ == "__main__":
    main()