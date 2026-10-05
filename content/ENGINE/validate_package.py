from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
for p in ROOT.rglob("*.json"):
    try:
        json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"Invalid JSON {p.relative_to(ROOT)}: {e}")
cards=json.loads((ROOT/"CARDS/domain_cards.json").read_text(encoding="utf-8"))
for name, deck in cards.items():
    if len(deck)!=21:
        errors.append(f"{name} deck has {len(deck)} cards, expected 21")
    lvls={i:0 for i in range(1,11)}
    for c in deck:
        lvls[c["level"]]+=1
    if lvls[1]!=3 or any(lvls[i]!=2 for i in range(2,11)):
        errors.append(f"{name} level distribution wrong: {lvls}")
for p in ROOT.rglob("*.md"):
    txt=p.read_text(encoding="utf-8")[:1200]
    if "Visibility:" not in txt and p.name not in {"README.md","MANIFEST.txt","SOURCES.md"}:
        errors.append(f"Missing visibility marker: {p.relative_to(ROOT)}")
if errors:
    print("VALIDATION FAILED")
    print("\n".join(errors))
    sys.exit(1)
print("VALIDATION PASSED")
print(f"Domain cards: {sum(len(v) for v in cards.values())}")
print(f"Markdown files: {len(list(ROOT.rglob('*.md')))}")
print(f"JSON files: {len(list(ROOT.rglob('*.json')))}")
