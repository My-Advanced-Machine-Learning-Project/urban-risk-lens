import yaml
from typing import Dict, List

def load_colmap(path: str) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        y = yaml.safe_load(f) or {}
    return (y.get("column_map") or {})

def map_columns(df, colmap: Dict[str, str], keep: List[str]):
    for c in list(df.columns):
        if c in colmap:
            df.rename(columns={c: colmap[c]}, inplace=True)
    present = [c for c in keep if c in df.columns]
    return df[present]
