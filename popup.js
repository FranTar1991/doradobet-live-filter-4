const DEFAULTS = {
  enabled: true,
  firstEnabled: true,
  firstMin: 40,
  firstMax: 45,
  secondEnabled: true,
  secondMin: 80,
  secondMax: 90
};

const ids = Object.keys(DEFAULTS);
const $ = id => document.getElementById(id);

let saveTimer = null;

function readUI() {
  return Object.fromEntries(ids.map(id => [
    id,
    $(id).type === "checkbox"
      ? $(id).checked
      : Number($(id).value)
  ]));
}

function updateRanges() {
  for (const name of ["first", "second"]) {
    const minInput = $(`${name}Min`);
    const maxInput = $(`${name}Max`);

    const min = Number(minInput.min);
    const max = Number(minInput.max);
    const low = Number(minInput.value);
    const high = Number(maxInput.value);

    const left = ((low - min) / (max - min)) * 100;
    const right = ((high - min) / (max - min)) * 100;

    $(`${name}Output`).textContent = `${low}–${high} min`;

    const selected = document
      .querySelector(`[data-range="${name}"] .selected`);

    selected.style.left = `${left}%`;
    selected.style.width = `${right - left}%`;
  }
}

async function persistSettings() {
  const settings = readUI();
  await chrome.storage.local.set({ settings });
  $("status").textContent = "Settings saved automatically.";
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistSettings, 120);
}

function handleRangeInput(name, changed) {
  const minInput = $(`${name}Min`);
  const maxInput = $(`${name}Max`);

  let low = Number(minInput.value);
  let high = Number(maxInput.value);

  if (changed === "min" && low > high) {
    minInput.value = high;
  }

  if (changed === "max" && high < low) {
    maxInput.value = low;
  }

  updateRanges();
  scheduleSave();
}

(async function init() {
  const stored = await chrome.storage.local.get("settings");
  const old = stored.settings || {};

  const settings = {
    ...DEFAULTS,
    ...old,

    // Migrate settings from the previous version.
    firstMin: old.firstMin ?? old.firstAfter ?? DEFAULTS.firstMin,
    firstMax: old.firstMax ?? DEFAULTS.firstMax,
    secondMin: old.secondMin ?? old.secondAfter ?? DEFAULTS.secondMin,
    secondMax: old.secondMax ?? DEFAULTS.secondMax
  };

  ids.forEach(id => {
    if ($(id).type === "checkbox") {
      $(id).checked = !!settings[id];
    } else {
      $(id).value = settings[id];
    }
  });

  updateRanges();

  ["enabled", "firstEnabled", "secondEnabled"].forEach(id => {
    $(id).addEventListener("change", scheduleSave);
  });

  ["first", "second"].forEach(name => {
    $(`${name}Min`).addEventListener("input", () => {
      handleRangeInput(name, "min");
    });

    $(`${name}Max`).addEventListener("input", () => {
      handleRangeInput(name, "max");
    });
  });

  $("copyMatches").addEventListener("click", async () => {
  const button = $("copyMatches");
  button.disabled = true;
  button.textContent = "Collecting matches...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab?.id) {
      throw new Error("No active tab found.");
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "DORADO_COPY_MATCHES"
    });

    if (!response?.matches?.length) {
      $("status").textContent = "No filtered matches found.";
      return;
    }

    const prompt =  `
Act as an independent football match analyst.

Analyze the following LIVE football matches and predict their most plausible final outcomes.

IMPORTANT:
Use web research to identify each fixture and retrieve current information whenever available. Do not rely exclusively on the score and match minute.

FOR EACH MATCH:

1. Verify the exact fixture using the competition, teams, score and match time.
2. Search for recent and live match information from reliable sources.
3. Consider:
   - Current score and remaining time.
   - Shots and shots on target.
   - Dangerous attacks and attacking pressure.
   - Possession and corners.
   - Red and yellow cards.
   - Substitutions and injuries.
   - Recent goals and match events.
   - Recent form and team strength.
4. Evaluate which team is more likely to score next.
5. Consider whether the current score is likely to remain unchanged.

PREDICTION:

For each match, provide:

- Most likely final score.
- Most likely winner, or draw.
- Probability of the home team winning.
- Probability of a draw.
- Probability of the away team winning.
- Probability that the current score remains unchanged.
- Probability that at least one more goal will be scored.
- Confidence level: Low, Medium or High.
- Explanation based on available evidence.

RANKING:

Rank all matches according to the strength of the prediction, not simply according to the lowest odds or the shortest remaining time.

Be objective:
- Do not force a winner when a draw is more plausible.
- Do not assume the leading team will win.
- Do not assume that a match with little time remaining cannot produce another goal.
- Do not invent statistics or events.
- Clearly distinguish verified information from estimates.
- If reliable live statistics are unavailable, explain how that limits your prediction.

FINAL SUMMARY:

Create a table containing:
Match | Current Score | Predicted Final Score | Predicted Outcome | Confidence

Then identify the three most interesting predictions, if there are three sufficiently supported candidates.

If the evidence is insufficient, say so.

Remember: These are probabilistic predictions, not guaranteed results.

MATCHES:
${response.matches.map((match, index) => `
${index + 1}. ${match.competition}
   Match: ${match.home} vs ${match.away}
   Score: ${match.homeScore} - ${match.awayScore}
   Time: ${match.time}
`).join("\n")}
Analyze independently and objectively. Accuracy is more important than producing recommendations.
`;

    await navigator.clipboard.writeText(prompt);

    $("status").textContent =
      `${response.matches.length} matches copied successfully.`;

    button.textContent = "Copied!";
  } catch (error) {
  console.error("Copy matches error:", error);
  $("status").textContent = error.message;
}finally {
    button.disabled = false;

    setTimeout(() => {
      button.textContent = "Copy filtered matches";
    }, 1800);
  }
});
})();