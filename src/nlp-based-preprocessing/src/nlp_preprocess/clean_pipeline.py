import yaml, pandas as pd
from .ingest import read_any
from .schema_matcher import load_colmap, map_columns
from .normalizer import tr_norm, apply_alias

def run_clean(inp_path: str, out_path: str,
              colmap_path: str, alias_path: str, pipe_cfg_path: str):
    colmap = load_colmap(colmap_path)
    with open(alias_path, "r", encoding="utf-8") as f:
        aliases = (yaml.safe_load(f) or {}).get("aliases", {})
    with open(pipe_cfg_path, "r", encoding="utf-8") as f:
        pcfg = yaml.safe_load(f) or {}
    keep = pcfg.get("keep_columns", ["il","ilce","mahalle"])

    df = read_any(inp_path)
    df = map_columns(df, colmap=colmap, keep=keep)

    for k in ["il","ilce","mahalle"]:
        if k in df.columns:
            df[k+"_norm"] = df[k].map(tr_norm).map(lambda v: apply_alias(v, aliases))

    if out_path.lower().endswith(".csv"):
        df.to_csv(out_path, index=False)
    else:
        df.to_csv(out_path, index=False)
    return df
