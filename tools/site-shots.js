const path = require('path'), fs = require('fs');
// The promo page's stills, from the game's own canvas, through the dev menu's jumps. Nothing past
// stage 3 (the game's MARKETING.md, "Never spoil it"). Hands-free flies the ship; for stills
// that's fine, and its AUTO is left off.
//   node tools/site-shots.js GAME_REPO [OUT_DIR]      (SHOT=name for one, WAIT=ms to adjust)
const GAME = path.resolve(process.argv[2] || '../fatal-exception'), OUT = path.resolve(process.argv[3] || path.join(__dirname, '../fatal-exception/shots'));
const { launch, openGame, jumpTo } = require(path.join(GAME, 'tests/lib.js'));
const SHOTS = [
  ['title', 'Boot and title screen', 2500, 'screenText.blink && blinkOn()'],
  ['stage1', 'Play the game', 2600],
  ['boss1', 'Play, just before the boss (fixed)', 0, 'game.boss && game.boss.wallOut && game.boss.since > 150 && game.boss.hp < game.boss.max * .8'],
  ['desert', 'Stage 2: play (mines invisible)', 0, 'game.mines && game.mines.some(m => m.x > 95 && m.x < 115)'],
  ['ice', 'Stage 3: play (random colours)', 1800],
  ['boss2', 'Stage 2: the scarab, holding a bomb (fixed)', 0, 'game.boss && scarabOpen(game.boss) > 0.9 && !game.boss.flash && !shieldBlink(game, game.boss)'],
];
(async () => {
  const b = await launch();
  for(let [name, jump, wait, until] of SHOTS){
    if(process.env.SHOT && process.env.SHOT !== name) continue;
    if(process.env.WAIT) wait = +process.env.WAIT;
    const p = await openGame(b);
    await p.evaluate(() => { SETTINGS.handsFree = true; const dt = drawText; window.drawText = (t, ...a) => t === 'AUTO' ? null : dt(t, ...a); });
    await jumpTo(p, jump);
    await p.waitForTimeout(wait);
    if(until) await p.waitForFunction(until, null, {polling: 'raf', timeout: 60000});
    const url = await p.evaluate(() => { const cv = document.querySelector('#cv'), o = document.createElement('canvas'); o.width = 640; o.height = 480;
      const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, 640, 480); return o.toDataURL('image/png'); });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log(name, p.errors.length ? p.errors : 'ok');
    await p.close();
  }
  await b.close();
})();
