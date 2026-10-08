# Open LK v76

Cache-busting query parameters were removed from the internal UI/CSS URLs. `open-lk-app.js` now loads `open-lk-ui.js` and `open-lk.css` directly by their stable paths.

In Tilda, load the app loader without a version query as well:
`https://lma6490544-eng.github.io/tilda-lk/open-lk-app.js`
