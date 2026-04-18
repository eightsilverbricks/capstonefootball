import pandas as pd

schedules = pd.read_parquet("data/raw/schedules.parquet")
pbp = pd.read_parquet("data/raw/pbp.parquet")

print("\nSCHEDULE COLUMNS:")
for col in schedules.columns:
    print(col)

print("\nPBP COLUMNS:")
for col in pbp.columns:
    print(col)