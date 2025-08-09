const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');
const modeEl = document.getElementById('mode');
const modeTxt = document.getElementById('modeTxt');
const crealEl = document.getElementById('creal');
const cimagEl = document.getElementById('cimag');
const maxIterEl = document.getElementById('maxIter');
const iterLabel = document.getElementById('iterLabel');
const paletteEl = document.getElementById('palette');
const smoothEl = document.getElementById('smooth');
const renderBtn = document.getElementById('renderBtn');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const presetBtn = document.getElementById('presetBtn');
const statusEl = document.getElementById('status');

let view = { cx: -0.5, cy: 0, scale: 3.0 };
let dpr = Math.max(1, window.devicePixelRatio || 1);

function resizeCanvas(){
  const wrap = canvas.parentElement;
  canvas.width = wrap.clientWidth * dpr;
  canvas.height = wrap.clientHeight * dpr;
}
window.addEventListener('resize', ()=>{ resizeCanvas(); renderFractal(); });
resizeCanvas();

function hslToRgb(h,s,l){
  h=((h%360)+360)%360;h/=360;
  let r,g,b;
  if(s==0){r=g=b=l;}
  else {
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    const t=[h+1/3,h,h-1/3];
    [r,g,b]=t.map(tc=>{
      if(tc<0)tc+=1;if(tc>1)tc-=1;
      if(tc<1/6) return p+(q-p)*6*tc;
      if(tc<1/2) return q;
      if(tc<2/3) return p+(q-p)*(2/3-tc)*6;
      return p;
    });
  }
  return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
function paletteColor(t,palette){
  switch(palette){
    case 'classic': return hslToRgb((360*(0.95+10*t))%360,0.7,0.5);
    case 'fire': return hslToRgb(40*(1-t),0.95,0.15+0.65*t);
    case 'ice': return hslToRgb(200+120*t,0.75-0.3*t,0.12+0.6*t);
    case 'psychedelic': return hslToRgb((t*1200)%360,0.85,0.5-0.25*Math.sin(t*30));
    case 'mono': {let v=Math.floor(255*t); return [v,v,v];}
  }
}

function renderFractal(){
  statusEl.textContent = "Rendering...";
  const w = canvas.width;
  const h = canvas.height;
  const img = ctx.createImageData(w,h);

  const aspect = w/h;
  const viewW = view.scale;
  const viewH = view.scale / aspect;
  const left = view.cx - viewW/2;
  const top = view.cy - viewH/2;
  const maxIter = parseInt(maxIterEl.value);
  const smooth = smoothEl.checked;
  const mode = modeEl.value;
  const c_re = parseFloat(crealEl.value) || 0;
  const c_im = parseFloat(cimagEl.value) || 0;

  let p=0;
  for(let py=0; py<h; py++){
    const im = top + (py/h) * viewH;
    for(let px=0; px<w; px++){
      const re = left + (px/w) * viewW;
      let zx, zy, cc_re, cc_im;
      if(mode==='mandelbrot'){
        cc_re = re; cc_im = im; zx = 0; zy = 0;
      } else {
        cc_re = c_re; cc_im = c_im; zx = re; zy = im;
      }
      let n=0, zx2=0, zy2=0;
      for(; n<maxIter; n++){
        zx2 = zx*zx; zy2 = zy*zy;
        if(zx2+zy2 > 4) break;
        zy = 2*zx*zy + cc_im;
        zx = zx2 - zy2 + cc_re;
      }
      let r,g,b;
      if(n>=maxIter) { r=g=b=0; }
      else {
        let t;
        if(smooth){
          const mag = Math.sqrt(zx2+zy2);
          const log_zn = Math.log(Math.max(mag,1e-16));
          const nu = Math.log(Math.max(log_zn/Math.log(2),1e-16))/Math.log(2);
          t = (n+1-nu)/maxIter;
        } else {
          t = n/maxIter;
        }
        [r,g,b] = paletteColor(t,paletteEl.value);
      }
      img.data[p++] = r;
      img.data[p++] = g;
      img.data[p++] = b;
      img.data[p++] = 255;
    }
  }
  ctx.putImageData(img,0,0);
  statusEl.textContent = "Done";
}

let touchData = null;
canvas.addEventListener('touchstart', e=>{
  if(e.touches.length===1){
    touchData = { mode:'pan', x:e.touches[0].clientX, y:e.touches[0].clientY };
  } else if(e.touches.length===2){
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    touchData = {
      mode:'zoom',
      startDist: Math.sqrt(dx*dx+dy*dy),
      startScale: view.scale
    };
  }
});
canvas.addEventListener('touchmove', e=>{
  e.preventDefault();
  if(!touchData) return;
  if(touchData.mode==='pan' && e.touches.length===1){
    const dx = (e.touches[0].clientX - touchData.x) / canvas.width * view.scale;
    const dy = (e.touches[0].clientY - touchData.y) / canvas.height * view.scale;
    view.cx -= dx;
    view.cy -= dy;
    touchData.x = e.touches[0].clientX;
    touchData.y = e.touches[0].clientY;
    renderFractal();
  } else if(touchData.mode==='zoom' && e.touches.length===2){
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const dist = Math.sqrt(dx*dx+dy*dy);
    const zoomFactor = touchData.startDist / dist;
    view.scale = touchData.startScale * zoomFactor;
    renderFractal();
  }
},{passive:false});
canvas.addEventListener('touchend', ()=>{ touchData=null; });

renderBtn.onclick = ()=>renderFractal();
resetBtn.onclick = ()=>{ view={cx:-0.5,cy:0,scale:3.0}; renderFractal(); };
downloadBtn.onclick = ()=>{
  const a=document.createElement('a');
  a.href = canvas.toDataURL();
  a.download = 'fractal.png';
  a.click();
};
presetBtn.onclick = ()=>{
  const p=[{r:-0.8,i:0.156},{r:-0.70176,i:-0.3842},{r:-0.4,i:0.6},{r:0.285,i:0.01}][Math.floor(Math.random()*4)];
  crealEl.value = p.r; cimagEl.value = p.i; modeEl.value='julia'; modeTxt.textContent='Julia';
  renderFractal();
};
modeEl.onchange=()=>{ modeTxt.textContent = modeEl.value==='mandelbrot'?'Mandelbrot':'Julia'; renderFractal(); };
maxIterEl.oninput=()=>{ iterLabel.textContent = maxIterEl.value; renderFractal(); };
paletteEl.onchange=()=>renderFractal();
smoothEl.onchange=()=>renderFractal();

renderFractal();