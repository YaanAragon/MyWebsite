// Utilities: CSV parsing, MSD computation, linear fit
(function (global) {
  function parseCSV(text) {
    const rows = text.trim().split(/\r?\n/)
      .map(r => r.split(/,|\t/).map(s => s.trim()));
    const header = rows[0].map(h => h.toLowerCase());
    const idxTime = header.indexOf("time_s");
    const idxX = header.indexOf("x_um");
    const idxY = header.indexOf("y_um");
    if (idxTime === -1 || idxX === -1 || idxY === -1) {
      throw new Error("CSV must have columns: time_s,x_um,y_um");
    }
    const data = rows.slice(1).map(r => ({
      t: parseFloat(r[idxTime]),
      x: parseFloat(r[idxX]),
      y: parseFloat(r[idxY])
    })).filter(p =>
      Number.isFinite(p.t) && Number.isFinite(p.x) && Number.isFinite(p.y)
    ).sort((a, b) => a.t - b.t);
    return data;
  }

  function computeMSD(data, maxFraction = 0.25) {
    if (data.length < 10) throw new Error("Need at least 10 points.");
    const N = data.length;
    const dt = (data[N - 1].t - data[0].t) / (N - 1);
    const maxLag = Math.max(1, Math.floor((N - 1) * maxFraction));
    const msd = [];
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0, count = 0;
      for (let i = 0; i + lag < N; i++) {
        const dx = data[i + lag].x - data[i].x;
        const dy = data[i + lag].y - data[i].y;
        sum += dx * dx + dy * dy;
        count++;
      }
      if (count > 0) {
        msd.push({ lag, tau: lag * dt, value: sum / count });
      }
    }
    return { msd, dt };
  }

  function linearFit(xs, ys) {
    const n = xs.length;
    const sx = xs.reduce((a, b) => a + b, 0);
    const sy = ys.reduce((a, b) => a + b, 0);
    const sxx = xs.reduce((a, b) => a + b * b, 0);
    const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0);
    const denom = n * sxx - sx * sx;
    const a = (n * sxy - sx * sy) / denom; // slope
    const b = (sy * sxx - sx * sxy) / denom; // intercept
    return { a, b };
  }

  // Expose
  global.Utils = { parseCSV, computeMSD, linearFit };
})(window);
// End of utilities