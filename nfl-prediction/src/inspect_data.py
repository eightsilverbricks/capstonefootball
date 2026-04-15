import polars as pl

schedules = pl.read_parquet("data/raw/schedules.parquet")
pbp = pl.read_parquet("data/raw/pbp.parquet")

print("\nSCHEDULE COLUMNS:")
print(schedules.columns)

print("\nPBP COLUMNS:")
print(pbp.columns)

print("\nSCHEDULE SAMPLE:")
print(schedules.head(3))

print("\nPBP SAMPLE:")
print(pbp.head(3))