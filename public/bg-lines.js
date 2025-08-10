/* === Parametry =========================================================== */
const HORIZON        = 0.28;     // relativní Y horizontu (0–1)
const ROAD_W_MIN     = 0.01;     // půl-šířka vozovky na horizontu (v % šířky)
const ROAD_W_MAX     = 0.58;     // půl-šířka vozovky dole
const SPEED          = 0.002;            // Rychlost jízdy (v normalizovaném prostoru 0-1 za sekundu)
const NUM_DASHES     = 15;              // Počet cyklů čára+mezera na obrazovce


/* === Plátno & téma ======================================================= */
const canvas = document.getElementById('bg-lines');
const ctx    = canvas.getContext('2d', { alpha: false });

let theme, prefersReduced, lastT = 0;
let roadOffset = 0;

function resize() {
  const { innerWidth:w, innerHeight:h, devicePixelRatio:r } = window;
  canvas.width  = w * r;
  canvas.height = h * r;
  ctx.setTransform(r, 0, 0, r, 0, 0);
}
function getTheme() {
  const dark = document.documentElement.classList.contains('dark');
  return dark
    ? { bg:'#1e1e1e', road:'#2d2d2d', edge:'#fafafa', dash:'#dcdcdc' }
    : { bg:'#f7f9fc', road:'#e5e7eb', edge:'#555',   dash:'#777'   };
}
function applyTheme(){ theme = getTheme(); }
new MutationObserver(applyTheme)
  .observe(document.documentElement,{attributes:true,attributeFilter:['class']});

/* === Pomocné funkce ====================================================== */
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const lerp =(a,b,t)=>a+(b-a)*t;
// Agresivnější perspektivní funkce pro výraznější efekt
const perspZ = z => Math.pow(clamp(z, 0, 1), 2.9);
const halfRoad = z => lerp(innerWidth * ROAD_W_MIN, innerWidth * ROAD_W_MAX, perspZ(z));

/* ========== KRAJNÍ ČÁRY ========== */
const EDGE_MIN_PX = 1;     // tloušťka krajní čáry na horizontu
const EDGE_MAX_PX = 88;    // tloušťka u spodního okraje (doladíte očima)

const edgeW    = z => lerp(EDGE_MIN_PX, EDGE_MAX_PX, perspZ(z));

/* === Hlavní draw smyčka ================================================ */
function draw(t){
  if(prefersReduced || !theme) return;
  if (!lastT) lastT = t;
  const dt = (t - lastT) / 1000;
  lastT = t;

  // Pozadí
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const h = innerHeight;
  const w = innerWidth;
  const horizonY = HORIZON * h;

  // Vozovka
  ctx.fillStyle = theme.road;
  ctx.beginPath();
  ctx.moveTo(w/2 - halfRoad(1), h);
  ctx.lineTo(w/2 - halfRoad(0), horizonY);
  ctx.lineTo(w/2 + halfRoad(0), horizonY);
  ctx.lineTo(w/2 + halfRoad(1), h);
  ctx.closePath();
  ctx.fill();

  /* --- KRAJNÍ ČÁRY ----------------------------------------------------- */
  ctx.fillStyle = theme.edge;
  [-1, 1].forEach(side => {
    // Mezera mezi okrajem vozovky a vnější hranou čáry
    const marginH = edgeW(0) * 1.0;
    const marginB = edgeW(1) * 1.0;

    // Vnější hrana čáry je posunuta od kraje vozovky
    const roadEdgeH = w/2 + side * halfRoad(0);
    const roadEdgeB = w/2 + side * halfRoad(1);
    const oxH = roadEdgeH - side * marginH;
    const oxB = roadEdgeB - side * marginB;
    
    // Vnitřní hrana je posunuta dále do středu o šířku čáry
    const ixH = oxH - side * edgeW(0);
    const ixB = oxB - side * edgeW(1);

    ctx.beginPath();
    ctx.moveTo(ixB, h);
    ctx.lineTo(oxB, h);
    ctx.lineTo(oxH, horizonY);
    ctx.lineTo(ixH, horizonY);
    ctx.closePath();
    ctx.fill();
  });

  /* === Středová přerušovaná – NOVÁ VERZE ================================ */
  roadOffset = (roadOffset + SPEED * dt) % 1;

  // kolik pixelů má nejkratší a nejdelší úsečka
  const DASH_PX_MIN = 4;
  const DASH_PX_MAX = 300;

  // krok v P-prostoru (0 = horizont, 1 = spodní hrana)
  // menší krok → víc segmentů, plynulejší efekt
  const P_STEP = 0.005;

  /**
   * Výška (v px) daná perspektivou.
   *  p == 0 … horizont  →  DASH_PX_MIN
   *  p == 1 … dole      →  DASH_PX_MAX
   */
  const dashHeight = p => lerp(DASH_PX_MIN, DASH_PX_MAX, p);

  /**
   * Polovina tloušťky čáry (šířky) v px.
   *  p == 0 … horizont  →  1 px
   *  p == 1 … dole      →  44 px  (lze změnit v SLICE_MAX)
   */
  const SLICE_MIN = 0.5;
  const SLICE_MAX = 44;
  const dashHalfW = p => lerp(SLICE_MIN, SLICE_MAX, p);

  /* ---- vykreslení ------------------------------------------------------- */
  // Začínáme kreslit už od p = -1, abychom plynule generovali nové čáry
  // přicházející od horizontu. roadOffset (0-1) určuje fázi animace.
  let p = roadOffset - 1;
  while (p < 1) {
    // Vypočítáme pozici dalšího segmentu. Používáme clamp, aby p_calc
    // nebylo záporné, což by vedlo k chybnému výpočtu výšky.
    const p_calc = Math.max(0, p);
    const segmentH = dashHeight(p_calc) / (innerHeight - horizonY);
    const pTop = p;
    const pBottom = p + segmentH;

    // Vykreslíme pouze segmenty, které jsou alespoň částečně viditelné.
    if (pBottom > 0) {
      const pTopClamped = Math.max(0, pTop);
      const pBottomClamped = Math.min(1, pBottom);

      if (pBottomClamped > pTopClamped) {
        const yTop    = lerp(horizonY, innerHeight, pTopClamped);
        const yBottom = lerp(horizonY, innerHeight, pBottomClamped);
        const wTop    = dashHalfW(pTopClamped);
        const wBottom = dashHalfW(pBottomClamped);

        ctx.beginPath();
        ctx.moveTo(innerWidth/2 - wBottom, yBottom);
        ctx.lineTo(innerWidth/2 + wBottom, yBottom);
        ctx.lineTo(innerWidth/2 + wTop,    yTop);
        ctx.lineTo(innerWidth/2 - wTop,    yTop);
        ctx.closePath();
        ctx.fillStyle = theme.dash;
        ctx.fill();
      }
    }
    // Posuneme se na další úsečku. Mezera je 75 % délky čáry.
    p = pBottom + (segmentH * 0.75);
  }


  requestAnimationFrame(draw);
}

/* === Init =============================================================== */
prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
applyTheme(); resize();
addEventListener('resize', resize);
if(!prefersReduced) {
    requestAnimationFrame(draw);
} else {
    requestAnimationFrame(() => setTimeout(() => draw(0), 50));
}
