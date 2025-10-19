import pandas as pd
import geopandas as gpd
from pathlib import Path

def read_any(path: str):
    p = Path(path)
    suf = p.suffix.lower()
    if suf in [".xlsx", ".xls"]:
        return pd.read_excel(p)
    if suf == ".csv":
        return pd.read_csv(p)
    if suf in [".geojson", ".json", ".shp"]:
        g = gpd.read_file(p)
        return pd.DataFrame(g.drop(columns=[c for c in g.columns if c.lower()=="geometry" or c=="geometry"], errors="ignore"))
    # fallback
    return pd.read_csv(p)
