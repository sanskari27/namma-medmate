// Optional: refresh the medicine data and pack photos from the customer app's source folder.
// The website already contains its own copy (src/lib/*.json, public/products), so this is only needed
// when the app's catalogue changes. Usage:
//   node scripts/sync-from-app.mjs /path/to/MedMate-D2C-App
// (or set MEDMATE_APP_DIR). Default: the MedMate-D2C-App folder next to this one.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = resolve(process.argv[2] || process.env.MEDMATE_APP_DIR || join(root, "..", "MedMate-D2C-App"));
if (!existsSync(join(app, "src/lib/catalogue.json"))) {
  console.error(`No customer app found at ${app}. Pass its folder: node scripts/sync-from-app.mjs /path/to/MedMate-D2C-App`);
  process.exit(1);
}

for (const f of ["catalogue.json", "details.json", "compliance.json"]) copyFileSync(join(app, "src/lib", f), join(root, "src/lib", f));

const products = JSON.parse(readFileSync(join(root, "src/lib/catalogue.json"), "utf8"));
const out = join(root, "public/products");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// The source sheet uses one stock "Image not available" picture for several products.
// Any photo shared by 3+ products is treated as that placeholder: those products get the drawn pack instead.
const hash = (f) => createHash("md5").update(readFileSync(f)).digest("hex");
const hashes = new Map();
for (const p of products) {
  const src = p.img && join(app, "public", p.img);
  if (src && existsSync(src)) hashes.set(p.id, hash(src));
}
const uses = {};
for (const h of hashes.values()) uses[h] = (uses[h] ?? 0) + 1;

let n = 0, dropped = 0;
for (const p of products) {
  if (!p.img) continue;
  const h = hashes.get(p.id);
  if (!h || uses[h] >= 3) { delete p.img; dropped++; continue; }
  copyFileSync(join(app, "public", p.img), join(out, p.img.split("/").pop()));
  n++;
}
writeFileSync(join(root, "src/lib/catalogue.json"), JSON.stringify(products, null, 1) + "\n");
console.log(`Copied ${products.length} products and ${n} photos; ${dropped} placeholder or missing photos dropped`);
