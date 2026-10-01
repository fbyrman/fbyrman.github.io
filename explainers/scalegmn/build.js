#!/usr/bin/env node
// Assembles src/ into the single self-contained page the website serves at
// /explainers/scalegmn.html (written to ../../public/explainers/).
//
//   node build.js          build once
//   node build.js --watch  rebuild whenever anything in src/ changes
//
// The template (src/template.html) contains lines of the form
//     <!-- @include path -->
// where `path` is relative to src/. A path may contain a `*` glob, in which
// case every matching file is inlined in sorted filename order (that is how
// sections/*.html are numbered). Included content is re-indented to match the
// indentation of the directive line, so the output stays readable.

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");
const TEMPLATE = path.join(SRC, "template.html");
const OUT = path.join(__dirname, "..", "..", "public", "explainers", "scalegmn.html");

const INCLUDE_RE = /^([ \t]*)<!--\s*@include\s+(\S+)\s*-->[ \t]*$/;

function resolveIncludes(spec) {
  if (!spec.includes("*")) return [path.join(SRC, spec)];
  const dir = path.join(SRC, path.dirname(spec));
  const re = new RegExp("^" + path.basename(spec).split("*").map(escapeRe).join(".*") + "$");
  return fs.readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => path.join(dir, f));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function indent(text, prefix) {
  return text
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => (line.trim() ? prefix + line : ""))
    .join("\n");
}

function build() {
  const template = fs.readFileSync(TEMPLATE, "utf8");
  const out = template.split("\n").map((line) => {
    const m = line.match(INCLUDE_RE);
    if (!m) return line;
    const [, prefix, spec] = m;
    const files = resolveIncludes(spec);
    if (files.length === 0) throw new Error(`@include matched nothing: ${spec}`);
    return files.map((f) => indent(fs.readFileSync(f, "utf8"), prefix)).join("\n\n");
  });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n"));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`built ${path.basename(OUT)} (${kb} KB) ${new Date().toLocaleTimeString()}`);
}

build();

if (process.argv.includes("--watch")) {
  let timer;
  fs.watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { build(); } catch (e) { console.error(e.message); }
    }, 50);
  });
  console.log("watching src/ …");
}
