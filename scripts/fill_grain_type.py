#!/usr/bin/env python3
import sys
import sqlite3
import re
import json
from urllib.parse import unquote

DB_PATH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/mandi_app.db'

def parse_from_bos_description(desc):
    try:
        payload_str = unquote(desc.replace('BillOfSupplyItems::', '', 1))
        parsed = json.loads(payload_str)
        # payload may be array or { items: [] }
        items = parsed if isinstance(parsed, list) else parsed.get('items', [])
        if items and isinstance(items, list) and 'grainType' in items[0]:
            return items[0]['grainType']
    except Exception as e:
        return None
    return None

def parse_from_simple_description(desc):
    # Match patterns like "Wheat: 9 bags × 50kg @ ₹1910/qt" or ": 9 bags × 50kg @ ₹1910/qt"
    m = re.search(r'(?:([^:]+):)?\s*(\d+)\s*bags\s*(?:x|×)\s*([\d.]+)kg', desc, flags=re.IGNORECASE)
    if m:
        grain = m.group(1).strip() if m.group(1) else None
        return grain
    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Backup inside /tmp
    backup_path = DB_PATH + '.bak'
    with open(DB_PATH, 'rb') as fsrc, open(backup_path, 'wb') as fdst:
        fdst.write(fsrc.read())
    print(f'Backup created: {backup_path}')

    # Find rows where grain_type is empty
    cursor.execute("SELECT id, description FROM sell_transactions WHERE grain_type IS NULL OR trim(grain_type) = ''")
    rows = cursor.fetchall()
    print(f'Found {len(rows)} sell rows with empty grain_type')

    updates = []
    for r in rows:
        id_, desc = r
        if not desc:
            continue
        grain = None
        if desc.startswith('BillOfSupplyItems::'):
            grain = parse_from_bos_description(desc)
        if not grain:
            grain = parse_from_simple_description(desc)
        if grain:
            updates.append((grain, id_))

    print(f'Parsed grainType for {len(updates)} rows; applying updates...')

    for grain, id_ in updates:
        cursor.execute('UPDATE sell_transactions SET grain_type = ? WHERE id = ?', (grain, id_))

    conn.commit()
    print('Updates applied. Committed to DB.')

    # If some rows couldn't be parsed, attempt inference by matching rate/quantity to other transactions
    cursor.execute("SELECT id, rate_per_quintal, quantity FROM sell_transactions WHERE grain_type IS NULL OR trim(grain_type) = ''")
    remaining = cursor.fetchall()
    inferred = []
    for r in remaining:
        id_, rate, qty = r
        # Try to find candidates with same rate and similar quantity that have grain_type
        cursor.execute("SELECT grain_type, COUNT(*) as cnt FROM sell_transactions WHERE grain_type IS NOT NULL AND abs(rate_per_quintal - ?) < 0.001 GROUP BY grain_type ORDER BY cnt DESC LIMIT 1", (rate,))
        cand = cursor.fetchone()
        if cand:
            inferred_grain = cand[0]
            cursor.execute('UPDATE sell_transactions SET grain_type = ? WHERE id = ?', (inferred_grain, id_))
            inferred.append((id_, inferred_grain))

    conn.commit()
    print(f'Inferred grainType for {len(inferred)} rows using rate-matching.')

    # Show updated rows (both initial updates and inferred)
    all_ids = [u[1] for u in updates] + [i[0] for i in inferred]
    if all_ids:
        cursor.execute("SELECT id, grain_type, description FROM sell_transactions WHERE id IN ({})".format(','.join(['?']*len(all_ids))), all_ids)
        updated_rows = cursor.fetchall()
        for ur in updated_rows:
            print(ur)

    conn.close()
    print('Done.')

if __name__ == '__main__':
    main()
