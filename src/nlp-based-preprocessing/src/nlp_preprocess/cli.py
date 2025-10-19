import argparse
from pathlib import Path
import pandas as pd
from .clean_pipeline import run_clean
from .db import to_staging_csv

def main():
    parser = argparse.ArgumentParser("nlp-preprocess")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("clean", help="Dosyayı temizle/standartlaştır")
    p1.add_argument("--in", dest="inp", required=True)
    p1.add_argument("--out", dest="outp", required=True)
    p1.add_argument("--colmap", default="configs/colmap.yaml")
    p1.add_argument("--alias", default="configs/alias.yaml")
    p1.add_argument("--cfg", default="configs/pipeline.yaml")

    p2 = sub.add_parser("load-db", help="Temiz CSV'yi staging tabloya yükle")
    p2.add_argument("--in", dest="inp", required=True)
    p2.add_argument("--staging-table", required=True)  # örn: staging.yeni_mahalle_raw

    args = parser.parse_args()

    if args.cmd == "clean":
        Path(args.outp).parent.mkdir(parents=True, exist_ok=True)
        run_clean(args.inp, args.outp, args.colmap, args.alias, args.cfg)
        print(f"[OK] Temiz çıktı → {args.outp}")

    elif args.cmd == "load-db":
        df = pd.read_csv(args.inp)
        to_staging_csv(df, args.staging_table)
        print(f"[OK] Yüklendi → {args.staging_table}")

if __name__ == "__main__":
    main()
