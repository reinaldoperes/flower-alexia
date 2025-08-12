onload = () => {
  const c = setTimeout(() => {
    document.body.classList.remove("not-loaded");
    clearTimeout(c);
  }, 1000);
};

async function ensureGifJs(){
  if (window.GIF) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/gif.js@0.2.0/dist/gif.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

(function initStarCanvas(){
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W=0, H=0, stars=[];

  // densidades (ajuste aqui pra “mais/menos estrelas”)
  const DESKTOP_DENSITY = 220;   // estrelas dinâmicas em 1080p
  const LITE_DENSITY    = 120;   // idem no modo lite
  const STATIC_SPRINKLE = 1400;  // estrelas ESTÁTICAS em 1080p

  // heurística de lite (igual à sua)
  const isLite =
    matchMedia('(pointer: coarse)').matches ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    Math.min(screen.width, screen.height) <= 420 ||
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (isLite) document.body.classList.add('lite');

  // offscreen p/ o tapete estático
  const bg = document.createElement('canvas');
  let bgDirty = true;

  function resize(){
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    // sincroniza o offscreen e reconstrói tudo
    bg.width  = canvas.width;
    bg.height = canvas.height;
    buildBackdrop();
    buildStars();
  }

  const palette = ['#a8c8ff','#ffffff','#fff3c2','#ffd27a','#ffb38a','#ff9b8a'];
  const weights = [0.18,0.32,0.24,0.16,0.08,0.02];
  function pickColor(){
    let r = Math.random(), acc = 0;
    for (let i=0;i<palette.length;i++){ acc += weights[i]; if (r<=acc) return palette[i]; }
    return palette[0];
  }
  function rgb(c){ const n = parseInt(c.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }

  // 1) tapete ESTÁTICO (muitas estrelas baratinhas)
  function buildBackdrop(){
    const b = bg.getContext('2d');
    b.clearRect(0,0,bg.width,bg.height);
    b.globalCompositeOperation = 'lighter';

    const area = (W*H)/(1920*1080);
    const count = Math.round(STATIC_SPRINKLE * Math.max(0.6, area));

    for (let i=0;i<count;i++){
      const layer = Math.random();                    // profundidade visual
      const [r,g,bch] = rgb(pickColor());
      const alpha = 0.10 + 0.22*layer;                // bem suaves
      const radius = Math.max(0.4, (0.35 + Math.random()*0.5) * (0.6 + layer)) * DPR;

      const x = Math.random()*bg.width;
      const y = Math.random()*bg.height;

      b.beginPath();
      b.arc(x, y, radius, 0, Math.PI*2);
      b.fillStyle = `rgba(${r},${g},${bch},${alpha})`;
      b.fill();
    }

    b.globalCompositeOperation = 'source-over';
    bgDirty = false;
  }

  // 2) estrelas DINÂMICAS (twinkle)
  function buildStars(){
    const area = (W*H)/(1920*1080);
    const baseDensity = isLite ? LITE_DENSITY : DESKTOP_DENSITY;
    const count = Math.round(baseDensity * Math.max(0.6, area));

    stars = new Array(count).fill(0).map(() => {
      const layer = Math.random(); // 0..1 (longe→perto)
      const sizePx = (isLite ? 0.9 : 1.1) * (0.4 + Math.pow(Math.random(), 1.4) * 1.3); // ~0.4–2.1
      const r = Math.max(0.6, sizePx * (0.7 + layer)) * DPR; // >=0.6px
      const col = rgb(pickColor());
      return {
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r,
        c: col,
        a: 0.28 + 0.6*layer,                   // alpha base um pouco maior
        tw: (isLite?0.35:0.65) + Math.random()*0.7,
        ph: Math.random()*Math.PI*2,
        sp: 0.02 + 0.05*layer
      };
    });
  }

  resize();
  addEventListener('resize', resize);

  // estrela cadente (igual à sua)
  let shooting = null;
  let nextShootAt = performance.now() + 4000 + Math.random()*6000;
  function maybeSpawnShootingStar(now){
    if (isLite) return;
    if (now < nextShootAt || shooting) return;
    nextShootAt = now + 6000 + Math.random()*8000;

    const startX = -80 * DPR;
    const startY = (canvas.height * (0.15 + Math.random()*0.6)) | 0;
    const speed  = (350 + Math.random()*250) * DPR;
    const angle  = (-35 - Math.random()*12) * Math.PI/180;
    shooting = {
      x: startX, y: startY, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      life: 900, col: rgb(pickColor())
    };
  }

  function step(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // desenha o tapete estático (1 drawImage — baratíssimo)
    if (bgDirty) buildBackdrop();
    ctx.drawImage(bg, 0, 0);

    // estrelas dinâmicas “somando luz”
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars){
      s.ph += s.tw * 0.016;
      const tw = 0.6 + 0.4 * Math.sin(s.ph);
      const alpha = s.a * tw;

      s.x += s.sp;
      if (s.x > canvas.width + 5) s.x = -5;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${Math.min(1, alpha).toFixed(3)})`;
      ctx.fill();
    }

    // estrela cadente
    const now = performance.now();
    maybeSpawnShootingStar(now);
    if (shooting){
      const dt = 16;
      shooting.life -= dt;
      shooting.x += shooting.vx*(dt/1000);
      shooting.y += shooting.vy*(dt/1000);

      const trail = 120 * DPR, headR = 1.8 * DPR;
      const [r,g,b] = shooting.col;

      const ang = Math.atan2(shooting.vy, shooting.vx);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`;
      ctx.lineWidth = 0.9 * DPR;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(shooting.x - Math.cos(ang)*trail, shooting.y - Math.sin(ang)*trail);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(shooting.x, shooting.y, headR, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.fill();

      if (shooting.life <= 0 || shooting.x > canvas.width + trail || shooting.y < -trail) shooting = null;
    }

    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

async function recordIntro(seconds = DURATION_SEC){
  // pausa tudo para reiniciar no frame 0
  document.body.classList.add('not-loaded');

  // pede a captura da ABA atual
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: { ideal: 30, max: 60 }, displaySurface: 'browser', cursor: 'never' },
    audio: false
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const mimeOptions = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
    let rec = null;
    for (const t of mimeOptions) {
      if (MediaRecorder.isTypeSupported(t)) { rec = new MediaRecorder(stream, { mimeType: t, videoBitsPerSecond: 4_000_000 }); break; }
    }
    if (!rec) { stream.getTracks().forEach(t=>t.stop()); return reject(new Error('MediaRecorder não suportado')); }

    const stopAll = () => stream.getTracks().forEach(t => t.stop());

    // quando a gravação de fato começa, destrava a animação no T=0
    rec.onstart = () => {
      // um pequeno atraso garante que o buffer já esteja valendo
      setTimeout(() => {
        // força reflow (opcional) e solta a animação
        void document.body.offsetWidth;
        document.body.classList.remove('not-loaded');
      }, 120);
    };

    const timer = setTimeout(() => { try { rec.stop(); } catch(_){} }, seconds * 1000);
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => { clearTimeout(timer); stopAll(); resolve(new Blob(chunks, { type: chunks[0]?.type || 'video/webm' })); };
    rec.onerror = (e) => { clearTimeout(timer); stopAll(); reject(e.error || e.name || e); };

    rec.start(100);
  });
}

(() => {
  const BTN_ID = 'captureGifBtn';
  const TOAST_ID = 'captureToast';
  const MAX_WIDTH = 720;          // limita largura do GIF
  const FPS = 12;                 // frames/seg no GIF
  const DURATION_SEC = 6;         // duração gravada

  const btn = document.getElementById(BTN_ID);

  const supportsCapture = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  const isiOS = /iP(hone|ad|od)/i.test(navigator.userAgent);

  const autoLite =
  (!isiOS && (   matchMedia('(pointer: coarse)').matches
              || (navigator.deviceMemory && navigator.deviceMemory <= 4)
              || Math.min(screen.width, screen.height) <= 420))
  || matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (autoLite) document.body.classList.add('lite');

  // Em iOS (ou navegadores sem suporte), mostramos desabilitado com dica
  if (!supportsCapture || isiOS) {
    btn.disabled = true;
    btn.title = 'Captura de GIF não suportada neste dispositivo/navegador. Use um desktop (Chrome/Edge).';
  }

  const toast = document.getElementById(TOAST_ID);
  if (!btn || !toast) return;

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
  }
  function hideToast(){
    toast.classList.remove('show');
    toast.textContent = '';
  }
  function downloadBlob(blob, filename){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  // Substitua as constantes do worker por esta versão:
  const WORKER_URL_SRC = 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js';
  let GIF_WORKER_BLOB_URL = null;

  // Gera um Worker “same-origin” via Blob para evitar SecurityError em origin:null
  async function ensureGifWorkerURL() {
    if (GIF_WORKER_BLOB_URL) return GIF_WORKER_BLOB_URL;
    const res = await fetch(WORKER_URL_SRC, { cache: 'force-cache' });
    if (!res.ok) throw new Error('Falha ao carregar gif.worker.js');
    const code = await res.text();
    const blob = new Blob([code], { type: 'text/javascript' });
    GIF_WORKER_BLOB_URL = URL.createObjectURL(blob);
    return GIF_WORKER_BLOB_URL;
  }

  async function webmToGif(webmBlob, { fps = FPS, maxWidth = MAX_WIDTH } = {}){
    // cria <video> off-DOM p/ ler frames
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(webmBlob);

    // aguarda metadados pra ter videoWidth/Height válidos
    await new Promise(res => {
      if (video.readyState >= 1) return res();
      video.onloadedmetadata = () => res();
    });

    await video.play();

    // calcula escala
    const scale = Math.min(1, maxWidth / (video.videoWidth || 1));
    const width = Math.max(1, Math.floor((video.videoWidth || 1) * scale));
    const height = Math.max(1, Math.floor((video.videoHeight || 1) * scale));

    // canvas p/ extrair frames
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;

    const workerUrl = await ensureGifWorkerURL();
    // instancia o encoder
    const gif = new GIF({
      workers: 2,
      quality: 10,          // menor = melhor (e mais lento)
      workerScript: workerUrl,
      width, height,
      repeat: 1,
      dither: true
    });

    const delay = Math.round(1000 / fps);
    const totalMs = video.duration * 1000;
    const step = 1000 / fps;

    // tenta usar requestVideoFrameCallback p/ sincronizar
    const supportsRVFC = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    showToast('Convertendo para GIF...');
    if (supportsRVFC) {
      let lastTime = 0;
      const onFrame = (_now, meta) => {
        const t = meta.mediaTime * 1000;
        if (t - lastTime >= step - 2) {
          ctx.drawImage(video, 0, 0, width, height);
          gif.addFrame(ctx, { copy: true, delay });
          lastTime = t;
        }
        if (!video.ended && t < totalMs) {
          video.requestVideoFrameCallback(onFrame);
        }
      };
      video.requestVideoFrameCallback(onFrame);
      await new Promise(resolve => video.onended = resolve);
    } else {
      // fallback: avança o tempo via setInterval
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (video.ended || video.paused) {
            clearInterval(interval);
            resolve();
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          gif.addFrame(ctx, { copy: true, delay });
        }, step);
        video.onended = () => { clearInterval(interval); resolve(); };
      });
    }

    URL.revokeObjectURL(video.src);

    return new Promise((resolve) => {
      gif.on('finished', (blob) => resolve(blob));
      gif.render();
    });
  }

  btn.addEventListener('click', async () => {
    await ensureGifJs();

    btn.disabled = true;
    document.body.classList.add('capturing');
    showToast('Gravando animação...');

    try {
      // const webm = await recordTab(DURATION_SEC);
      const webm = await recordIntro(DURATION_SEC);
      const gifBlob = await webmToGif(webm, { fps: FPS, maxWidth: MAX_WIDTH });
      downloadBlob(gifBlob, 'flor-animada.gif');
      showToast('GIF pronto! 🎉');
      setTimeout(hideToast, 2500);
    } catch (err) {
      console.error(err);
      showToast('Falha ao gerar GIF (permissão negada ou navegador não suportado).');
      setTimeout(hideToast, 3500);
    } finally {
      btn.disabled = false;
      document.body.classList.remove('capturing');
    }
  });
})();

(function(){
  const perfBtn = document.getElementById('perfToggle');
  if (!perfBtn) return;

  // estado inicial: respeita localStorage, senão heurística já aplicou
  const saved = localStorage.getItem('pref-mode'); // 'lite' | 'full' | null
  if (saved === 'lite') document.body.classList.add('lite');
  if (saved === 'full') document.body.classList.remove('lite');

  function refreshLabel(){
    const lite = document.body.classList.contains('lite');
    perfBtn.setAttribute('aria-pressed', lite ? 'true' : 'false');
    perfBtn.textContent = lite ? '⚡ Lite' : '✨ Full';
    perfBtn.title = lite ? 'Desativar modo leve' : 'Ativar modo leve';
  }
  refreshLabel();

  perfBtn.addEventListener('click', () => {
    const nowLite = !document.body.classList.contains('lite');
    document.body.classList.toggle('lite', nowLite);
    localStorage.setItem('pref-mode', nowLite ? 'lite' : 'full');
    refreshLabel();
  });
})();
