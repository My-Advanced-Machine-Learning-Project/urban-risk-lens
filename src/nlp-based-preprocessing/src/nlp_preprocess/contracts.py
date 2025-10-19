from pydantic import BaseModel
from typing import Optional

class RowIn(BaseModel):
    il: Optional[str] = None
    ilce: Optional[str] = None
    mahalle: Optional[str] = None

class RowOut(BaseModel):
    il: Optional[str] = None
    il_norm: Optional[str] = None
    ilce: Optional[str] = None
    ilce_norm: Optional[str] = None
    mahalle: Optional[str] = None
    mahalle_norm: Optional[str] = None
