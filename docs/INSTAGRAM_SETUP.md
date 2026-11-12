# Instagram official integration setup

This integration uses **Instagram Login** and reads media belonging to the Instagram professional account that explicitly authorizes VidsSave Pro. It is not a public-Reel downloader and does not fetch other users' media by pasted URL.

## Requirements
- Instagram Business or Creator account (personal accounts are not supported by this API).
- Meta developer account and a Meta app with Instagram API / Business Login configured.
- Cloudflare account with Workers and a KV namespace.
- Keep the Instagram App Secret and all access tokens server-side only.

## 1. Create the Meta app
1. Open https://developers.facebook.com/apps/ and create an app appropriate for business use.
2. Add the Instagram product / Instagram API with Instagram Login.
3. In Business Login settings, add this exact redirect URI after you deploy the Worker: `https://YOUR-WORKER.workers.dev/auth/callback`.
4. Copy the **Instagram App ID**. Keep the **Instagram App Secret** private.
5. For development, add your Instagram account as an app tester if Meta requires it and accept the invitation.

Permission used by this first read-only version: `instagram_business_basic`.

Official flow reference: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login/

## 2. Create Cloudflare KV
1. Cloudflare Dashboard → Workers & Pages → KV → Create namespace, e.g. `VidsSaveInstagramTokens`.
2. Copy its namespace ID.

## 3. Deploy the Worker
1. Create a Worker named `vidssave-pro-instagram`.
2. Paste the contents of `worker/instagram.js` into its editor and deploy.
3. Settings → Variables and Secrets:
   - Secret `IG_APP_ID`: Instagram App ID
   - Secret `IG_APP_SECRET`: Instagram App Secret
   - Variable `IG_REDIRECT_URI`: exact deployed Worker callback URL
   - Variable `FRONTEND_ORIGIN`: `https://ravivadhiya11.github.io`
   - Bind KV namespace as `TOKENS`
4. Save and redeploy. Never paste secrets into GitHub, the HTML page, screenshots, or chat.

## 4. Connect the frontend
Set the Worker base URL in the frontend's Instagram integration setting to your Worker origin (for example `https://vidssave-pro-instagram.YOUR-SUBDOMAIN.workers.dev`). The browser must call the Worker with credentials included. The Worker checks the exact GitHub Pages origin.

## Current API behavior
- `GET /auth/start`: starts Instagram Login with CSRF state.
- `GET /auth/callback`: exchanges code for a long-lived token and stores it in KV.
- `GET /api/instagram/me`: returns the connected account profile.
- `GET /api/instagram/media`: lists up to 20 media items belonging to the connected account. Returned `media_url` values are shown as direct links when Meta supplies them.
- `GET /auth/logout`: deletes the stored session.

Long-lived tokens expire; reconnect when the session expires. Add token refresh and production monitoring before public launch. Configure Meta app review/Advanced Access if you later serve accounts beyond app roles.

## Safety
- No arbitrary URL proxying or server-side URL fetching; this avoids SSRF and prevents turning the site into an open proxy.
- No scraping, DRM bypass, private-account access, or downloading media belonging to other accounts.
- Only display direct media URLs returned by Meta for the account that granted permission. Meta controls availability and URL expiry.
- Before a public launch, add privacy policy, terms, deletion/contact route, abuse reporting, and review Meta platform terms.
