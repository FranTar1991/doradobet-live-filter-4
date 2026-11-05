chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "DORADO_PLAY_SOUND") return;

  playNotificationSound()
    .then(() => sendResponse({ success: true }))
    .catch(error => {
      console.error("Background sound error:", error);
      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});

async function playNotificationSound() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"]
  });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play notification sounds for qualifying football matches."
    });
  }

  const response = await chrome.runtime.sendMessage({
    type: "DORADO_OFFSCREEN_PLAY_SOUND"
  });

  if (!response?.success) {
    throw new Error(response?.error || "Offscreen document did not confirm playback.");
  }
}