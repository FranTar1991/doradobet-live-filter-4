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
})();