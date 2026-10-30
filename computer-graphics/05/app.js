'use strict';

const W = 40, H = 30, CELL = 20;
const EMPTY = 0, BOUNDARY = 1, FILLED = 2;
const canvas = document.getElementById('raster');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);

const shapes = {
  concave: { points: [{x:5,y:4},{x:29,y:4},{x:29,y:11},{x:20,y:11},{x:20,y:25},{x:5,y:25}], closed:true, seed:{x:12,y:15}, row:12 },
  rectangle: { points: [{x:7,y:6},{x:31,y:6},{x:31,y:23},{x:7,y:23}], closed:true, seed:{x:15,y:15}, row:12 },
  triangle: { points: [{x:19,y:3},{x:34,y:25},{x:5,y:25}], closed:true, seed:{x:19,y:16}, row:12 },
  convex: { points: [{x:19,y:3},{x:33,y:12},{x:28,y:27},{x:10,y:27},{x:5,y:12}], closed:true, seed:{x:19,y:15}, row:12 },
  horizontal: { points: [{x:6,y:7},{x:32,y:7},{x:32,y:23},{x:6,y:23}], closed:true, seed:{x:15,y:15}, row:7 },
  vertex: { points: [{x:19,y:3},{x:33,y:15},{x:25,y:26},{x:8,y:26},{x:5,y:15}], closed:true, seed:{x:19,y:15}, row:15 },
  open: { points: [{x:7,y:6},{x:31,y:6},{x:31,y:23},{x:7,y:23}], closed:false, seed:{x:15,y:15}, row:12 }
};

let points = [], closed = true, grid = [], floodOrder = [], lastMetrics = null;
let currentStep = 0, selectedSeed = {x:15,y:15};

function newGrid() { return Array.from({length:H}, () => Array(W).fill(EMPTY)); }
function inBounds(x,y) { return x >= 0 && x < W && y >= 0 && y < H; }
function putLine(x0,y0,x1,y1, target) {
  let dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1, err=dx+dy;
  while (true) {
    if (inBounds(x0,y0)) target[y0][x0] = BOUNDARY;
    if (x0===x1 && y0===y1) break;
    const e2=2*err;
    if (e2>=dy) { err+=dy; x0+=sx; }
    if (e2<=dx) { err+=dx; y0+=sy; }
  }
}
function drawBoundary(target=grid) {
  for (let i=0; i<points.length-1; i++) putLine(points[i].x,points[i].y,points[i+1].x,points[i+1].y,target);
  if (closed && points.length>2) putLine(points.at(-1).x,points.at(-1).y,points[0].x,points[0].y,target);
}
function render(stepLimit=null) {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    let value=grid[y][x];
    if (stepLimit !== null && value===FILLED) {
      const index=floodOrder.findIndex(p=>p.x===x && p.y===y);
      if (index>=stepLimit) value=EMPTY;
    }
    ctx.fillStyle = value===BOUNDARY ? '#172554' : value===FILLED ? '#80c7f2' : '#ffffff';
    ctx.fillRect(x*CELL,y*CELL,CELL,CELL);
    ctx.strokeStyle='#dbe3ed'; ctx.lineWidth=1;
    ctx.strokeRect(x*CELL+.5,y*CELL+.5,CELL,CELL);
  }
  if (stepLimit !== null) {
    for (let i=0;i<Math.min(stepLimit,floodOrder.length);i++) {
      const p=floodOrder[i]; if (grid[p.y][p.x]===FILLED) {
        ctx.fillStyle='#f5bd62'; ctx.fillRect(p.x*CELL+2,p.y*CELL+2,CELL-4,CELL-4);
      }
    }
  }
}
function loadShape() {
  const shape=shapes[$('shape').value];
  points=shape.points.map(p=>({...p})); closed=shape.closed;
  selectedSeed={...shape.seed}; $('startX').value=selectedSeed.x; $('startY').value=selectedSeed.y;
  $('rowY').value=shape.row; reset();
}
function reset() {
  grid=newGrid(); floodOrder=[]; currentStep=0; drawBoundary(); render();
  $('step').max=0; $('step').value=0; $('stepValue').textContent='все';
  $('status').textContent=closed?'Контур замкнут. Можно запускать алгоритм.':'Контур разомкнут: заливка может выйти наружу.';
  $('metrics').textContent='Пока нет измерений.';
}
function floodFill(startX,startY) {
  const work=newGrid(); drawBoundary(work);
  const stack=[{x:startX,y:startY}], visited=new Set(), order=[];
  let processed=0, filled=0;
  while(stack.length) {
    const p=stack.pop(), key=p.x+','+p.y;
    if (!inBounds(p.x,p.y) || visited.has(key)) continue;
    visited.add(key); processed++;
    if (work[p.y][p.x]===BOUNDARY) continue;
    work[p.y][p.x]=FILLED; order.push(p); filled++;
    stack.push({x:p.x+1,y:p.y},{x:p.x-1,y:p.y},{x:p.x,y:p.y+1},{x:p.x,y:p.y-1});
  }
  return {grid:work,order,processed,filled};
}
function getIntersections(poly,y) {
  const xs=[];
  for(let i=0;i<poly.length;i++) {
    const a=poly[i], b=poly[(i+1)%poly.length];
    if(a.y===b.y) continue; 
    const yMin=Math.min(a.y,b.y), yMax=Math.max(a.y,b.y);
    if(y<yMin || y>=yMax) continue;
    xs.push(a.x+((y-a.y)*(b.x-a.x))/(b.y-a.y));
  }
  xs.sort((a,b)=>a-b);
  return xs;
}
function scanlineFill(poly) {
  const result=newGrid(); drawBoundary(result);
  let processed=0, filled=0;
  if (!closed || poly.length<3) return {grid:result,processed,filled};
  const minY=Math.max(0,Math.min(...poly.map(p=>p.y)));
  const maxY=Math.min(H-1,Math.max(...poly.map(p=>p.y)));
  for(let y=minY;y<=maxY;y++) {
    const xs=getIntersections(poly,y);
    for(let i=0;i+1<xs.length;i+=2) {
      const xStart=Math.max(0,Math.ceil(xs[i]));
      const xEnd=Math.min(W-1,Math.floor(xs[i+1]));
      for(let x=xStart;x<=xEnd;x++) {
        processed++;
        if(result[y][x]!==BOUNDARY) { result[y][x]=FILLED; filled++; }
      }
    }
  }
  return {grid:result,processed,filled};
}
function showRow() {
  const y=Number($('rowY').value), xs=closed?getIntersections(points,y):[];
  const intervals=[];
  for(let i=0;i+1<xs.length;i+=2) intervals.push(`${Math.ceil(xs[i])}..${Math.floor(xs[i+1])}`);
  $('rowTable').innerHTML=`<table><tr><th>Параметр</th><th>Значение</th></tr>
    <tr><td>y</td><td>${y}</td></tr><tr><td>Пересечения X</td><td>${xs.length?xs.map(v=>v.toFixed(2)).join(', '):'нет'}</td></tr>
    <tr><td>Интервалы заполнения</td><td>${intervals.length?intervals.join('; '):'нет'}</td></tr></table>`;
}
function countFilled(g) { return g.reduce((sum,row)=>sum+row.filter(v=>v===FILLED).length,0); }
function run() {
  const method=$('method').value, t0=performance.now();
  if(method==='flood') {
    const result=floodFill(Number($('startX').value),Number($('startY').value));
    grid=result.grid; floodOrder=result.order; currentStep=floodOrder.length;
    $('step').max=floodOrder.length; $('step').value=currentStep;
    $('stepValue').textContent=`${currentStep} / ${floodOrder.length}`;
    lastMetrics={method:'Flood Fill',processed:result.processed,filled:result.filled,elapsed:performance.now()-t0};
    render(currentStep);
    $('status').textContent=`Flood Fill завершён: закрашено ${result.filled} клеток.`;
  } else {
    const result=scanlineFill(points); grid=result.grid; floodOrder=[];
    $('step').max=0; $('step').value=0; $('stepValue').textContent='не применяется';
    lastMetrics={method:'Scanline Fill',processed:result.processed,filled:result.filled,elapsed:performance.now()-t0};
    render();
    $('status').textContent=`Scanline Fill завершён: закрашено ${result.filled} клеток.`;
  }
  $('metrics').innerHTML=metricsTable([lastMetrics]);
}
function metricsTable(rows) {
  return `<table><tr><th>Метод</th><th>Обработано</th><th>Закрашено</th><th>Время, мс</th></tr>${rows.map(r=>`<tr><td>${r.method}</td><td>${r.processed}</td><td>${r.filled}</td><td>${r.elapsed.toFixed(4)}</td></tr>`).join('')}</table>`;
}
function benchmark() {
  const runs=100, results=[];
  for(const [name,fn] of [['Flood Fill',()=>floodFill(selectedSeed.x,selectedSeed.y)],['Scanline Fill',()=>scanlineFill(points)]]) {
    let total=0, last;
    for(let i=0;i<runs;i++){const t=performance.now();last=fn();total+=performance.now()-t;}
    results.push({method:`${name} (среднее ${runs} запусков)`,processed:last.processed,filled:last.filled,elapsed:total/runs});
  }
  $('metrics').innerHTML=`<p>Серия: ${runs} запусков каждого алгоритма; показано среднее время одного запуска.</p>${metricsTable(results)}`;
}
canvas.addEventListener('click',e=>{
  const rect=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-rect.left)/rect.width*W), y=Math.floor((e.clientY-rect.top)/rect.height*H);
  selectedSeed={x,y}; $('startX').value=x; $('startY').value=y;
  $('status').textContent=`Стартовая точка установлена: (${x}, ${y}).`;
});
$('shape').addEventListener('change',loadShape);
$('run').addEventListener('click',run);
$('reset').addEventListener('click',reset);
$('rowInfo').addEventListener('click',showRow);
$('benchmark').addEventListener('click',benchmark);
$('step').addEventListener('input',e=>{currentStep=Number(e.target.value);$('stepValue').textContent=`${currentStep} / ${floodOrder.length}`;render(currentStep);});
$('prev').addEventListener('click',()=>{$('step').value=Math.max(0,Number($('step').value)-1);$('step').dispatchEvent(new Event('input'));});
$('next').addEventListener('click',()=>{$('step').value=Math.min(floodOrder.length,Number($('step').value)+1);$('step').dispatchEvent(new Event('input'));});

loadShape();
showRow();