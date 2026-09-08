/**
 * Spline scene configuration for the auth pages.
 *
 * ── To turn this on ───────────────────────────────────────────────────────
 *
 * 1. Open the scene:  https://app.spline.design/community/file/7f09bdc4-93c5-496e-b9fe-3505948c7721
 * 2. Click **Remix** (it is CC BY 4.0, so this is permitted — credit is set below)
 * 3. In your copy: **Export → Public site / iframe**, and copy the URL.
 *    It looks like `https://my.spline.design/<slug>/`
 * 4. Paste it into SPLINE_SCENE_URL below. That is the only change needed.
 *
 * The URL cannot be derived from the community link: the community viewer
 * fetches the scene through Spline's own API, and the file has no public
 * address until it is remixed and exported. Verified — it is not in the page
 * source, and prod/my/draft.spline.design all reject the community UUID.
 *
 * ── Why an iframe rather than @splinetool/react-spline ───────────────────
 *
 * The React package pulls a ~1.5MB runtime into the bundle. The official
 * iframe embed does the same job with zero npm dependencies, stays out of our
 * JS entirely, and is trivially lazy-loaded. Given the whole build is staked on
 * having no external runtime dependency, keeping this to an iframe that loads
 * only on two pages — and only when configured — is the smaller compromise.
 *
 * ── What you lose by switching this on ──────────────────────────────────
 *
 * The Spline scene is a looping animation, not an interactive one (its own
 * comments ask the author to make it follow the cursor; it does not). Embedded
 * cross-origin, it cannot see which field is focused, so the watch-while-you-
 * type, eyes-shut-on-password and sneak-a-peek behaviour does not apply to it.
 * Leaving SPLINE_SCENE_URL empty keeps the hand-built crowd, which does.
 *
 * Both paths are live code. This constant picks between them.
 */

/** Paste the exported `https://my.spline.design/<slug>/` URL here. */
export const SPLINE_SCENE_URL = '';

/** Required by the scene's CC BY 4.0 licence whenever the embed is shown. */
export const SPLINE_CREDIT = {
  title: '100 followers',
  author: 'heyvlad',
  authorUrl: 'https://community.spline.design/@heyvlad',
  sourceUrl: 'https://community.spline.design/file/7f09bdc4-93c5-496e-b9fe-3505948c7721',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
};

export function isSplineEnabled(): boolean {
  return SPLINE_SCENE_URL.trim().length > 0;
}
