"""Create an installable Decky ZIP from an explicit allowlist."""
import hashlib
import json
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
version = json.loads((root / "package.json").read_text())["version"]
files = ["package.json", "package-lock.json", "plugin.json", "main.py", "py_modules/legion_catalog.py", "dist/index.js", "dist/index.js.map", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "docs/TESTING.md", "docs/APPROACH.md", "rollup.config.js", "tsconfig.json", "scripts/package.py"]
files += [str(path.relative_to(root)).replace("\\", "/") for folder in ("src", "third_party") for path in sorted((root / folder).rglob("*")) if path.is_file()]
files += ["docs/VERIFICATION.md"]
for name in files:
    if not (root / name).is_file():
        raise SystemExit(f"Missing {name}; run the build and finish documentation first.")
output = root / "release"
output.mkdir(exist_ok=True)
archive = output / f"legion-library-{version}.zip"
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for name in files:
        bundle.write(root / name, f"legion-library/{name}")
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
print(f"Created {archive.name} ({archive.stat().st_size:,} bytes), SHA-256 {digest}")
