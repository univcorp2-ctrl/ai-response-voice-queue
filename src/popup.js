const queueCount = document.querySelector("#queueCount");
const speakingState = document.querySelector("#speakingState");
const enabled = document.querySelector("#enabled");

async function refresh() {
  const status = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
  queueCount.textContent = String(status.queueLength ?? 0);
  speakingState.textContent = status.speaking ? "読み上げ中" : status.settings?.enabled ? "待機中" : "一時停止";
  enabled.checked = Boolean(status.settings?.enabled);
}

enabled.addEventListener("change", async () => {
  await chrome.runtime.sendMessage({ type: "SET_ENABLED", enabled: enabled.checked });
  await refresh();
});

document.querySelector("#readNext").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "READ_NEXT" });
  window.close();
});

document.querySelector("#stop").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "STOP_READING" });
  await refresh();
});

document.querySelector("#clear").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_QUEUE" });
  await refresh();
});

document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());
void refresh();
setInterval(refresh, 1200);
