// App wiring: file input, analysis, charts
(function (Utils, ChartsAPI, DataAPI) {
  const csvInput = document.getElementById("csvInput");
  const demoBtn = document.getElementById("demoBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const statusEl = document.getElementById("status");
  const mppEl = document.getElementById("mpp");
  const fpsEl = document.getElementById("fps");
  const DEl = document.getElementById("D");

  let rawData = null; // positions already in µm; time in s

  csvInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    statusEl.textContent = "Reading file…";
    const text = await file.text();
    try {
      const parsed = Utils.parseCSV(text);
      rawData = parsed;
      statusEl.textContent = `Loaded ${parsed.length} rows.`;
      ChartsAPI.plotTrajectory(rawData);
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });

  demoBtn?.addEventListener("click", () => {
    rawData = DataAPI.makeDemo();
    statusEl.textContent = "Loaded demo data (synthetic Brownian motion).";
    ChartsAPI.plotTrajectory(rawData);
  });

  analyzeBtn?.addEventListener("click", () => {
    try {
      if (!rawData || rawData.length < 10) throw new Error("Load data or demo first.");
      const mpp = parseFloat(mppEl?.value) || 1; // kept for info
      const fps = parseFloat(fpsEl?.value) || 30; // kept for info

      const { msd } = Utils.computeMSD(rawData);
      const fitCount = Math.max(3, Math.floor(msd.length * 0.2));
      const xs = msd.slice(0, fitCount).map(p => p.tau);
      const ys = msd.slice(0, fitCount).map(p => p.value);
      const fit = Utils.linearFit(xs, ys);
      const D = fit.a / 4; // 2D diffusion: slope = 4D

      if (DEl) DEl.textContent = D.toFixed(3);
      ChartsAPI.plotMSD(msd, fit);
      statusEl.textContent = `Analyzed ${rawData.length} frames at ~${fps.toFixed(0)} fps. mpp=${mpp}.`;
    } catch (err) {
      statusEl.textContent = err.message;
    }
  });
})(window.Utils, window.ChartsAPI, window.DataAPI);
