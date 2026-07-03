// ── Slider live value updates ─────────────────────────────────────────────────

const sliders = [
  { id: "sepal-length", valId: "val-sl", dimId: "dim-sl", chipId: "chip-sl" },
  { id: "sepal-width",  valId: "val-sw", dimId: "dim-sw", chipId: "chip-sw" },
  { id: "petal-length", valId: "val-pl", dimId: "dim-pl", chipId: "chip-pl" },
  { id: "petal-width",  valId: "val-pw", dimId: "dim-pw", chipId: "chip-pw" },
];

function updateSliderTrack(slider) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const val = parseFloat(slider.value);
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background =
    `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${pct}%, #232E45 ${pct}%)`;
}

sliders.forEach(({ id, valId, dimId, chipId }) => {
  const slider  = document.getElementById(id);
  const label   = document.getElementById(valId);
  const dimText = document.getElementById(dimId);
  const chip    = document.getElementById(chipId);
  updateSliderTrack(slider);
  slider.addEventListener("input", () => {
    const text = `${parseFloat(slider.value).toFixed(1)} cm`;
    label.textContent = text;
    if (dimText) dimText.textContent = text;
    if (chip) chip.textContent = text;
    updateSliderTrack(slider);
  });
});

// ── Predict ───────────────────────────────────────────────────────────────────

const predictBtn  = document.getElementById("predict-btn");
const resultBox   = document.getElementById("result-box");
const resultName  = document.getElementById("result-species");
const resultDesc  = document.getElementById("result-desc");
const confBars    = document.getElementById("conf-bars");

const COLORS = {
  setosa:     "#60A5FA",
  versicolor: "#FB923C",
  virginica:  "#4ADE80",
};

async function predict() {
  predictBtn.disabled = true;
  predictBtn.querySelector(".btn-text").textContent = "Predicting…";

  const payload = {
    sepal_length: document.getElementById("sepal-length").value,
    sepal_width:  document.getElementById("sepal-width").value,
    petal_length: document.getElementById("petal-length").value,
    petal_width:  document.getElementById("petal-width").value,
  };

  try {
    const res  = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    // ── Update result box ─────────────────────────────────────────────────────
    resultBox.classList.add("has-result");
    resultBox.style.setProperty("--result-color", data.color);
    resultBox.style.setProperty("--result-glow", data.color + "22");

    resultName.textContent =
      `${data.emoji} ${data.species.charAt(0).toUpperCase() + data.species.slice(1)}`;
    resultName.style.color = data.color;
    resultDesc.textContent = data.description;

    // ── Confidence bars ───────────────────────────────────────────────────────
    confBars.innerHTML = "";
    Object.entries(data.probabilities).forEach(([name, pct]) => {
      const color = COLORS[name] || "#718096";
      const row = document.createElement("div");
      row.className = "conf-row";
      row.innerHTML = `
        <span class="conf-label">${name.charAt(0).toUpperCase() + name.slice(1)}</span>
        <div class="conf-track">
          <div class="conf-fill" style="background:${color}; width:0%"
            data-target="${pct}"></div>
        </div>
        <span class="conf-pct">${pct}%</span>
      `;
      confBars.appendChild(row);
    });

    // Animate bars after a short delay (ensures DOM is painted first)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll(".conf-fill").forEach(bar => {
          bar.style.width = bar.dataset.target + "%";
        });
      });
    });

  } catch (err) {
    resultName.textContent = "Error — is the server running?";
    resultDesc.textContent = "";
  } finally {
    predictBtn.disabled = false;
    predictBtn.querySelector(".btn-text").textContent = "Predict Species";
  }
}

predictBtn.addEventListener("click", predict);

// ── Preset buttons ────────────────────────────────────────────────────────────

document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.getElementById("sepal-length").value = btn.dataset.sl;
    document.getElementById("sepal-width").value  = btn.dataset.sw;
    document.getElementById("petal-length").value = btn.dataset.pl;
    document.getElementById("petal-width").value  = btn.dataset.pw;

    // Update all labels, dimension read-outs, chips, and tracks
    sliders.forEach(({ id, valId, dimId, chipId }) => {
      const slider  = document.getElementById(id);
      const text    = `${parseFloat(slider.value).toFixed(1)} cm`;
      document.getElementById(valId).textContent = text;
      const dimText = document.getElementById(dimId);
      if (dimText) dimText.textContent = text;
      const chip = document.getElementById(chipId);
      if (chip) chip.textContent = text;
      updateSliderTrack(slider);
    });

    predict();
  });
});

// ── Accuracy bar animation + chart fade-in on load ───────────────────────────

window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll(".accuracy-bar-fill").forEach(bar => {
      bar.style.width = bar.dataset.target + "%";
    });
  }, 400);

  document.querySelectorAll(".chart-img").forEach(img => {
    if (img.complete) {
      img.classList.add("loaded");
    } else {
      img.addEventListener("load", () => img.classList.add("loaded"));
    }
  });
});
