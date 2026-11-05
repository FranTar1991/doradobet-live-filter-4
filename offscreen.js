chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "DORADO_OFFSCREEN_PLAY_SOUND") return;

  const audio = document.getElementById("notificationSound");

  if (!audio) {
    sendResponse({
      success: false,
      error: "Audio element not found."
    });
    return;
  }

  audio.currentTime = 0;

  audio.play()
    .then(() => sendResponse({ success: true }))
    .catch(error => {
      console.error("Audio playback error:", error);

      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});