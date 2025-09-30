// ---------- Theme ----------
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
});

// ---------- Tabs ----------
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = {
  roads: document.getElementById('tab-roads'),
  mtr: document.getElementById('tab-mtr')
};
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.tab;
    tabPanels[key].classList.add('active');
  });
});

// ---------- Shared helpers ----------
function haversine(a, b){
  const R=6371000, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLon=toRad(b.lng-a.lng);
  const lat1=toRad(a.lat), lat2=toRad(b.lat);
  const s=Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function ramp(t){
  const stops = [
    [0,   [0,184,148]],
    [0.5, [255,224,130]],
    [1,   [255,118,117]]
  ];
  function lerp(a,b,t){return a+(b-a)*t}
  let i=0; while(i<stops.length-1 && t>stops[i+1][0]) i++;
  const [t0,c0] = stops[i], [t1,c1]=stops[i+1];
  const u = (t - t0)/(t1 - t0);
  const c = [lerp(c0[0],c1[0],u), lerp(c0[1],c1[1],u), lerp(c0[2],c1[2],u)];
  return `rgb(${c.map(x=>Math.round(x)).join(',')})`;
}
async function readFileAsJSON(file){ const text = await file.text(); return JSON.parse(text); }

// ---------- Roads map ----------
const mapRoads = L.map('mapRoads').setView([22.285, 114.157], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapRoads);

let roads = {
  nodesGeo: null, edgesGeo: null,
  edgesLayer: null, routeLayer: null, startMarker: null, endMarker: null,
  adjacency: new Map(), nodeIndex: new Map(), edgeGeomIndex: new Map(), numericProps: new Set()
};

function roadsBuildGraph(){
  const R = roads;
  R.adjacency.clear(); R.nodeIndex.clear(); R.edgeGeomIndex.clear(); R.numericProps.clear();

  if(R.nodesGeo){
    for(const f of R.nodesGeo.features){
      const id = f.properties.osmid ?? f.id ?? f.properties.id;
      if(!id) continue;
      const [lon, lat] = f.geometry.coordinates;
      R.nodeIndex.set(String(id), {lat, lon});
    }
  }
  if(!R.edgesGeo) return;

  const sampleProps = R.edgesGeo.features?.[0]?.properties || {};
  for(const k of Object.keys(sampleProps)){
    const v = sampleProps[k];
    if (typeof v === 'number' && Number.isFinite(v)) R.numericProps.add(k);
  }
  if(!R.numericProps.has('length')) R.numericProps.add('length');

  for(const f of R.edgesGeo.features){
    const p = f.properties || {};
    const u = String(p.u ?? p.from ?? p.source ?? '');
    const v = String(p.v ?? p.to ?? p.target ?? '');
    if(!u || !v) continue;

    let latlngs = [];
    if (f.geometry.type === 'LineString'){
      latlngs = f.geometry.coordinates.map(([lon,lat])=>[lat,lon]);
    } else if (f.geometry.type === 'MultiLineString'){
      latlngs = f.geometry.coordinates.flat(1).map(([lon,lat])=>[lat,lon]);
    }

    if (typeof p.length !== 'number' || !Number.isFinite(p.length)){
      let len = 0;
      for(let i=1;i<latlngs.length;i++){
        len += haversine({lat:latlngs[i-1][0], lng:latlngs[i-1][1]},
                         {lat:latlngs[i][0],   lng:latlngs[i][1]});
      }
      p.length = len; f.properties.length = len;
    }

    R.edgeGeomIndex.set(`${u}|${v}`, latlngs);
    R.edgeGeomIndex.set(`${v}|${u}`, [...latlngs].reverse());

    const weight = (prop)=> (typeof f.properties[prop] === 'number' ? f.properties[prop] : f.properties.length);
    const oneway = f.properties.oneway === true || f.properties.oneway === 1 || f.properties.oneway === "True";
    if(!R.adjacency.has(u)) R.adjacency.set(u, []);
    R.adjacency.get(u).push({v, w: weight, key:`${u}|${v}`});
    if(!oneway){
      if(!R.adjacency.has(v)) R.adjacency.set(v, []);
      R.adjacency.get(v).push({v:u, w: weight, key:`${v}|${u}`});
    }
  }

  // Fill missing node coordinates from edges if needed
  for(const nid of R.adjacency.keys()){
    if(!R.nodeIndex.has(nid)){
      const e = R.adjacency.get(nid)[0];
      const pts = R.edgeGeomIndex.get(`${nid}|${e.v}`);
      if(pts && pts.length) R.nodeIndex.set(nid, {lat:pts[0][0], lon:pts[0][1]});
    }
  }

  // Stats
  document.getElementById('roadsNodesCount').textContent = R.nodeIndex.size;
  document.getElementById('roadsEdgesCount').textContent = R.edgesGeo.features.length;
  const totalLenM = R.edgesGeo.features.reduce((s,f)=>s+(f.properties.length||0),0);
  document.getElementById('roadsTotalLen').textContent = (totalLenM/1000).toFixed(1);
  let degSum = 0; R.adjacency.forEach(arr => degSum += arr.length);
  document.getElementById('roadsAvgDeg').textContent = (degSum / Math.max(1, R.adjacency.size)).toFixed(2);

  // Populate property selector
  const select = document.getElementById('roadsPropSelect');
  select.innerHTML = '';
  [...R.numericProps].forEach(k=>{
    const opt = document.createElement('option'); opt.value = k; opt.textContent = k;
    select.appendChild(opt);
  });
}

function roadsStyleFor(prop){
  const feats = roads.edgesGeo.features;
  let min=Infinity, max=-Infinity;
  for(const f of feats){
    const v = (typeof f.properties[prop]==='number') ? f.properties[prop] : f.properties.length;
    if(Number.isFinite(v)){ if(v<min) min=v; if(v>max) max=v; }
  }
  document.getElementById('roadsLegendMin').textContent = (min===Infinity ? '–' : (prop==='length' ? (min/1000).toFixed(2)+'k' : min.toFixed(2)));
  document.getElementById('roadsLegendMax').textContent = (max===-Infinity ? '–' : (prop==='length' ? (max/1000).toFixed(2)+'k' : max.toFixed(2)));

  return function(feature){
    const v = (typeof feature.properties[prop]==='number') ? feature.properties[prop] : feature.properties.length;
    const t = (v - min) / Math.max(1e-9, (max - min));
    return { color: ramp(Math.min(1, Math.max(0, t))), weight: 2, opacity: 0.9 };
  };
}

function roadsRedraw(){
  if(!roads.edgesGeo) return;
  const prop = document.getElementById('roadsPropSelect').value || 'length';
  if(roads.edgesLayer){ mapRoads.removeLayer(roads.edgesLayer); }
  roads.edgesLayer = L.geoJSON(roads.edgesGeo, { style: roadsStyleFor(prop)}).addTo(mapRoads);
  mapRoads.fitBounds(roads.edgesLayer.getBounds(), {padding:[20,20]});
}

function roadsNearestNode(latlng){
  let bestId=null, bestD=Infinity;
  roads.nodeIndex.forEach((pt, id)=>{
    const d = haversine(latlng, {lat:pt.lat, lng:pt.lon});
    if(d<bestD){bestD=d; bestId=id;}
  });
  return {id:bestId, dist:bestD};
}

function roadsDijkstra(start, goal, weightProp){
  const R = roads;
  const dist = new Map(); const prev = new Map(); const visited = new Set();
  const pq = [];
  function push(id, d){ pq.push({id,d}); pq.sort((a,b)=>a.d-b.d); }

  R.adjacency.forEach((_, id)=>{ dist.set(id, Infinity); });
  if(!R.adjacency.has(start) || !R.adjacency.has(goal)) return null;
  dist.set(start, 0); push(start, 0);

  while(pq.length){
    const {id:u} = pq.shift();
    if(visited.has(u)) continue;
    visited.add(u);
    if(u===goal) break;
    const nbrs = R.adjacency.get(u) || [];
    for(const {v,w} of nbrs){
      const cost = (typeof w(weightProp) === 'number' && Number.isFinite(w(weightProp))) ? w(weightProp) : w('length');
      const alt = dist.get(u) + cost;
      if(alt < (dist.get(v) ?? Infinity)){
        dist.set(v, alt); prev.set(v, u); push(v, alt);
      }
    }
  }
  if(!prev.has(goal)) return null;
  const path=[goal]; let cur=goal;
  while(cur!==start){ cur = prev.get(cur); path.push(cur); }
  path.reverse();
  return {path, distance: dist.get(goal)};
}

function roadsDrawRoute(path){
  if(roads.routeLayer){ mapRoads.removeLayer(roads.routeLayer); roads.routeLayer=null; }
  const latlngs = [];
  for(let i=0;i<path.length-1;i++){
    const a = path[i], b = path[i+1];
    const seg = roads.edgeGeomIndex.get(`${a}|${b}`);
    if(seg && seg.length){
      if (latlngs.length && latlngs.at(-1)[0] === seg[0][0] && latlngs.at(-1)[1] === seg[0][1]){
        latlngs.push(...seg.slice(1));
      } else {
        latlngs.push(...seg);
      }
    }
  }
  roads.routeLayer = L.polyline(latlngs, {color:'#3b82f6', weight:5, opacity:0.9}).addTo(mapRoads);
  mapRoads.fitBounds(roads.routeLayer.getBounds(), {padding:[40,40]});
}

// Roads: UI wiring
document.getElementById('roadsPropSelect').addEventListener('change', ()=>roadsRedraw());
document.getElementById('roadsLoadBtn').addEventListener('click', async ()=>{
  const ef = document.getElementById('roadsEdgesFile').files[0];
  const nf = document.getElementById('roadsNodesFile').files[0];
  if(!ef || !nf){ alert('Please choose both edges and nodes GeoJSON files.'); return; }
  try{
    roads.edgesGeo = await readFileAsJSON(ef);
    roads.nodesGeo = await readFileAsJSON(nf);
    roadsBuildGraph(); roadsRedraw();
  }catch(e){ console.error(e); alert('Could not parse files. Make sure they are valid GeoJSON.'); }
});
document.getElementById('roadsClearBtn').addEventListener('click', ()=>{
  if(roads.startMarker){ mapRoads.removeLayer(roads.startMarker); roads.startMarker=null; }
  if(roads.endMarker){ mapRoads.removeLayer(roads.endMarker); roads.endMarker=null; }
  if(roads.routeLayer){ mapRoads.removeLayer(roads.routeLayer); roads.routeLayer=null; }
});
let roadsPicking = null;
document.getElementById('roadsPickStart').addEventListener('click', ()=>{ roadsPicking='start'; alert('Click on the map near a node (nearest-node selection).'); });
document.getElementById('roadsPickEnd').addEventListener('click', ()=>{ roadsPicking='end'; alert('Click on the map near a node (nearest-node selection).'); });
mapRoads.on('click', (e)=>{
  if(!roadsPicking || roads.nodeIndex.size===0) return;
  const {id} = roadsNearestNode(e.latlng);
  if(!id){ alert('No nodes loaded yet.'); return; }
  const pt = roads.nodeIndex.get(id);
  const mk = L.circleMarker([pt.lat, pt.lon], {radius:8, weight:2, color: roadsPicking==='start' ? '#16a34a' : '#ef4444', fillOpacity:0.7});
  if(roadsPicking==='start'){
    if(roads.startMarker) mapRoads.removeLayer(roads.startMarker);
    roads.startMarker = mk.addTo(mapRoads); roads.startMarker.bindTooltip('Start '+id);
  } else {
    if(roads.endMarker) mapRoads.removeLayer(roads.endMarker);
    roads.endMarker = mk.addTo(mapRoads); roads.endMarker.bindTooltip('End '+id);
  }
  roadsPicking=null;
});
document.getElementById('roadsRouteBtn').addEventListener('click', ()=>{
  if(!roads.startMarker || !roads.endMarker){ alert('Pick a start and end node first.'); return; }
  function idFromMarker(m){
    let best=null, bestD=Infinity;
    roads.nodeIndex.forEach((pt, id)=>{
      const d = haversine(m.getLatLng(), {lat:pt.lat, lng:pt.lon});
      if(d<bestD){ bestD=d; best=id; }
    });
    return best;
  }
  const s = idFromMarker(roads.startMarker);
  const t = idFromMarker(roads.endMarker);
  const prop = document.getElementById('roadsPropSelect').value || 'length';
  const res = roadsDijkstra(s,t,prop);
  if(!res){ alert('No path found.'); return; }
  roadsDrawRoute(res.path);
});

// Roads tiny sample
document.getElementById('roadsSampleBtn').addEventListener('click', ()=>{
  const sample = {
    nodes: {
      "100": {lat:22.2822, lon:114.1589},
      "200": {lat:22.2799, lon:114.1629},
      "300": {lat:22.2850, lon:114.1655}
    },
    edges: [
      {u:"100", v:"200", length: 400, bc: 0.12, coords:[[114.1589,22.2822],[114.1629,22.2799]]},
      {u:"200", v:"300", length: 520, bc: 0.30, coords:[[114.1629,22.2799],[114.1655,22.2850]]},
      {u:"100", v:"300", length: 700, bc: 0.05, coords:[[114.1589,22.2822],[114.1655,22.2850]]}
    ]
  };
  roads.nodesGeo = {
    type:"FeatureCollection",
    features: Object.entries(sample.nodes).map(([id,pt])=>({
      type:"Feature", properties:{osmid:id},
      geometry:{type:"Point", coordinates:[pt.lon, pt.lat]}
    }))
  };
  roads.edgesGeo = {
    type:"FeatureCollection",
    features: sample.edges.map(e=>({
      type:"Feature",
      properties:{u:e.u, v:e.v, length:e.length, bc:e.bc},
      geometry:{type:"LineString", coordinates:e.coords}
    }))
  };
  roadsBuildGraph(); roadsRedraw();
});

// ---------- MTR map ----------
const mapMTR = L.map('mapMTR').setView([22.3, 114.17], 11);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
}).addTo(mapMTR);

let mtr = {
  nodesGeo: null, edgesGeo: null, edgesLayer: null, nodesLayer: null, numericNodeProps: new Set()
};

function mtrBuild(){
  mtr.numericNodeProps.clear();
  if(mtr.nodesGeo){
    const sp = mtr.nodesGeo.features?.[0]?.properties || {};
    for(const k of Object.keys(sp)){
      const v = sp[k];
      if (typeof v === 'number' && Number.isFinite(v)) mtr.numericNodeProps.add(k);
    }
  }
  // populate select
  const sel = document.getElementById('mtrNodePropSelect');
  sel.innerHTML = '';
  const props = [...mtr.numericNodeProps];
  if(props.length === 0){ props.push('bc'); } // default suggestion
  props.forEach(k=>{
    const opt = document.createElement('option'); opt.value = k; opt.textContent = k; sel.appendChild(opt);
  });
  document.getElementById('mtrNodesCount').textContent = mtr.nodesGeo ? mtr.nodesGeo.features.length : '–';
  document.getElementById('mtrEdgesCount').textContent = mtr.edgesGeo ? mtr.edgesGeo.features.length : '–';
}

function mtrStyleNodes(prop){
  let min=Infinity, max=-Infinity;
  for(const f of (mtr.nodesGeo?.features || [])){
    const v = f.properties[prop];
    if(Number.isFinite(v)){ if(v<min) min=v; if(v>max) max=v; }
  }
  document.getElementById('mtrLegendMin').textContent = (min===Infinity ? '–' : min.toFixed(2));
  document.getElementById('mtrLegendMax').textContent = (max===-Infinity ? '–' : max.toFixed(2));

  return function(feature, latlng){
    const v = feature.properties[prop];
    let t=0.5;
    if(Number.isFinite(v) && isFinite(min) && isFinite(max) && max>min){
      t = (v - min) / (max - min);
    }
    const color = ramp(Math.min(1, Math.max(0, t)));
    return L.circleMarker(latlng, {radius:6, weight:1.5, color, fillOpacity:0.9});
  }
}

function mtrRedraw(){
  if(mtr.edgesLayer){ mapMTR.removeLayer(mtr.edgesLayer); mtr.edgesLayer=null; }
  if(mtr.nodesLayer){ mapMTR.removeLayer(mtr.nodesLayer); mtr.nodesLayer=null; }
  if(mtr.edgesGeo){
    mtr.edgesLayer = L.geoJSON(mtr.edgesGeo, {style: {color:'#888', weight:2, opacity:0.7}}).addTo(mapMTR);
  }
  if(mtr.nodesGeo){
    const prop = document.getElementById('mtrNodePropSelect').value || 'bc';
    mtr.nodesLayer = L.geoJSON(mtr.nodesGeo, {
      pointToLayer: (f, latlng)=> mtrStyleNodes(prop)(f, latlng)
    }).addTo(mapMTR);
    mapMTR.fitBounds(mtr.nodesLayer.getBounds(), {padding:[20,20]});
  } else if(mtr.edgesLayer){
    mapMTR.fitBounds(mtr.edgesLayer.getBounds(), {padding:[20,20]});
  }
}

document.getElementById('mtrNodePropSelect').addEventListener('change', ()=>mtrRedraw());
document.getElementById('mtrLoadBtn').addEventListener('click', async ()=>{
  const ef = document.getElementById('mtrEdgesFile').files[0];
  const nf = document.getElementById('mtrNodesFile').files[0];
  if(!ef || !nf){ alert('Please choose both MTR edges and nodes GeoJSON files.'); return; }
  try{
    mtr.edgesGeo = await readFileAsJSON(ef);
    mtr.nodesGeo = await readFileAsJSON(nf);
    mtrBuild(); mtrRedraw();
  }catch(e){ console.error(e); alert('Could not parse files. Make sure they are valid GeoJSON.'); }
});

// MTR tiny sample (3 stations)
document.getElementById('mtrSampleBtn').addEventListener('click', ()=>{
  const nodes = [
    {id:"A", lat:22.30, lon:114.17, bc:0.05},
    {id:"B", lat:22.305, lon:114.19, bc:0.20},
    {id:"C", lat:22.315, lon:114.18, bc:0.10}
  ];
  const edges = [
    {u:"A", v:"B", coords:[[114.17,22.30],[114.19,22.305]]},
    {u:"B", v:"C", coords:[[114.19,22.305],[114.18,22.315]]}
  ];
  mtr.nodesGeo = {
    type:"FeatureCollection",
    features: nodes.map(n=>({
      type:"Feature", properties:{osmid:n.id, bc:n.bc},
      geometry:{type:"Point", coordinates:[n.lon, n.lat]}
    }))
  };
  mtr.edgesGeo = {
    type:"FeatureCollection",
    features: edges.map(e=>({
      type:"Feature", properties:{u:e.u, v:e.v},
      geometry:{type:"LineString", coordinates:e.coords}
    }))
  };
  mtrBuild(); mtrRedraw();
});

// ---------- Defaults ----------
document.getElementById('roadsSampleBtn').click();
document.getElementById('mtrSampleBtn').click();
