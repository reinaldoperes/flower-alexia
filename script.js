onload = () => {
  const c = setTimeout(() => {
    document.body.classList.remove("not-loaded");
    clearTimeout(c);
  }, 1000);
};

document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.stars');
  if (!container) return;

  const STAR_COUNT = 180; // densidade

  // Paleta "temperatura" com pesos (estética, não astronômica estrita)
  const palette = [
    { hex: '#a8c8ff', weight: 0.18 }, // azul-branca (quentes)
    { hex: '#ffffff', weight: 0.32 }, // branca
    { hex: '#fff3c2', weight: 0.24 }, // amarelo-branca
    { hex: '#ffd27a', weight: 0.16 }, // amarela
    { hex: '#ffb38a', weight: 0.08 }, // laranja
    { hex: '#ff9b8a', weight: 0.02 }  // avermelhada (poucas e discretas)
  ];

  // sorteio ponderado por peso
  function pickColor() {
    const total = palette.reduce((a, p) => a + p.weight, 0);
    let r = Math.random() * total;
    for (const p of palette) {
      if ((r -= p.weight) <= 0) return p.hex;
    }
    return palette[0].hex;
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    const el = document.createElement('span');
    el.className = 'star';

    // posição
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top  = `${Math.random() * 100}vh`;

    // tamanho (vmin) — pequenas são maioria
    const size = 0.18 + Math.pow(Math.random(), 1.6) * 0.9; // 0.18–1.08 vmin
    el.style.setProperty('--size', `${size.toFixed(2)}vmin`);

    // cor e glow
    const color = pickColor();
    el.style.setProperty('--c', color);
    el.style.setProperty('--glow', color);

    // opacidade e “twinkle” variáveis (estrelas maiores costumam brilhar mais)
    const opacityBase = 0.18 + Math.min(size / 1.2, 0.55); // 0.18–0.73 aprox
    el.style.setProperty('--opacity', opacityBase.toFixed(2));

    // duração da cintilação: estrelas menores piscam mais devagar
    const dur = (size < 0.45)
      ? 3.4 + Math.random() * 2.6   // 3.4–6.0s
      : 2.0 + Math.random() * 2.2;  // 2.0–4.2s
    el.style.setProperty('--dur', `${dur.toFixed(2)}s`);

    // atraso e escala base
    el.style.setProperty('--delay', `${(Math.random() * 3).toFixed(2)}s`);
    el.style.setProperty('--s', (0.9 + Math.random() * 0.6).toFixed(2));

    container.appendChild(el);
  }
});