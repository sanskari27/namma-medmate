"""Builds src/lib/pincodes.json (Bengaluru pincode -> post office localities) from scripts/pincodes-raw.json.
pincodes-raw.json was fetched on 2026-10-04 from India Post's public lookup (api.postalpincode.in) for 560001-560120,
560300 and the 561xxx/562xxx outskirts used by the area pages. Run: python3 scripts/build-pincodes.py"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
raw = json.loads((root / "scripts/pincodes-raw.json").read_text())

# Keep Bengaluru Urban, plus the outskirts that appear on the area pages.
OUTSKIRTS = {"560088", "560089", "560107", "561203", "562106", "562107", "562109", "562110", "562114", "562123", "562125", "562130", "562149", "562157", "562162", "562164"}
SKIP = {"560300"}  # airport only, no homes
FIX = {"Jayangar": "Jayanagar", "Bnagalore": "Bangalore", "Governmemnt": "Government", "Viswavidalaya": "Vishwavidyalaya", "Chandra Lay Out": "Chandra Layout", "Nandinilayout": "Nandini Layout", "Vasanthnagar": "Vasanth Nagar", "Tyagrajnagar": "Thyagarajanagar", "Padmanabhnagar": "Padmanabhanagar", "Fraser Town": "Frazer Town"}

def clean(name: str) -> str:
    n = re.sub(r"\s*\((Bangalore|Kolar)\)\s*", " ", name).strip()
    n = re.sub(r"\s+S\.?O\.?$", "", n).strip()
    for a, b in FIX.items():
        n = n.replace(a, b)
    if n.isupper():
        n = n.title()
    return re.sub(r"\s+", " ", n)

out = {}
for code, offices in sorted(raw.items()):
    if code in SKIP:
        continue
    districts = {o["district"] for o in offices}
    if "Bangalore" not in districts and code not in OUTSKIRTS:
        continue
    names = []
    for o in offices:
        n = clean(o["name"])
        if n and n not in names and not re.search(r"Dist Offices|Corporation Building|Sub Foreign Post|Legislators Home|CMM Court", n):
            names.append(n)
    out[code] = names
(root / "src/lib/pincodes.json").write_text(json.dumps(out, ensure_ascii=False, indent=0))
print(len(out), "pincodes")
