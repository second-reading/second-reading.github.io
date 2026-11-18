/* The promo page's short GIF loops, from the game's own canvas (320x240; the page scales them up
   with crisp pixels). Each scene is reached through the dev menu's jumps and flown by the game's
   bot (tools/bot/brain.js) at expert skill, so the ship dodges rather than flying through things.
   Bosses don't flash white when hit here: in a loop it strobes. Nothing past stage 3 (the game's
   MARKETING.md, "Never spoil it").
     node tools/site-gifs.js GAME_REPO [OUT_DIR]     (needs ffmpeg and gifsicle; SHOT=name for one)
   It records `secs` of each scene, then keeps `from` to `from + len` seconds. The bot doesn't play
   the same way twice, so check the loops, and with KEEP=1 the frames stay in OUT_DIR/frames/NAME
   to pick other windows from. The PNG stills (site-shots.js) stay as the reduced-motion and
   full-size versions. */
const { chromium } = require('playwright'); const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const GAME = path.resolve(process.argv[2] || '../fatal-exception'), OUT = path.resolve(process.argv[3] || path.join(__dirname, '../fatal-exception/shots'));
// [name, jump, seconds to wait first, seconds to record, keep from, keep length, set-up]
const CAPS = [
  ['title', 'Boot and title screen', 3, 4, 0.5, 2],
  ['stage1', 'Play the game', 1, 6, 1, 3],
  ['boss1', 'Play, just before the boss (fixed)', 0, 9, 4, 3, () => { game.f = BOSS_AT - 120; }],      // out of its wall
  ['desert', 'Stage 2: play (mines invisible)', 0, 10, 6, 3],                                      // a wall of mines (it dies in the gap at about 10)
  ['ice', 'Stage 3: play (random colours)', 0, 12, 8.2, 3.2],                                      // the gate, then the crystal
  ['boss2', 'Stage 2: the scarab, holding a bomb (fixed)', 0, 6, 1.6, 3],                          // out of the sand
];
(async () => {
  const b = await chromium.launch();
  for(const [name, jump, pre, secs, from, len, fn] of CAPS){
    if(process.env.SHOT && process.env.SHOT !== name) continue;
    const p = await b.newPage({viewport: {width: 1280, height: 800}});
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(GAME, 'index.html'));
    await p.waitForFunction(() => typeof JUMPS !== 'undefined');
    await p.addScriptTag({path: path.join(GAME, 'tools/bot/brain.js')});
    await p.evaluate(l => { localStorage.clear(); SETTINGS.handsFree = false; jump(JUMPS.findIndex(j => j[0].startsWith(l))); }, jump);
    await p.waitForTimeout(1500 + pre * 1000);
    if(fn) await p.evaluate(fn);
    await p.evaluate(() => { const d = drawGame; drawGame = g => { const b = g.boss, f = b && b.flash; if(b) b.flash = 0; d(g); if(b) b.flash = f; }; });
    if(name !== 'title') await p.evaluate(() => BOT.live('expert'));
    // Every other frame: 30 a second.
    await p.evaluate(secs => { window.__fr = []; let n = 0; const cv = document.querySelector('#cv'), end = performance.now() + secs * 1000;
      const tick = () => { if(n++ % 2 === 0) __fr.push(cv.toDataURL('image/png')); if(performance.now() < end) requestAnimationFrame(tick); else window.__done = true; };
      requestAnimationFrame(tick); }, secs);
    await p.waitForFunction(() => window.__done, null, {timeout: (secs + 30) * 1000});
    const dir = path.join(OUT, 'frames', name); fs.rmSync(dir, {recursive: true, force: true}); fs.mkdirSync(dir, {recursive: true});
    const n = await p.evaluate(() => __fr.length);
    for(let i = 0; i < n; i += 50){
      const chunk = await p.evaluate(([a, z]) => __fr.slice(a, z), [i, i + 50]);
      chunk.forEach((u, k) => fs.writeFileSync(path.join(dir, String(i + k).padStart(4, '0') + '.png'), Buffer.from(u.split(',')[1], 'base64')));
    }
    const raw = path.join(OUT, name + '.raw.gif'), gif = path.join(OUT, name + '.gif');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-ss', String(from), '-t', String(len), '-i', path.join(dir, '%04d.png'),
      '-vf', 'fps=25,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none', '-loop', '0', raw]);
    execFileSync('gifsicle', ['-O3', '--lossy=30', raw, '-o', gif]); fs.rmSync(raw);
    console.log(name, Math.round(fs.statSync(gif).size / 1024) + 'K', await p.evaluate(() => typeof BOT !== 'undefined' ? BOT.status() : ''), errs.length ? errs : '');
    await p.close();
  }
  if(!process.env.KEEP) fs.rmSync(path.join(OUT, 'frames'), {recursive: true, force: true});
  await b.close();
})();
