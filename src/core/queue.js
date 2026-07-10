export function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function fingerprint(value) {
  const text = normalizeText(value).toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function toSpeechText(value, maxChars = 1400) {
  let text = normalizeText(value)
    .replace(/```[\s\S]*?```/g, " コードブロックがあります。 ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " 画像があります。 ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " リンク ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > maxChars) {
    text = `${text.slice(0, Math.max(0, maxChars - 18)).trim()}。続きは画面で確認してください。`;
  }
  return text;
}

export function scoreItem(item, context = {}) {
  const now = context.now ?? Date.now();
  const ageSeconds = Math.max(0, now - item.createdAt) / 1000;
  let score = Math.min(ageSeconds, 600) * 0.15;
  if (item.tabId && item.tabId === context.activeTabId) score += 100;
  if (item.tabId && item.tabId === context.lastFocusedSourceTabId) score += 35;
  if (item.priority === "high") score += 50;
  return score;
}

export function pickNext(queue, context = {}) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  return queue
    .map((item, index) => ({ item, index, score: scoreItem(item, context) }))
    .sort((left, right) => right.score - left.score || left.item.createdAt - right.item.createdAt)[0];
}
