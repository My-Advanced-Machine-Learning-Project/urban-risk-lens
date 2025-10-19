/* ===================== Full-screen base ===================== */
#root { max-width: none !important; margin: 0 !important; padding: 0 !important; text-align: initial !important; }
.logo { height: 6em; padding: 1.5em; will-change: filter; transition: filter 300ms; }
.logo:hover { filter: drop-shadow(0 0 2em #646cffaa); }
.logo.react:hover { filter: drop-shadow(0 0 2em #61dafbaa); }
@keyframes logo-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
@media (prefers-reduced-motion: no-preference){ a:nth-of-type(2) .logo{ animation: logo-spin infinite 20s linear; } }
.card{ padding:2em; } .read-the-docs{ color:#888; }

/* ===================== Palette ===================== */
:root{
  --map-c1:#e9e2b0; --map-c2:#dcc38b; --map-c3:#c99a66; --map-c4:#b56550; --map-c5:#7a1f1d;
  --scat-c1:var(--map-c1); --scat-c2:var(--map-c2); --scat-c3:var(--map-c3); --scat-c4:var(--map-c4); --scat-c5:var(--map-c5);
  --card-bg: hsl(222.2 84% 4.9% / .98); --card-fg: hsl(210 40% 98%); --card-border: hsl(217.2 32.6% 17.5% / .5); --muted: hsl(215.4 16.3% 56.9%);
}

/* ===================== MAP LEGEND ===================== */
/* Konteyner her nerede ise üstte kalsın */
.map-legend{ position: relative; z-index: 1000; }
.maplibregl-control-container .map-legend{ position: relative; z-index: 1000; }

/* Kart */
.map-legend .legend-card{
  background: var(--card-bg); color: var(--card-fg);
  backdrop-filter: blur(12px); border-radius: 12px;
  padding: 16px 18px; max-width: 300px;
  box-shadow: 0 8px 32px rgba(0,0,0,.6); border: 1px solid var(--card-border);
}
.map-legend .legend-header{ display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
.map-legend .legend-title{ font-weight:600; font-size:16px; letter-spacing:.01em; }

/* Satırlar: tag bağımsız (div/li/p/span…) */
.map-legend .legend-card > *{ /* header, satırlar, alt yazı – özel kurallar altta */
}
.map-legend .legend-rows > *,              /* eğer satırlar özel wrapper içindeyse */
.map-legend .legend-card > .legend-item,   /* klasik */
.map-legend .legend-card > li,             /* doğrudan li */
.map-legend .legend-card > p,              /* doğrudan p */
.map-legend .legend-card > div:not(.legend-header):not(.legend-sub) /* genel */
{
  display:flex; align-items:center; gap:12px; margin:10px 0; position:relative; color:var(--muted); font-size:14px;
}

/* Swatch: varsa */
.map-legend .legend-swatch{
  width:46px; height:26px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,.3);
  border:1px solid rgba(255,255,255,.12); flex-shrink:0;
}
/* Swatch: yoksa pseudo-element ile enjekte et */
.map-legend .legend-card > .legend-item::before,
.map-legend .legend-card > li::before,
.map-legend .legend-card > p::before,
.map-legend .legend-card > div:not(.legend-header):not(.legend-sub)::before,
.map-legend .legend-rows > *::before{
  content:""; display:inline-block; width:46px; height:26px; border-radius:8px;
  box-shadow:0 2px 6px rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.12); flex-shrink:0;
}

/* Renkleri sıraya göre ata (5 sınıf) */
.map-legend .legend-card > *:nth-of-type(1)::before,
.map-legend .legend-rows > *:nth-of-type(1)::before,
.map-legend .legend-item:nth-of-type(1) .legend-swatch{ background: var(--map-c1) !important; }

.map-legend .legend-card > *:nth-of-type(2)::before,
.map-legend .legend-rows > *:nth-of-type(2)::before,
.map-legend .legend-item:nth-of-type(2) .legend-swatch{ background: var(--map-c2) !important; }

.map-legend .legend-card > *:nth-of-type(3)::before,
.map-legend .legend-rows > *:nth-of-type(3)::before,
.map-legend .legend-item:nth-of-type(3) .legend-swatch{ background: var(--map-c3) !important; }

.map-legend .legend-card > *:nth-of-type(4)::before,
.map-legend .legend-rows > *:nth-of-type(4)::before,
.map-legend .legend-item:nth-of-type(4) .legend-swatch{ background: var(--map-c4) !important; }

.map-legend .legend-card > *:nth-of-type(5)::before,
.map-legend .legend-rows > *:nth-of-type(5)::before,
.map-legend .legend-item:nth-of-type(5) .legend-swatch{ background: var(--map-c5) !important; }

.map-legend .legend-label{ font-size:14px; font-weight:400; color:var(--muted); letter-spacing:.01em; }
.map-legend .legend-sub{ font-size:12px; opacity:.9; margin-top:12px; padding-top:12px; border-top:1px solid var(--card-border); color:var(--muted); }

@media (max-width:768px){
  .map-legend .legend-card{ padding:10px 12px; max-width:240px; }
}

/* ===================== SCATTER LEGEND ===================== */
.scatter-legend-vertical{ display:flex; flex-direction:column; gap:8px; padding:12px 14px; background: rgba(30,41,59,.95);
  border:1px solid rgba(255,255,255,.2); border-radius:10px; box-shadow:0 6px 24px rgba(0,0,0,.5); min-width:150px; z-index: 900; }

 /* Satırlar: hangi tag olursa olsun */
.scatter-legend-vertical > *{ display:flex; align-items:center; gap:10px; font-size:13px; position:relative; list-style:none; }
.scatter-legend-vertical .legend-label{ white-space:nowrap; color:#f1f5f9; font-weight:600; font-size:13px; }

/* Swatch varsa: */
.scatter-legend-vertical .legend-swatch{
  width:18px; height:18px; border-radius:50%; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.5); flex-shrink:0;
}
/* Swatch yoksa pseudo-element: */
.scatter-legend-vertical > *::before{
  content:""; display:inline-block; width:18px; height:18px; border-radius:50%;
  border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,.5); flex-shrink:0;
}

/* Renk sırası (Çok Düşük → Çok Yüksek) */
.scatter-legend-vertical > *:nth-of-type(1)::before,
.scatter-legend-vertical > *:nth-of-type(1) .legend-swatch{ background: var(--scat-c1) !important; }
.scatter-legend-vertical > *:nth-of-type(2)::before,
.scatter-legend-vertical > *:nth-of-type(2) .legend-swatch{ background: var(--scat-c2) !important; }
.scatter-legend-vertical > *:nth-of-type(3)::before,
.scatter-legend-vertical > *:nth-of-type(3) .legend-swatch{ background: var(--scat-c3) !important; }
.scatter-legend-vertical > *:nth-of-type(4)::before,
.scatter-legend-vertical > *:nth-of-type(4) .legend-swatch{ background: var(--scat-c4) !important; }
.scatter-legend-vertical > *:nth-of-type(5)::before,
.scatter-legend-vertical > *:nth-of-type(5) .legend-swatch{ background: var(--scat-c5) !important; }

/* ===================== Map popup ===================== */
.map-popup .maplibregl-popup-content{ padding:10px 12px !important; border-radius:12px !important; max-width:280px !important; }
.map-popup h3{ font-size:15px; font-weight:700; margin:0 0 6px; }
.map-popup p{ font-size:12px; opacity:.8; margin:0 0 8px; }
.map-popup .row{ display:flex; justify-content:space-between; margin:4px 0; font-size:13px; }
.map-popup .btn{ width:100%; margin-top:8px; padding:6px 10px; font-size:12px; font-weight:600; background:#3b82f6; color:#fff; border:none; border-radius:8px; cursor:pointer; transition:all .2s; }
.map-popup .btn:hover{ background:#2563eb; transform: translateY(-1px); }
@media (max-width:768px){ .map-popup .maplibregl-popup-content{ max-width:240px !important; } .map-popup h3{ font-size:14px;} .map-popup .row{ font-size:12px;} }
