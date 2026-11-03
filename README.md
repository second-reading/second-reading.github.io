# secondreading.games

The Second Reading Games website, served by GitHub Pages from this repo (`CNAME` holds the
domain). Plain HTML and CSS, no build step.

- `index.html`, `style.css`: the studio's front page.
- `fatal-exception/`: Fatal Exception's promo page. Its source is `site/` in the (private)
  fatal-exception repo, where `tools/site-shots.js` retakes the screenshots; copy it here after
  changing it, keeping the link back to the front page and the absolute `og:` addresses.
- `img/`: the other games' card pictures, cropped from their title screens.

The games themselves are their own repos in the organisation, each with Pages switched on, so
they're served at `secondreading.games/<repo-name>/`.
