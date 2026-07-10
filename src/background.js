import { fingerprint, pickNext, toSpeechText } from "./core/queue.js";

const DEFAULTS = {
  enabled: true,
  rate: 1.05,
  pitch: 1,
  volume: 1,
  voiceName: "",
  maxChars: 1400,
  inactivityDelayMs: 4500,
  minGapMs: 900,
  pauseForOtherAudio: true,
  announceSource: true,
};

let processing = false;
let wakeTimer = null;

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(["settings", "queue", "recentHashes"]);
  await chrome.storage.local.set({
    settings: { ...DEFAULTS, ...(current.settings ?? {}) },
    queue: current.queue ?? [],
    recentHashes: current.recentHashes ?? [],
  });
  await updateBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "ENQUEUE_RESPONSE":
      return enqueueResponse(message.payload, sender.tab);
    case "USER_ACTIVITY":
      await chrome.storage.local.set({
        lastUserActivity: Date.now(),
        lastFocusedSourceTabId: sender.tab?.id ?? null,
      });
      return { ok: true };
    case "GET_STATUS":
      return getStatus();
    case "SET_ENABLED": {
      const { settings = DEFAULTS } = await chrome.storage.local.get("settings");
      await chrome.storage.local.set({ settings: { ...DEFAULTS, ...settings, enabled: Boolean(message.enabled) } });
      if (message.enabled) scheduleWake(0);
      return getStatus();
    }
    case "READ_NEXT":
      scheduleWake(0, true);
      return { ok: true };
    case "STOP_READING":
      chrome.tts.stop();
      processing = false;
      return { ok: true };
    case "CLEAR_QUEUE":
      await chrome.storage.local.set({ queue: [] });
      await updateBadge();
      return { ok: true };
    default:
      return { ok: false, error: "unknown_message" };
  }
}

async function enqueueResponse(payload, tab) {
  if (!payload?.text || payload.text.trim().length < 24) return { ok: false, ignored: "too_short" };

  const hash = fingerprint(payload.text);
  const state = await chrome.storage.local.get(["queue", "recentHashes"]);
  const queue = state.queue ?? [];
  const recentHashes = state.recentHashes ?? [];
  if (recentHashes.includes(hash) || queue.some((item) => item.hash === hash)) {
    return { ok: true, duplicate: true };
  }

  queue.push({
    id: `${Date.now()}-${hash}`,
    hash,
    text: payload.text,
    platform: payload.platform ?? "AI",
    title: payload.title ?? tab?.title ?? "AI response",
    url: payload.url ?? tab?.url ?? "",
    tabId: tab?.id ?? null,
    createdAt: Date.now(),
    priority: payload.priority ?? "normal",
  });

  await chrome.storage.local.set({ queue: queue.slice(-100) });
  await updateBadge();
  scheduleWake(300);
  return { ok: true, queued: true };
}

async function getStatus() {
  const state = await chrome.storage.local.get(["queue", "settings"]);
  const speaking = await isSpeaking();
  return {
    ok: true,
    queueLength: (state.queue ?? []).length,
    settings: { ...DEFAULTS, ...(state.settings ?? {}) },
    speaking,
  };
}

function scheduleWake(delayMs, force = false) {
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = setTimeout(() => {
    wakeTimer = null;
    void processQueue(force);
  }, Math.max(0, delayMs));
}

async function processQueue(force = false) {
  if (processing) return;

  const state = await chrome.storage.local.get([
    "queue",
    "settings",
    "lastUserActivity",
    "lastFocusedSourceTabId",
    "recentHashes",
  ]);
  const settings = { ...DEFAULTS, ...(state.settings ?? {}) };
  const queue = state.queue ?? [];
  if (!settings.enabled || queue.length === 0) {
    await updateBadge();
    return;
  }

  if (!force) {
    const idleFor = Date.now() - (state.lastUserActivity ?? 0);
    if (idleFor < settings.inactivityDelayMs) {
      scheduleWake(settings.inactivityDelayMs - idleFor + 100);
      return;
    }

    if (settings.pauseForOtherAudio) {
      const audibleTabs = await chrome.tabs.query({ audible: true });
      if (audibleTabs.length > 0) {
        scheduleWake(5000);
        return;
      }
    }

    if (await isSpeaking()) {
      scheduleWake(1500);
      return;
    }
  }

  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const picked = pickNext(queue, {
    activeTabId: activeTab?.id ?? null,
    lastFocusedSourceTabId: state.lastFocusedSourceTabId ?? null,
  });
  if (!picked) return;

  const item = picked.item;
  queue.splice(picked.index, 1);
  const recentHashes = [...(state.recentHashes ?? []), item.hash].slice(-250);
  await chrome.storage.local.set({ queue, recentHashes });
  await updateBadge();

  const body = toSpeechText(item.text, settings.maxChars);
  if (!body) {
    scheduleWake(0);
    return;
  }

  const speech = settings.announceSource ? `${item.platform} の回答です。${body}` : body;
  processing = true;
  try {
    await speak(speech, settings);
  } finally {
    processing = false;
    scheduleWake(settings.minGapMs);
  }
}

function speak(text, settings) {
  return new Promise((resolve) => {
    const options = {
      rate: Number(settings.rate),
      pitch: Number(settings.pitch),
      volume: Number(settings.volume),
      enqueue: false,
      onEvent(event) {
        if (["end", "interrupted", "cancelled", "error"].includes(event.type)) resolve();
      },
    };
    if (settings.voiceName) options.voiceName = settings.voiceName;
    chrome.tts.speak(text, options);
  });
}

function isSpeaking() {
  return new Promise((resolve) => chrome.tts.isSpeaking(resolve));
}

async function updateBadge() {
  const { queue = [] } = await chrome.storage.local.get("queue");
  const text = queue.length > 0 ? String(Math.min(queue.length, 99)) : "";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#238b64" });
}
