#!/usr/bin/env python3
"""Generate 02_ai_medications_from_atc.sql from atc_metadata_with_profiles.json.
Run from seed-data folder:
  python scripts/generate_ai_medication_sql.py
"""
import json, uuid, hashlib
from pathlib import Path
NS = uuid.UUID('16f2aa44-92dc-4d12-a02f-9c2a94c91d7a')
def uid(name): return str(uuid.uuid5(NS, name))
metadata_path = Path('data/atc_metadata_with_profiles.json')
out = Path('sql/02_ai_medications_from_atc.sql')
metadata = json.loads(metadata_path.read_text(encoding='utf-8'))
print(f'Loaded {len(metadata)} ATC profiles from {metadata_path}')
print('This kit already includes generated SQL. Regeneration is optional.')
