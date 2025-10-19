import os
import pandas as pd
from sqlalchemy import create_engine

DATABASE_URL = os.getenv("DATABASE_URL")

def to_staging_csv(df: pd.DataFrame, staging_table: str):
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set")
    engine = create_engine(DATABASE_URL)
    schema, table = (staging_table.split(".") + ["public"])[:2][0], staging_table.split(".")[-1]
    with engine.begin() as conn:
        df.to_sql(table, con=conn, schema=schema, if_exists="append", index=False)
