import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const roots = ["app", "components", "lib", "tests", "docs", "db"];
const extensions = new Set([".ts", ".tsx", ".mjs", ".css", ".md", ".sql"]);
const files = [];

function walk(path) {
  for (const name of readdirSync(path)) {
    const target = join(path, name);
    if (statSync(target).isDirectory()) walk(target);
    else if (extensions.has(extname(target))) files.push(target);
  }
}

for (const root of roots) walk(root);
const failures = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (/[^\S\r\n]+$/m.test(source)) failures.push(`${file}: trailing whitespace`);
  if (!source.endsWith("\n")) failures.push(`${file}: missing final newline`);
  if (/dangerouslySetInnerHTML/.test(source)) failures.push(`${file}: unsafe raw HTML rendering`);
  if (/public[\\/]payment-proofs|public[\\/]receipts/.test(source)) failures.push(`${file}: receipt storage must stay private`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`${process.argv[2] === "format" ? "Format" : "Lint"} checks passed for ${files.length} source files.`);
}
