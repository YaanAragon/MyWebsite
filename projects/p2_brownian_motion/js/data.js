// Demo data generator (synthetic Brownian motion)
(function (global) {
  function gaussian() {
    // Box–Muller transform
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function makeDemo({ N = 400, dt = 1 / 30, D = 0.4 } = {}) {
    const data = [{ t: 0, x: 0, y: 0 }];
    const sigma = Math.sqrt(2 * D * dt); // per-axis std (µm)
    for (let i = 1; i < N; i++) {
      const dx = sigma * gaussian();
      const dy = sigma * gaussian();
      data.push({ t: i * dt, x: data[i - 1].x + dx, y: data[i - 1].y + dy });
    }
    return data;
  }

  global.DataAPI = { makeDemo };
})(window);
// End of demo data generator