import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const output = new URL("../dist/", import.meta.url);

test("build emits a portable GitHub Pages entry point", async () => {
  const html = await readFile(new URL("index.html", output), "utf8");
  assert.match(html, /<title>Orbit Pong<\/title>/);
  assert.match(html, /(?:src|href)="\.\/assets\//);
  assert.doesNotMatch(html, /\/_next\//);
  await stat(new URL("favicon.svg", output));
});
