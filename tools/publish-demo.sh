#!/bin/sh
# Puts Fatal Exception's demo on the site, at /fatal-exception/demo/, or takes it down again.
# The "Publish the demo" action (.github/workflows/publish-demo.yml) runs this; by hand:
#   sh tools/publish-demo.sh PATH/TO/dist     the demo build (the game repo's: sh tools/build.sh --demo),
#                                             with fatal-exception-demo.zip beside the dist folder, as
#                                             the build leaves it: it goes up too, to play offline
#   sh tools/publish-demo.sh --remove         take it down
# It also rewrites every line marked data-demo in the two pages (the demo's buttons, the
# download link, and the front page's status), so the site says the right thing either way.
# Then commit and push.
set -e
cd "$(dirname "$0")/.."
DEMO=fatal-exception/demo
PAGES="index.html fatal-exception/index.html"
# Each marked line, as it reads with the demo coming soon, and as it reads with it up.
relabel(){      # relabel up|down
  for f in $PAGES; do
    if [ "$1" = up ]; then
      sed -e '/data-demo/s|<a class="btn soon" data-demo href="#get" aria-disabled="true">Free demo coming soon</a>|<a class="btn" data-demo href="demo/">Play the free demo</a>|' \
          -e '/data-demo/s|<span class="status" data-demo>Free demo coming soon</span>|<span class="status" data-demo>Play the free demo</span>|' \
          -e '/data-demo/s|<p class="small" data-demo hidden>|<p class="small" data-demo>|' "$f" > "$f.tmp"
    else
      sed -e '/data-demo/s|<a class="btn" data-demo href="demo/">Play the free demo</a>|<a class="btn soon" data-demo href="#get" aria-disabled="true">Free demo coming soon</a>|' \
          -e '/data-demo/s|<span class="status" data-demo>Play the free demo</span>|<span class="status" data-demo>Free demo coming soon</span>|' \
          -e '/data-demo/s|<p class="small" data-demo>|<p class="small" data-demo hidden>|' "$f" > "$f.tmp"
    fi
    mv "$f.tmp" "$f"
  done
}
if [ "$1" = --remove ]; then
  rm -rf "$DEMO"; relabel down
  echo "The demo's down, and the pages say it's coming soon."
  exit 0
fi
SRC=$1
[ -n "$SRC" ] && [ -f "$SRC/index.html" ] || { echo "publish-demo: give the demo build's folder (the one with index.html in it)" >&2; exit 1; }
# Only ever the demo: the full game must never go up here by mistake.
grep -q 'const DEMO = true' "$SRC/index.html" || { echo "publish-demo: $SRC isn't a demo build (make it with: sh tools/build.sh --demo)" >&2; exit 1; }
for later in stage4 stage5 trip ending arcademode; do
  [ -e "$SRC/js/$later.js" ] && { echo "publish-demo: $SRC has js/$later.js in it, which the demo leaves out" >&2; exit 1; }
done
# The zip, to play offline: the one the build made beside dist, checked to be the demo too.
ZIPSRC=$SRC/../fatal-exception-demo.zip
[ -f "$ZIPSRC" ] || { echo "publish-demo: no fatal-exception-demo.zip beside $SRC (sh tools/build.sh --demo makes both)" >&2; exit 1; }
unzip -p "$ZIPSRC" index.html | grep -q 'const DEMO = true' || { echo "publish-demo: $ZIPSRC isn't a demo build" >&2; exit 1; }
rm -rf "$DEMO"; mkdir -p "$DEMO"; cp -R "$SRC"/. "$DEMO"/
cp "$ZIPSRC" "$DEMO/fatal-exception-demo.zip"
relabel up
grep -q 'href="demo/">Play the free demo' fatal-exception/index.html || { echo "publish-demo: couldn't find the demo's button in fatal-exception/index.html" >&2; exit 1; }
grep -q '<p class="small" data-demo>' fatal-exception/index.html || { echo "publish-demo: couldn't show the download link in fatal-exception/index.html" >&2; exit 1; }
echo "The demo's in $DEMO ($(du -sk "$DEMO" | cut -f1)K, the zip $(du -k "$DEMO/fatal-exception-demo.zip" | cut -f1)K), and the pages link to both."
