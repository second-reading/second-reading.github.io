# secondreading.games

The Second Reading Games website, served by GitHub Pages from this repo (`CNAME` holds the
domain). Plain HTML and CSS, no build step.

- `index.html`, `style.css`: the studio's front page.
- `fatal-exception/`: Fatal Exception's promo page. Its source is `site/` in the (private)
  fatal-exception repo, where `tools/site-shots.js` retakes the screenshots; copy it here after
  changing it, keeping the link back to the front page and the absolute `og:` addresses.
  - `press/`: its press kit (fact sheet, description, screenshots, the video, contact).
  - `shots/loop.mp4`, `loop.webm`: the hero's silent video, made by `tools/site-video.js` in the
    game's repo (`node tools/site-video.js OUT_DIR`); `share.png` is the 1200x630 link preview.
  - `demo/`: the free demo, when it's up (see below). Never edit it by hand.
- `robots.txt`, `sitemap.xml`: add a line to the sitemap for each new page.
- `img/`: the other games' card pictures, cropped from their title screens.

The games themselves are their own repos in the organisation, each with Pages switched on, so
they're served at `secondreading.games/<repo-name>/`.

## Publishing the demo

One click: the Actions tab, **Publish the demo**, **Run workflow**. It builds the demo from the
game's repo (`main`, or whichever branch or tag you give it), puts it at
`secondreading.games/fatal-exception/demo/`, and turns the "Free demo coming soon" buttons on
both pages into "Play the free demo". Run it again to update the demo; choose **take down** to
remove it and put the buttons back.

Set up once: the game's repo is private, so the action needs leave to read it.
1. On GitHub: Settings, Developer settings, Personal access tokens, Fine-grained tokens,
   Generate new token. Repository access: only `pdobson1/fatal-exception`. Permissions:
   Contents, read-only. Nothing else.
2. In this repo: Settings, Secrets and variables, Actions, New repository secret, named
   `GAME_REPO_TOKEN`, with the token as its value.
3. In this repo: Settings, Actions, General, Workflow permissions: Read and write.

By hand instead: in the game's repo `sh tools/build.sh --demo`, then here
`sh tools/publish-demo.sh ../fatal-exception/dist`, commit and push
(`sh tools/publish-demo.sh --remove` takes it down). The script refuses anything that isn't a
demo build, so the full game can't go up by mistake.

Before the demo goes up: its INSERT COIN at the end opens the itch.io page (`DEMO_BUY_URL` in
the game's `js/save.js`), so that page should exist first.

## The sign-up form

On Fatal Exception's page, under Get it: a visitor's address is checked in the page (the
script at its foot), then emailed to hello@secondreading.games by FormSubmit (formsubmit.co), a
free form-to-email relay; the mailing list is whatever's tagged in that inbox. It's activated
(FormSubmit emailed hello@ a link, once), and the form's `action` uses the random string that
email gave in place of the address, to keep the address away from scrapers; a different inbox
would need activating the same way, and its own string. FormSubmit keeps each submission for 30 days.
