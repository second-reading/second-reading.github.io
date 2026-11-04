/* The "played" in the headline is a button: click it and a little breakout game takes over the
   page. Rows of blocks slide down from the top, a mouse-controlled paddle at the bottom, and a ball
   that comes down from the top. It ends when you lose the ball, clear the blocks, or right-click
   (which quits straight back to the page). Escape and the Quit button, top right, quit too.
   Touch works: drag to move, tap to play again. */
(() => {
  const btn = document.querySelector('.play-mark');
  if(!btn) return;

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const COLS = 10, ROWS = 6, SLIDE = 0.9;      // blocks per row, rows, seconds for the rows to slide in
  const touchy = matchMedia('(pointer: coarse)').matches;      // a phone or tablet: no right-click
  let wrap, cv, cx, raf, state;

  function open(){
    wrap = document.createElement('div');
    wrap.className = 'breakout';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Breakout. Move the mouse to steer the paddle. Right-click or Escape to quit.');
    cv = document.createElement('canvas');
    wrap.appendChild(cv);
    // A Quit button, top right, for anyone without a right-click (or who'd rather not).
    const q = document.createElement('button');
    q.type = 'button'; q.className = 'breakout-quit'; q.textContent = 'Quit \u00d7';
    q.addEventListener('click', e => { e.stopPropagation(); close(); });
    wrap.appendChild(q);
    document.body.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    cx = cv.getContext('2d');
    resize();
    addEventListener('resize', resize);
    wrap.addEventListener('mousemove', aim);
    wrap.addEventListener('touchmove', touch, {passive: false});
    wrap.addEventListener('touchstart', touch, {passive: false});
    wrap.addEventListener('click', click);
    wrap.addEventListener('contextmenu', quit);
    addEventListener('keydown', key);
    start();
  }

  function close(){
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('keydown', key);
    wrap.remove();
    document.body.style.overflow = '';
    btn.focus();
  }

  function resize(){
    const r = devicePixelRatio || 1;
    cv.width = innerWidth * r; cv.height = innerHeight * r;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    cx.setTransform(r, 0, 0, r, 0, 0);
    if(state) layout();
  }

  // Sizes follow the window, so it plays the same on a phone and a big screen.
  function layout(){
    const W = innerWidth, H = innerHeight, s = state;
    s.W = W; s.H = H;
    s.pad = Math.max(16, W * 0.06);
    s.bw = (W - s.pad * 2) / COLS; s.bh = Math.max(14, Math.min(28, H * 0.035));
    s.top = Math.max(70, H * 0.12);
    s.pw = Math.max(70, Math.min(160, W * 0.14)); s.ph = 12;
    s.py = H - Math.max(48, H * 0.08);
    s.r = Math.max(6, Math.min(10, W * 0.008));
    s.speed = Math.max(320, Math.min(560, H * 0.75));      // pixels a second, before it speeds up
  }

  function start(){
    state = {score: 0, over: null, t0: performance.now(), last: performance.now(), px: innerWidth / 2, hits: 0};
    layout();
    const s = state;
    s.blocks = [];
    for(let row = 0; row < ROWS; row++)
      for(let col = 0; col < COLS; col++)
        s.blocks.push({row, col, alive: true});
    // The ball comes down from the top, a little to one side.
    const a = (Math.random() < .5 ? -1 : 1) * (0.35 + Math.random() * 0.25);
    s.bx = s.W / 2; s.by = 10; s.vx = Math.sin(a); s.vy = Math.cos(a);
    s.launch = SLIDE;      // the ball waits until the blocks are in
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  const blockRect = (s, b, slide) => {
    // Each row slides down from above the screen to its place; lower rows land first.
    const k = Math.min(1, Math.max(0, (slide - (ROWS - 1 - b.row) * 0.08) / (SLIDE - (ROWS - 1) * 0.08)));
    const ease = 1 - Math.pow(1 - k, 3);
    const y = s.top + b.row * (s.bh + 6);
    return {x: s.pad + b.col * s.bw + 3, y: -s.bh + (y + s.bh) * ease, w: s.bw - 6, h: s.bh};
  };

  function frame(now){
    const s = state, dt = Math.min(0.033, (now - s.last) / 1000);
    s.last = now;
    const slide = (now - s.t0) / 1000;
    if(!s.over) step(s, dt, slide);
    draw(s, slide);
    raf = requestAnimationFrame(frame);
  }

  function step(s, dt, slide){
    if(slide < s.launch) return;
    const v = s.speed * (1 + Math.min(0.6, s.hits * 0.012));
    // Move in small pieces so a fast ball can't jump through a block.
    const n = Math.ceil(v * dt / (s.r * 0.8));
    for(let i = 0; i < n && !s.over; i++){
      s.bx += s.vx * v * dt / n; s.by += s.vy * v * dt / n;
      if(s.bx < s.r){ s.bx = s.r; s.vx = Math.abs(s.vx); }
      if(s.bx > s.W - s.r){ s.bx = s.W - s.r; s.vx = -Math.abs(s.vx); }
      if(s.by < s.r && s.vy < 0){ s.by = s.r; s.vy = Math.abs(s.vy); }
      // The paddle: where it hits sets the angle, like the original.
      const pl = s.px - s.pw / 2;
      if(s.vy > 0 && s.by + s.r >= s.py && s.by + s.r <= s.py + s.ph + 8 && s.bx >= pl - s.r && s.bx <= pl + s.pw + s.r){
        const off = Math.max(-1, Math.min(1, (s.bx - s.px) / (s.pw / 2)));
        const a = off * 1.05;
        s.vx = Math.sin(a); s.vy = -Math.cos(a);
        s.by = s.py - s.r;
      }
      for(const b of s.blocks){
        if(!b.alive) continue;
        const r = blockRect(s, b, SLIDE);
        if(s.bx + s.r < r.x || s.bx - s.r > r.x + r.w || s.by + s.r < r.y || s.by - s.r > r.y + r.h) continue;
        b.alive = false; s.hits++;
        s.score += (ROWS - b.row) * 10;
        // Bounce off whichever side it went in by.
        const ox = Math.min(s.bx + s.r - r.x, r.x + r.w - (s.bx - s.r));
        const oy = Math.min(s.by + s.r - r.y, r.y + r.h - (s.by - s.r));
        if(ox < oy) s.vx = -s.vx; else s.vy = -s.vy;
        break;
      }
      if(s.blocks.every(b => !b.alive)) s.over = 'cleared';
      else if(s.by - s.r > s.H) s.over = 'lost';
    }
  }

  function draw(s, slide){
    const ink = css('--ink') || '#14201b', page = css('--page') || '#ece6d4', pen = css('--pen') || '#e3f23c',
          dim = css('--dim') || '#a9bdb1', green = css('--green') || '#123c30', rule = css('--rule') || '#2e5a4c';
    cx.fillStyle = green; cx.fillRect(0, 0, s.W, s.H);
    // Score and the way out, in the mono.
    cx.font = '600 13px "Martian Mono", ui-monospace, monospace';
    cx.textBaseline = 'top';
    cx.fillStyle = pen; cx.textAlign = 'left';
    cx.fillText('SCORE ' + String(s.score).padStart(4, '0'), s.pad, 24);
    cx.strokeStyle = rule; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(s.pad, 52.5); cx.lineTo(s.W - s.pad, 52.5); cx.stroke();
    const colours = [pen, pen, page, page, dim, dim];
    for(const b of s.blocks){
      if(!b.alive) continue;
      const r = blockRect(s, b, slide);
      cx.fillStyle = colours[b.row]; cx.fillRect(r.x, r.y, r.w, r.h);
    }
    cx.fillStyle = page;
    cx.fillRect(s.px - s.pw / 2, s.py, s.pw, s.ph);
    if(!s.over || s.over === 'cleared'){
      cx.fillStyle = pen;
      cx.beginPath(); cx.arc(s.bx, s.by, s.r, 0, Math.PI * 2); cx.fill();
    }
    if(s.over){
      cx.fillStyle = 'rgba(12,42,34,.82)'; cx.fillRect(0, 0, s.W, s.H);
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = page;
      cx.font = `400 ${Math.min(96, s.W * 0.1)}px Gloock, Georgia, serif`;
      cx.fillText(s.over === 'cleared' ? 'Cleared.' : 'Game over.', s.W / 2, s.H / 2 - 30);
      cx.font = '600 14px "Martian Mono", ui-monospace, monospace';
      cx.fillStyle = pen;
      cx.fillText('SCORE ' + s.score, s.W / 2, s.H / 2 + 40);
      cx.fillStyle = dim;
      cx.fillText(touchy ? 'TAP TO PLAY AGAIN' : 'CLICK TO PLAY AGAIN  ·  RIGHT-CLICK OR ESC TO GO BACK', s.W / 2, s.H / 2 + 74);
    }
  }

  function aim(e){ if(state) state.px = Math.max(state.pw / 2, Math.min(state.W - state.pw / 2, e.clientX)); }
  function touch(e){
    if(e.target.closest('.breakout-quit')) return;      // let the Quit button have its tap
    e.preventDefault(); aim(e.touches[0]);
    if(e.type === 'touchstart' && state && state.over) start();
  }
  function click(){ if(state && state.over) start(); }
  function quit(e){ e.preventDefault(); close(); }
  function key(e){
    if(e.key === 'Escape') close();
    else if((e.key === 'Enter' || e.key === ' ') && state.over){ e.preventDefault(); start(); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
      e.preventDefault();
      state.px = Math.max(state.pw / 2, Math.min(state.W - state.pw / 2, state.px + (e.key === 'ArrowLeft' ? -40 : 40)));
    }
  }

  btn.addEventListener('click', open);
})();
