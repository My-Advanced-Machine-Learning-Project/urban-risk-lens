import re, unicodedata
from typing import Optional, Dict

def tr_norm(s: Optional[str]) -> str:
    if not isinstance(s, str): return ""
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    s = re.sub(r'[^\w\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def apply_alias(norm_value: str, aliases: Dict[str, str]) -> str:
    return aliases.get(norm_value, norm_value)
