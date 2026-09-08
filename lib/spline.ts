/**
 * Spline scene configuration for the signup panel.
 *
 * ── What this is ─────────────────────────────────────────────────────────
 *
 * A remixed "Nexbot" scene, rendered inline by @splinetool/react-spline
 * against its own `.splinecode` file. That file is the thing to point at - the
 * `my.spline.design/<slug>/` viewer page inlines its scene data and serves no
 * fetchable asset, which is why an earlier attempt at this had to fall back to
 * an iframe.
 *
 * ── The trade this makes ─────────────────────────────────────────────────
 *
 * This is the one external runtime dependency in the build. Everything else
 * works offline with no keys; this does not — it needs prod.spline.design to
 * be up, and it pulls a ~1.5MB runtime. That is why it is layered rather than
 * swapped in: the hand-built robot and crowd render first and stay if the
 * scene never arrives, so the panel is correct offline, under reduced motion,
 * and if Spline is down. Set SPLINE_SCENE_URL to '' to drop it entirely.
 *
 * The scene is a looping animation, so the watch-while-you-type and
 * eyes-shut-on-password behaviour still belongs to the hand-built layer and to
 * the crowd standing behind it.
 */

/**
 * The scene file itself, not the viewer page.
 *
 * `prod.spline.design/<id>/scene.splinecode` is what @splinetool/react-spline
 * loads - 1.3MB of JSON, served with CORS, and it renders onto a transparent
 * canvas in our own DOM. Empty string disables the scene entirely and leaves
 * the hand-built robot in place.
 */
export const SPLINE_SCENE_URL = 'https://prod.spline.design/RpUBwkdm-ao2zapA/scene.splinecode';

/** Attribution for the original community scene this was remixed from. */
export const SPLINE_CREDIT = {
  title: 'Nexbot',
  author: 'Aximoris',
  sourceUrl: 'https://community.spline.design/',
};

export function isSplineEnabled(): boolean {
  return SPLINE_SCENE_URL.trim().length > 0;
}
