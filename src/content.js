(() => {
  const platform = detectPlatform();
  const nodeState = new WeakMap();
  let scanTimer = null;
  let lastActivitySentAt = 0;

  const selectors = platform === "Claude"
    ? ["[data-testid='assistant-message']", ".font-claude-message", "[data-is-streaming]"]
    : ["[data-message-author-role='assistant']", "article[data-testid*='assistant']"];

  const observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  for (const eventName of ["keydown", "pointerdown", "wheel", "touchstart"]) {
    window.addEventListener(eventName, reportActivity, { passive: true, capture: true });
  }

  scheduleScan();

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 700);
  }

  function scan() {
    const candidates = new Set();
    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach((node) => candidates.add(node));
    }

    for (const node of candidates) {
      const text = extractText(node);
      if (text.length < 24 || looksLikeUserMessage(node)) continue;

      const previous = nodeState.get(node);
      if (previous?.text === text) continue;
      if (previous?.timer) clearTimeout(previous.timer);

      const timer = setTimeout(() => {
        const currentText = extractText(node);
        if (currentText !== text || isStreaming(node)) return;
        void chrome.runtime.sendMessage({
          type: "ENQUEUE_RESPONSE",
          payload: {
            text,
            platform,
            title: document.title,
            url: location.href,
          },
        }).catch(() => undefined);
      }, 1800);

      nodeState.set(node, { text, timer });
    }
  }

  function extractText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("button, nav, textarea, input, svg, style, script, [aria-hidden='true']").forEach((item) => item.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/Copy code/gi, "")
      .replace(/Good response|Bad response/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function looksLikeUserMessage(node) {
    return node.matches("[data-message-author-role='user']") || Boolean(node.closest("[data-message-author-role='user']"));
  }

  function isStreaming(node) {
    return node.getAttribute("aria-busy") === "true" || node.getAttribute("data-is-streaming") === "true";
  }

  function reportActivity() {
    const now = Date.now();
    if (now - lastActivitySentAt < 1500) return;
    lastActivitySentAt = now;
    void chrome.runtime.sendMessage({ type: "USER_ACTIVITY" }).catch(() => undefined);
  }

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes("claude.ai")) return "Claude";
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) return "ChatGPT";
    return "Codex / OpenAI";
  }
})();
