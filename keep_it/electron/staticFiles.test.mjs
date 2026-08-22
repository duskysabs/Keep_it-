import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { resolveStaticFile } from "./staticFiles.mjs";

test("maps local app routes and assets without allowing directory traversal", (context) => {
  const staticDirectory = mkdtempSync(join(tmpdir(), "keep-it-static-"));
  context.after(() => rmSync(staticDirectory, { recursive: true, force: true }));

  mkdirSync(join(staticDirectory, "tasks"));
  mkdirSync(join(staticDirectory, "_next", "static"), { recursive: true });
  writeFileSync(join(staticDirectory, "index.html"), "home");
  writeFileSync(join(staticDirectory, "tasks", "index.html"), "tasks");
  writeFileSync(join(staticDirectory, "_next", "static", "app.js"), "app");
  writeFileSync(join(staticDirectory, "404.html"), "missing");

  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/", staticDirectory }), join(staticDirectory, "index.html"));
  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/tasks", staticDirectory }), join(staticDirectory, "tasks", "index.html"));
  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/tasks/", staticDirectory }), join(staticDirectory, "tasks", "index.html"));
  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/_next/static/app.js", staticDirectory }), join(staticDirectory, "_next", "static", "app.js"));
  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/missing", staticDirectory }), join(staticDirectory, "404.html"));
  assert.equal(resolveStaticFile({ requestUrl: "keep-it://app/%2e%2e%5cprivate.txt", staticDirectory }), null);
});
