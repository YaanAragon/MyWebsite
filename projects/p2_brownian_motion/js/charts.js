// Chart.js plotting helpers
(function (global) {
  let trajChart, msdChart;

  function plotTrajectory(data) {
    const pts = data.map(p => ({ x: p.x, y: p.y }));
    const ctx = document.getElementById("trajChart");
    if (!ctx) return;
    if (trajChart) trajChart.destroy();
    trajChart = new Chart(ctx, {
      type: "scatter",
      data: { datasets: [{ label: "Trajectory (µm)", data: pts, pointRadius: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "x (µm)" } },
          y: { title: { display: true, text: "y (µm)" } }
        }
      }
    });
  }

  function plotMSD(msd, fit) {
    const ctx = document.getElementById("msdChart");
    if (!ctx) return;
    if (msdChart) msdChart.destroy();
    const dataPts = msd.map(p => ({ x: p.tau, y: p.value }));
    const fitPts = [
      { x: msd[0].tau, y: fit.a * msd[0].tau + fit.b },
      { x: msd[msd.length - 1].tau, y: fit.a * msd[msd.length - 1].tau + fit.b }
    ];
    msdChart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          { label: "MSD (µm²)", data: dataPts, pointRadius: 2 },
          { type: "line", label: "Linear fit", data: fitPts, fill: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "Δt (s)" } },
          y: { title: { display: true, text: "MSD (µm²)" } }
        }
      }
    });
  }

  global.ChartsAPI = { plotTrajectory, plotMSD };
})(window);
// End of Chart.js helpers