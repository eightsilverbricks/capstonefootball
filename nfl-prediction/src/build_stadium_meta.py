"""Build stadium_meta.json — geographic + capacity metadata for each NFL team's home venue.

Output:
  - nfl-prediction/data/processed/stadium_meta.json
  - primary-ui/public/stadium_meta.json (mirror for direct frontend fetch)
"""
from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = REPO_ROOT / "nfl-prediction" / "data" / "processed"
PUBLIC_DIR = REPO_ROOT / "primary-ui" / "public"

STADIUM_META: dict[str, dict] = {
    "ARI": {"name": "State Farm Stadium",        "city": "Glendale, AZ",        "lat": 33.5276, "lng": -112.2626, "capacity": 63400, "elevation_ft": 1158, "dome": True},
    "ATL": {"name": "Mercedes-Benz Stadium",     "city": "Atlanta, GA",         "lat": 33.7553, "lng":  -84.4006, "capacity": 71000, "elevation_ft": 1050, "dome": True},
    "BAL": {"name": "M&T Bank Stadium",          "city": "Baltimore, MD",       "lat": 39.2780, "lng":  -76.6227, "capacity": 71008, "elevation_ft":   60, "dome": False},
    "BUF": {"name": "Highmark Stadium",          "city": "Orchard Park, NY",    "lat": 42.7738, "lng":  -78.7870, "capacity": 71608, "elevation_ft":  790, "dome": False},
    "CAR": {"name": "Bank of America Stadium",   "city": "Charlotte, NC",       "lat": 35.2258, "lng":  -80.8528, "capacity": 74867, "elevation_ft":  751, "dome": False},
    "CHI": {"name": "Soldier Field",             "city": "Chicago, IL",         "lat": 41.8623, "lng":  -87.6167, "capacity": 61500, "elevation_ft":  600, "dome": False},
    "CIN": {"name": "Paycor Stadium",            "city": "Cincinnati, OH",      "lat": 39.0954, "lng":  -84.5160, "capacity": 65515, "elevation_ft":  490, "dome": False},
    "CLE": {"name": "Cleveland Browns Stadium",  "city": "Cleveland, OH",       "lat": 41.5061, "lng":  -81.6995, "capacity": 67431, "elevation_ft":  600, "dome": False},
    "DAL": {"name": "AT&T Stadium",              "city": "Arlington, TX",       "lat": 32.7473, "lng":  -97.0945, "capacity": 80000, "elevation_ft":  600, "dome": True},
    "DEN": {"name": "Empower Field at Mile High","city": "Denver, CO",          "lat": 39.7439, "lng": -105.0201, "capacity": 76125, "elevation_ft": 5280, "dome": False},
    "DET": {"name": "Ford Field",                "city": "Detroit, MI",         "lat": 42.3400, "lng":  -83.0456, "capacity": 65000, "elevation_ft":  600, "dome": True},
    "GB":  {"name": "Lambeau Field",             "city": "Green Bay, WI",       "lat": 44.5013, "lng":  -88.0622, "capacity": 81441, "elevation_ft":  640, "dome": False},
    "HOU": {"name": "NRG Stadium",               "city": "Houston, TX",         "lat": 29.6847, "lng":  -95.4107, "capacity": 72220, "elevation_ft":   80, "dome": True},
    "IND": {"name": "Lucas Oil Stadium",         "city": "Indianapolis, IN",    "lat": 39.7601, "lng":  -86.1639, "capacity": 67000, "elevation_ft":  715, "dome": True},
    "JAX": {"name": "EverBank Stadium",          "city": "Jacksonville, FL",    "lat": 30.3239, "lng":  -81.6373, "capacity": 67838, "elevation_ft":   20, "dome": False},
    "KC":  {"name": "Arrowhead Stadium",         "city": "Kansas City, MO",     "lat": 39.0489, "lng":  -94.4839, "capacity": 76416, "elevation_ft":  870, "dome": False},
    "LAC": {"name": "SoFi Stadium",              "city": "Inglewood, CA",       "lat": 33.9534, "lng": -118.3392, "capacity": 70240, "elevation_ft":  131, "dome": True},
    "LAR": {"name": "SoFi Stadium",              "city": "Inglewood, CA",       "lat": 33.9534, "lng": -118.3392, "capacity": 70240, "elevation_ft":  131, "dome": True},
    "LV":  {"name": "Allegiant Stadium",         "city": "Las Vegas, NV",       "lat": 36.0908, "lng": -115.1830, "capacity": 65000, "elevation_ft": 2030, "dome": True},
    "MIA": {"name": "Hard Rock Stadium",         "city": "Miami Gardens, FL",   "lat": 25.9580, "lng":  -80.2389, "capacity": 65326, "elevation_ft":    8, "dome": False},
    "MIN": {"name": "U.S. Bank Stadium",         "city": "Minneapolis, MN",     "lat": 44.9738, "lng":  -93.2581, "capacity": 66860, "elevation_ft":  830, "dome": True},
    "NE":  {"name": "Gillette Stadium",          "city": "Foxborough, MA",      "lat": 42.0909, "lng":  -71.2643, "capacity": 65878, "elevation_ft":  200, "dome": False},
    "NO":  {"name": "Caesars Superdome",         "city": "New Orleans, LA",     "lat": 29.9509, "lng":  -90.0815, "capacity": 73208, "elevation_ft":    3, "dome": True},
    "NYG": {"name": "MetLife Stadium",           "city": "East Rutherford, NJ", "lat": 40.8135, "lng":  -74.0745, "capacity": 82500, "elevation_ft":    7, "dome": False},
    "NYJ": {"name": "MetLife Stadium",           "city": "East Rutherford, NJ", "lat": 40.8135, "lng":  -74.0745, "capacity": 82500, "elevation_ft":    7, "dome": False},
    "PHI": {"name": "Lincoln Financial Field",   "city": "Philadelphia, PA",    "lat": 39.9008, "lng":  -75.1675, "capacity": 69596, "elevation_ft":   39, "dome": False},
    "PIT": {"name": "Acrisure Stadium",          "city": "Pittsburgh, PA",      "lat": 40.4468, "lng":  -80.0158, "capacity": 68400, "elevation_ft":  730, "dome": False},
    "SEA": {"name": "Lumen Field",               "city": "Seattle, WA",         "lat": 47.5952, "lng": -122.3316, "capacity": 68740, "elevation_ft":   17, "dome": False},
    "SF":  {"name": "Levi's Stadium",            "city": "Santa Clara, CA",     "lat": 37.4030, "lng": -121.9697, "capacity": 68500, "elevation_ft":   16, "dome": False},
    "TB":  {"name": "Raymond James Stadium",     "city": "Tampa, FL",           "lat": 27.9759, "lng":  -82.5033, "capacity": 69218, "elevation_ft":   48, "dome": False},
    "TEN": {"name": "Nissan Stadium",            "city": "Nashville, TN",       "lat": 36.1665, "lng":  -86.7713, "capacity": 69143, "elevation_ft":  385, "dome": False},
    "WAS": {"name": "Northwest Stadium",         "city": "Landover, MD",        "lat": 38.9077, "lng":  -76.8645, "capacity": 67617, "elevation_ft":  214, "dome": False},
}


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_processed = PROCESSED_DIR / "stadium_meta.json"
    out_processed.write_text(json.dumps(STADIUM_META, indent=2))
    print(f"[stadium_meta] wrote {len(STADIUM_META)} teams -> {out_processed}")

    if PUBLIC_DIR.exists():
        out_public = PUBLIC_DIR / "stadium_meta.json"
        out_public.write_text(json.dumps(STADIUM_META, indent=2))
        print(f"[stadium_meta] mirrored -> {out_public}")


if __name__ == "__main__":
    main()
