import test from "node:test";
import assert from "node:assert/strict";
import { fingerprint, normalizeText, pickNext, scoreItem, toSpeechText } from "../src/core/queue.js";

test("normalizeText collapses whitespace", () => {
  assert.equal(normalizeText("  hello   world\n\n\nnext "), "hello world\n\nnext");
});

test("fingerprint is stable for equivalent whitespace", () => {
  assert.equal(fingerprint("Hello   world"), fingerprint("Hello world"));
  assert.notEqual(fingerprint("Hello world"), fingerprint("Different"));
});

test("toSpeechText removes markdown and code blocks", () => {
  const result = toSpeechText("# Title\n```js\nconsole.log('x')\n```\n[guide](https://example.com)", 500);
  assert.match(result, /Title/);
  assert.match(result, /コードブロック/);
  assert.match(result, /guide/);
  assert.doesNotMatch(result, /console\.log/);
});

test("toSpeechText truncates long answers", () => {
  const result = toSpeechText("あ".repeat(500), 120);
  assert.ok(result.length <= 130);
  assert.match(result, /画面で確認/);
});

test("active tab receives the highest priority", () => {
  const now = 10_000;
  const queue = [
    { id: "old", tabId: 1, createdAt: 1_000 },
    { id: "active", tabId: 2, createdAt: 9_000 },
  ];
  assert.equal(pickNext(queue, { activeTabId: 2, now }).item.id, "active");
  assert.ok(scoreItem(queue[1], { activeTabId: 2, now }) > scoreItem(queue[0], { activeTabId: 2, now }));
});

test("oldest item wins when scores tie", () => {
  const queue = [
    { id: "first", tabId: 1, createdAt: 1_000 },
    { id: "second", tabId: 2, createdAt: 2_000 },
  ];
  assert.equal(pickNext(queue, { now: 3_000 }).item.id, "first");
});
