const WELLBY_URL = "http://localhost:3000";

function buildWellbyUrl(moodScore, stressLevel, intent, updatedAt) {
  const url = new URL(WELLBY_URL);

  if (Number.isFinite(moodScore)) {
    url.searchParams.set("extensionMoodScore", String(moodScore));
  }

  if (Number.isFinite(stressLevel)) {
    url.searchParams.set("extensionStressLevel", String(stressLevel));
  }

  if (intent) {
    url.searchParams.set("extensionIntent", intent);
  }

  if (Number.isFinite(updatedAt)) {
    url.searchParams.set("extensionMoodUpdatedAt", String(updatedAt));
  }

  return url.toString();
}

async function getWellbyTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => tab.url && tab.url.startsWith(WELLBY_URL));
}

async function syncCheckInToWellby(moodScore, stressLevel, intent) {
  if (!Number.isFinite(moodScore) && !Number.isFinite(stressLevel)) {
    return;
  }

  const updatedAt = Date.now();
  await chrome.storage.local.set({
    wellbyExtensionMoodScore: moodScore,
    wellbyExtensionStressLevel: stressLevel,
    wellbyExtensionIntent: intent ?? "open",
    wellbyExtensionUpdatedAt: updatedAt
  });

  const existingWellbyTabs = await getWellbyTabs();

  await Promise.all(
    existingWellbyTabs.map((tab) =>
      tab.id
        ? chrome.tabs.sendMessage(tab.id, {
            type: "SET_WELLBY_CHECKIN",
            moodScore,
            stressLevel,
            intent: intent ?? "open",
            updatedAt
          }).catch(() => null)
        : Promise.resolve(null)
    )
  );

  return updatedAt;
}

async function focusOrOpenWellby({ moodScore, stressLevel, intent } = {}) {
  let updatedAt = null;
  if (Number.isFinite(moodScore) || Number.isFinite(stressLevel)) {
    updatedAt = await syncCheckInToWellby(moodScore, stressLevel, intent);
  }

  const existingWellbyTabs = await getWellbyTabs();
  const existingWellbyTab = existingWellbyTabs[0];

  if (existingWellbyTab?.id) {
    await chrome.tabs.update(existingWellbyTab.id, { active: true });
    if (existingWellbyTab.windowId) {
      await chrome.windows.update(existingWellbyTab.windowId, { focused: true });
    }
    return;
  }

  await chrome.tabs.create({ url: buildWellbyUrl(moodScore, stressLevel, intent, updatedAt), active: true });
}

chrome.action.onClicked.addListener(async () => {
  await focusOrOpenWellby();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SYNC_WELLBY_CHECKIN") {
    syncCheckInToWellby(Number(message.moodScore), Number(message.stressLevel), message.intent)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  if (message?.type === "OPEN_WELLBY") {
    focusOrOpenWellby({
      moodScore: Number(message.moodScore),
      stressLevel: Number(message.stressLevel),
      intent: message.intent
    })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));

    return true;
  }

  return false;
});
