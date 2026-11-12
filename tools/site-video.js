/* The promo site's video: the game in one loop, on the CRT alone. The attract demo flies into the
   cave roof and crashes, the debug monitor comes up, line 213 is changed and RUN, the ship
   scrapes the roof and flies on, and then stage 1 played for real, up to its boss.
     node tools/site-video.js GAME_REPO [OUT_DIR]   (needs ffmpeg; writes loop.mp4, loop.webm, loop.jpg;
                                                   OUT_DIR defaults to this site's fatal-exception/shots)
   Nothing past stage 1, so it spoils nothing (MARKETING.md, "Never spoil it"). No sound: the
   site plays it muted, on a loop. SKILL=good (or novice) for a lesser player. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(process.argv[2] || '../fatal-exception'), OUT = path.resolve(process.argv[3] || path.join(__dirname, '../fatal-exception/shots'));
const VIEW = {width: 1280, height: 800};
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fe-video-'));
  const b = await chromium.launch();
  const cx = await b.newContext({viewport: VIEW, recordVideo: {dir: tmp, size: VIEW}});
  const t0 = Date.now(), now = () => (Date.now() - t0) / 1000;
  const p = await cx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(ROOT, 'index.html'));
  await p.waitForFunction(() => typeof JUMPS !== 'undefined');
  const jump = l => p.evaluate(l => { const i = JUMPS.findIndex(j => j[0].startsWith(l)); if(i < 0) throw new Error('no jump: ' + l); jump(i); }, l);
  const wait = s => p.waitForTimeout(s * 1000);
  const type = async t => { await p.evaluate(t => submit(t), t); };
  const cuts = [];      // [from, to] in seconds: the parts of the recording that go in the video
  const part = async (secs, lead = 0) => { const a = now() + lead; await wait(secs + lead); cuts.push([a, now()]); };

  // 1. The attract demo, into the roof, and the crash.
  await p.evaluate(() => localStorage.clear());
  await jump('Attract mode demo'); await wait(1);
  for(let i = 0; i < 6; i++){ await p.keyboard.press('Enter'); await wait(.25); }      // the narration, read
  const a = now();
  await p.waitForFunction(() => screenEl.dataset.mode === 'crash', null, {timeout: 60000});
  cuts.push([Math.max(a, now() - 5), now() + 2.2]); await wait(2.4);
  // 2. The code, line 213 changed, RUN, and the ship flies on.
  await jump('Debug puzzle: fix line 213'); await part(1.6, .6);
  await type('change x to y'); await part(1.6, .2);
  await type('run'); await part(7, .3);
  // 3. Stage 1 for real, flown by the autopilot, up to the boss.
  // The bot (tools/bot/brain.js), at expert skill: it dodges like a player, where hands-free mode
  // can't be hurt and flies straight through things.
  await p.addScriptTag({path: path.join(ROOT, 'tools/bot/brain.js')});
  await p.evaluate(() => { SETTINGS.handsFree = false; });
  await jump('Play, just before the boss (fixed)');
  await p.evaluate(() => { game.f = BOSS_AT - 420; });
  await p.evaluate(s => BOT.live(s), process.env.SKILL || 'expert');
  await part(13, .5);
  console.log('bot:', await p.evaluate(() => BOT.status()));
  const clip = await p.evaluate(() => { const r = screenEl.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; });
  await cx.close(); await b.close();
  if(errs.length) console.log('page errors:', errs);
  const src = path.join(tmp, fs.readdirSync(tmp).find(f => f.endsWith('.webm')));
  const even = v => Math.floor(v / 2) * 2, crop = `crop=${even(clip.w)}:${even(clip.h)}:${Math.ceil(clip.x)}:${Math.ceil(clip.y)}`;
  const sel = cuts.map(([a, z]) => `between(t,${a.toFixed(2)},${z.toFixed(2)})`).join('+');
  const vf = `select='${sel}',setpts=N/25/TB,${crop},scale=640:480:flags=lanczos`;
  const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-vf', vf, '-an', '-r', '25', ...a]);
  ff('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'slow', '-movflags', '+faststart', path.join(OUT, 'loop.mp4'));
  ff('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', path.join(OUT, 'loop.webm'));
  ff('-frames:v', '1', '-q:v', '3', path.join(OUT, 'loop.jpg'));
  console.log('cuts', cuts.map(c => c.map(v => +v.toFixed(1))), clip);
  for(const f of ['loop.mp4', 'loop.webm', 'loop.jpg']) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + 'K');
})();
