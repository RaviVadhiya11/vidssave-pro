# VidsSave Pro

A mobile-first media-link helper frontend. This repository is separate from DigitalBazaar.

## Deploy on GitHub Pages
1. Open **Settings → Pages**.
2. Set **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`.
4. Save.

Expected Pages URL: https://ravivadhiya11.github.io/vidssave-pro/

## Current status
- Responsive static homepage and URL-format validation are implemented.
- This starter does **not** download or proxy media.
- Listed platforms are planned integrations, not a claim of compatibility.
- Real downloading requires a lawful, supported backend or official source integration. Do not attempt to bypass DRM, private-account restrictions, login controls, paywalls, or copyright restrictions.
- GitHub Pages serves static files only; it cannot host a media-processing backend by itself.

## Next engineering steps
1. Choose sources and use their official APIs or explicitly authorised download mechanisms.
2. Implement a backend with strict URL allowlists, SSRF protection, rate limits, file size/time limits, and safe content handling.
3. Do not accept arbitrary remote URLs or credentials.
4. Add clear copyright/abuse reporting and privacy pages before public launch.
5. Confirm provider pricing and platform terms before enabling any source.
