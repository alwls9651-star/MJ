import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const handlerUrl = new URL(
    "../.netlify/functions-internal/server/main.mjs",
    import.meta.url,
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: handler } = await import(handlerUrl.href);
  return handler(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
  );
}

test("server-renders the student verification page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>방과후 신청<\/title>/);
  assert.match(html, /학생 본인 확인/);
  assert.match(html, /수강신청 시작/);
  assert.match(html, /1인 1과목만 신청 가능/);
  assert.match(html, /교직원 로그인/);
});

test("student verification form keeps required identity and password fields", async () => {
  const html = await (await render()).text();
  for (const name of ["grade", "department", "studentNumber", "name", "password"]) {
    assert.match(html, new RegExp(`name=["']${name}["']`));
  }
  assert.match(html, /type=["']password["']/);
});
