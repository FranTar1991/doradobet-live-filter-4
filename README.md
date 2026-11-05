# DoradoBet Live Match Filter

A Chrome extension that filters live football match cards on DoradoBet by elapsed match time.

## Features
- One threshold slider for the first half (0–45 minutes).
- One threshold slider for the second half (45–90 minutes).
- A match remains visible when its elapsed time is at or beyond the selected threshold for its half.
- The two enabled half-filters use OR logic.
- Settings save automatically and filtering updates without an Apply button.
- Supports DoradoBet's open Shadow DOM and watches for dynamically updated match cards.
- Includes displayed stoppage time in the elapsed clock.
- Hides cards marked “No iniciado” or “Descanso”.
- Hides a league section when it has no visible qualifying match cards.

## Install
1. Extract the ZIP file.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `doradobet-live-filter` folder.
6. Open or refresh DoradoBet's sports page.

## Notes
- First-half threshold example: 40 means show first-half matches at 40:00 or later, including stoppage time.
- Second-half threshold example: 80 means show second-half matches at 80:00 or later, including stoppage time.
- Disable an individual half to ignore its threshold. The main switch disables time filtering, but the “No iniciado” and “Descanso” exclusions remain active.
