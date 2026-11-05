(() => {
  const CARD_SELECTOR = '[class*="EventBoxContainerBase"]';
  const CLOCK_SELECTOR = '[class*="EventLiveTimerLabel"]';
  const INJURY_SELECTOR = '[class*="EventLiveTimerInjuryTime"]';
  const LIVE_SELECTOR = '[class*="LiveIndicatorContainer"]';
  const CHAMPIONSHIP_SELECTOR = '[class*="ChampionshipContainer"]';
  const HIDDEN_ATTR = "data-dorado-filter-hidden";
  const GROUP_HIDDEN_ATTR = "data-dorado-filter-group-hidden";
  const STATUS_SELECTOR = '[class*="EventLiveTimerValue"]';

  let settings = null;
  let scheduled = false;
  const observedRoots = new WeakSet();
const DEFAULTS = {
  enabled: true,
  firstEnabled: true,
  firstMin: 40,
  firstMax: 45,
  secondEnabled: true,
  secondMin: 80,
  secondMax: 90
};

  function collectRoots(startRoot = document, roots = []) {
    if (!startRoot || roots.includes(startRoot)) return roots;
    roots.push(startRoot);
    if (typeof startRoot.querySelectorAll !== "function") return roots;
    startRoot.querySelectorAll("*").forEach(element => {
      if (element.shadowRoot) collectRoots(element.shadowRoot, roots);
    });
    return roots;
  }

function parseClock(raw, injuryRaw = "") {
  const value = String(raw || "").trim();
  const injury = String(injuryRaw || "").trim();

  // Clock with seconds: 42:33
  let match = value.match(/^(\d{1,3}):([0-5]\d)$/);

  if (match) {
    return {
      minute: Number(match[1]),
      baseMinute: Number(match[1]),
      second: Number(match[2])
    };
  }

  // Clock without seconds: 3, 3', 41, 41'
  match = value.match(/^(\d{1,3})\s*['’′]?$/);

  if (match) {
    const baseMinute = Number(match[1]);
    const injuryMatch = injury.match(/^\+\s*(\d{1,2}):([0-5]\d)$/);

    if (injuryMatch) {
      return {
        minute: baseMinute + Number(injuryMatch[1]),
        baseMinute,
        second: Number(injuryMatch[2])
      };
    }

    return {
      minute: baseMinute,
      baseMinute,
      second: 0
    };
  }

  // Combined stoppage time: 90+2:45
  match = value.match(/^(\d{1,3})\s*\+\s*(\d{1,2}):([0-5]\d)$/);

  if (match) {
    return {
      minute: Number(match[1]) + Number(match[2]),
      baseMinute: Number(match[1]),
      second: Number(match[3])
    };
  }

  return null;
}

function cardHasExcludedStatus(card) {
  const statusElement = card.querySelector(STATUS_SELECTOR);

  if (!statusElement) return false;

  const status = statusElement.textContent.trim().toLowerCase();

  return status === "descanso" || status === "no iniciado";
}

function matchesFilter(card) {
  const clockElement = card.querySelector(CLOCK_SELECTOR);

  if (!clockElement) return false;

  const injuryElement = card.querySelector(INJURY_SELECTOR);

  const clock = parseClock(
    clockElement.textContent,
    injuryElement?.textContent || ""
  );

  if (!clock) return false;

  // Treat clocks with and without seconds consistently.
  const currentMinute = clock.minute;

  // Exclude extra time and anything beyond minute 90.
  if (currentMinute > 90) return false;

  // First half
  if (currentMinute <= 45) {
    return (
      settings.firstEnabled &&
      currentMinute >= settings.firstMin &&
      currentMinute <= settings.firstMax
    );
  }

  // Second half
  return (
    settings.secondEnabled &&
    currentMinute >= settings.secondMin &&
    currentMinute <= settings.secondMax
  );
}
  function setElementVisible(element, visible, hiddenAttr, originalAttr) {
    if (!element.hasAttribute(originalAttr)) {
      element.setAttribute(originalAttr, element.style.display || "");
    }
    if (visible) {
      element.style.display = element.getAttribute(originalAttr) || "";
      element.removeAttribute(hiddenAttr);
      element.removeAttribute(originalAttr);
    } else {
      element.style.display = "none";
      element.setAttribute(hiddenAttr, "true");
    }
  }


function apply() {
  scheduled = false;
  if (!settings) return;

  const roots = collectRoots();

  // Master switch OFF: restore everything hidden by the extension.
  if (!settings.enabled) {
    roots.forEach(root => {
      root.querySelectorAll(
        `[${HIDDEN_ATTR}], [${GROUP_HIDDEN_ATTR}]`
      ).forEach(element => {
        const isCard = element.hasAttribute(HIDDEN_ATTR);
        const hiddenAttr = isCard ? HIDDEN_ATTR : GROUP_HIDDEN_ATTR;
        const originalAttr = isCard
          ? "data-dorado-filter-original-display"
          : "data-dorado-filter-group-original-display";

        element.style.display = element.getAttribute(originalAttr) || "";
        element.removeAttribute(hiddenAttr);
        element.removeAttribute(originalAttr);
      });
    });
    return;
  }

  // Expand collapsed leagues before filtering.
  roots.forEach(root => {
    root.querySelectorAll(
      '[class*="ChampionshipHeader"][data-is-open="false"]'
    ).forEach(header => {
      header.click();
    });
  });

  // Collect cards after triggering expansion.
  const cards = roots.flatMap(root =>
    Array.from(root.querySelectorAll(CARD_SELECTOR))
  );

  const visibleCards = new Set();

  cards.forEach(card => {
    const hasClock = !!card.querySelector(CLOCK_SELECTOR);
    const isLive = !!card.querySelector(LIVE_SELECTOR) || hasClock;

  const excluded = cardHasExcludedStatus(card);
const visible = !excluded && (!isLive || matchesFilter(card));

    setElementVisible(
      card,
      visible,
      HIDDEN_ATTR,
      "data-dorado-filter-original-display"
    );

    if (visible) visibleCards.add(card);
  });

  // Hide leagues that have no visible matches.
  roots.forEach(root => {
    root.querySelectorAll(CHAMPIONSHIP_SELECTOR).forEach(group => {
      const groupCards = Array.from(
        group.querySelectorAll(CARD_SELECTOR)
      );

      if (!groupCards.length) return;

      const hasVisibleMatch = groupCards.some(card =>
        visibleCards.has(card)
      );

      setElementVisible(
        group,
        hasVisibleMatch,
        GROUP_HIDDEN_ATTR,
        "data-dorado-filter-group-original-display"
      );
    });
  });
}
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get("settings");
    settings = { ...DEFAULTS, ...(stored.settings || {}) };
    scheduleApply();
  }

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "DORADO_FILTER_APPLY") {
      settings = { ...DEFAULTS, ...(message.settings || {}) };
      scheduleApply();
    }
  });

  function observeRoot(root) {
    if (observedRoots.has(root) || typeof root.querySelectorAll !== "function") return;
    observedRoots.add(root);
    const observer = new MutationObserver(() => {
      collectRoots(root).forEach(observeRoot);
      scheduleApply();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  function startObservers() {
    collectRoots().forEach(observeRoot);
    // Detect shadow roots attached after the page's initial render.
    setInterval(() => {
      collectRoots().forEach(observeRoot);
      scheduleApply();
    }, 1500);
  }

  loadSettings();
  startObservers();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings) {
      settings = { ...DEFAULTS, ...(changes.settings.newValue || {}) };
      scheduleApply();
    }
  });

  function collectFilteredMatches() {
  const roots = collectRoots();

  const cards = [
    ...new Set(
      roots.flatMap(root =>
        Array.from(root.querySelectorAll(CARD_SELECTOR))
      )
    )
  ];

  return cards
    .filter(card => {
      return (
        !card.hasAttribute(HIDDEN_ATTR) &&
        !cardHasExcludedStatus(card)
      );
    })
    .map(card => {
      const competitors = card.querySelectorAll(
        '[class*="CompetitorName"]'
      );

      const scores = card.querySelectorAll(
        '[class*="Score"]'
      );

      const competition = card.querySelector(
        '[class*="CategoryChampionship"]'
      );

      const clock = card.querySelector(STATUS_SELECTOR);
      const injury = card.querySelector(INJURY_SELECTOR);

      let time = clock?.textContent.trim() || "Unknown";

      if (injury?.textContent.trim()) {
        time += ` ${injury.textContent.trim()}`;
      }

      return {
        competition: competition?.textContent.trim() || "Unknown",
        home: competitors[0]?.textContent.trim() || "Unknown",
        away: competitors[1]?.textContent.trim() || "Unknown",
        homeScore: scores[0]?.textContent.trim() || "?",
        awayScore: scores[1]?.textContent.trim() || "?",
        time
      };
    })
    .filter(match =>
      match.home !== "Unknown" &&
      match.away !== "Unknown"
    );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "DORADO_COPY_MATCHES") {
    const matches = collectFilteredMatches();

    console.log("[Dorado Filter] Matches collected:", matches);

    sendResponse({ matches });
  }
});
})();
