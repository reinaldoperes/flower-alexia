onload = () => {
  const c = setTimeout(() => {
    document.body.classList.remove("not-loaded");
    clearTimeout(c);
  }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
  const far  = document.querySelector('.stars--far');
  const mid  = document.querySelector('.stars--mid');
  const near = document.querySelector('.stars--near');
  const night = document.querySelector('.night');
  if (!far || !mid || !near || !night) return;

  // Paleta com pesos (estética)
  const palette = [
    { hex: '#a8c8ff', weight: 0.18 }, // azul-branca
    { hex: '#ffffff', weight: 0.32 }, // branca
    { hex: '#fff3c2', weight: 0.24 }, // amarelo-branca
    { hex: '#ffd27a', weight: 0.16 }, // amarela
    { hex: '#ffb38a', weight: 0.08 }, // laranja
    { hex: '#ff9b8a', weight: 0.02 }  // avermelhada
  ];

  function pickColor() {
    const total = palette.reduce((a, p) => a + p.weight, 0);
    let r = Math.random() * total;
    for (const p of palette) {
      if ((r -= p.weight) <= 0) return p.hex;
    }
    return palette[0].hex;
  }

  function createStars(container, count, opts) {
    const {
      minSize = 0.16,     // em vmin
      maxSize = 1.00,
      twinkleMin = 2.5,   // em s
      twinkleMax = 6.0,
      opacityBase = 0.22, // 0–1
      sizeGamma = 1.6     // curva de distribuição (maiores valores = mais estrelas pequenas)
    } = opts || {};

    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'star';

      // posição
      el.style.left = `${Math.random() * 100}vw`;
      el.style.top  = `${Math.random() * 100}vh`;

      // tamanho (distribuição enviesada p/ pequenas)
      const t = Math.pow(Math.random(), sizeGamma);
      const size = minSize + t * (maxSize - minSize);
      el.style.setProperty('--size', `${size.toFixed(2)}vmin`);

      // cor/glow
      const color = pickColor();
      el.style.setProperty('--c', color);
      el.style.setProperty('--glow', color);

      // opacidade base ajustada pelo tamanho
      const op = opacityBase + Math.min(size / 1.2, 0.55);
      el.style.setProperty('--opacity', op.toFixed(2));

      // twinkle
      const dur = twinkleMin + Math.random() * (twinkleMax - twinkleMin);
      el.style.setProperty('--dur', `${dur.toFixed(2)}s`);
      el.style.setProperty('--delay', `${(Math.random() * 3).toFixed(2)}s`);
      el.style.setProperty('--s', (0.9 + Math.random() * 0.6).toFixed(2));

      container.appendChild(el);
    }
  }

  // Quantidade e perfil por camada
  createStars(far,  140, { minSize: 0.14, maxSize: 0.42, twinkleMin: 3.5, twinkleMax: 7.0, opacityBase: 0.18, sizeGamma: 1.8 });
  createStars(mid,  100, { minSize: 0.18, maxSize: 0.70, twinkleMin: 2.8, twinkleMax: 6.0, opacityBase: 0.22, sizeGamma: 1.6 });
  createStars(near,  70, { minSize: 0.24, maxSize: 1.10, twinkleMin: 2.0, twinkleMax: 4.2, opacityBase: 0.26, sizeGamma: 1.4 });

  /* ===== Estrelas cadentes ocasionais ===== */
  function spawnShootingStar() {
    const el = document.createElement('span');
    el.className = 'shooting-star';

    // spawn entre 10vmin e 70vmin de altura
    const sy = 10 + Math.random() * 60;
    el.style.setProperty('--sx', `${-12 + Math.random() * 6}vmin`); // um pouco antes da borda esquerda
    el.style.setProperty('--sy', `${sy}vmin`);

    // duração e ângulo
    el.style.setProperty('--time', `${(0.9 + Math.random() * 1.2).toFixed(2)}s`);
    el.style.setProperty('--deg', `${-30 - Math.random() * 12}deg`);

    // cor
    el.style.setProperty('--c', pickColor());

    night.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  // loop com jitter — média ~1 estrela a cada 6–10s
  (function shootingLoop() {
    const nextIn = 4000 + Math.random() * 6000; // 4–10s
    setTimeout(() => {
      // 65% de chance de realmente spawnar neste tick
      if (Math.random() < 0.65) spawnShootingStar();
      shootingLoop();
    }, nextIn);
  })();
});

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
  const WORKER_URL = 'https://unpkg.com/gif.js@0.2.0/dist/gif.worker.js';

  const btn = document.getElementById(BTN_ID);
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

  async function recordTab(seconds = DURATION_SEC){
    // pede permissão pra capturar a ABA atual
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 60 },
        // dicas p/ Chrome escolher a aba atual (ignorados em outros)
        displaySurface: 'browser',
        cursor: 'never'
      },
      audio: false
    });

    return new Promise((resolve, reject) => {
      const chunks = [];
      const mimeOptions = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      let rec = null;
      for (const t of mimeOptions) {
        if (MediaRecorder.isTypeSupported(t)) { rec = new MediaRecorder(stream, { mimeType: t, videoBitsPerSecond: 4_000_000 }); break; }
      }
      if (!rec) { stream.getTracks().forEach(t => t.stop()); reject(new Error('MediaRecorder não suportado')); return; }

      const stopAll = () => stream.getTracks().forEach(t => t.stop());

      const timer = setTimeout(() => { try { rec.stop(); } catch(_){} }, seconds * 1000);
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => { clearTimeout(timer); stopAll(); resolve(new Blob(chunks, { type: chunks[0]?.type || 'video/webm' })); };
      rec.onerror = (e) => { clearTimeout(timer); stopAll(); reject(e.error || e.name || e); };
      rec.start(100); // fragmenta ~100ms
    });
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
