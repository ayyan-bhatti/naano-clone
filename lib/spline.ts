/**
 * Spline scene configuration for the signup panel.
 *
 * ── What this is ─────────────────────────────────────────────────────────
 *
 * The published viewer URL for a remixed "Nexbot" scene. Spline inlines the
 * scene data into that page rather than serving a fetchable `.splinecode`
 * (both `my.spline.design/<slug>/scene.splinecode` and the `prod.` host return
 * 403), so there is nothing for `@splinetool/react-spline` to load. The
 * official iframe embed is the supported path, and it is also the cheaper one:
 * the React package pulls a ~1.5MB runtime into our bundle, whereas the iframe
 * keeps all of it out of our JS and loads only on one page, only when visible.
 *
 * ── The trade this makes ─────────────────────────────────────────────────
 *
 * This is the one external runtime dependency in the build. Everything else
 * works offline with no keys; this does not — it needs cdn.spline.design and
 * my.spline.design to be up. That is why it is layered rather than swapped in:
 * the hand-built robot and crowd render first and stay if the scene never
 * arrives, so the panel is correct offline, under reduced motion, and if
 * Spline is down. Set SPLINE_SCENE_URL to '' to drop the dependency entirely.
 *
 * Cross-origin, the iframe also cannot see which field is focused, so the
 * watch-while-you-type and eyes-shut-on-password behaviour belongs to the
 * hand-built layer underneath it and to the crowd on the sign-in page.
 */

/** Published Spline viewer URL. Empty string disables the embed entirely. */
export const SPLINE_SCENE_URL =
  'https://my.spline.design/nexbotbyaximoriscopycopy-UvoQSKmZpwu8lIFxuUb4Cp4g/';

/** Attribution for the original community scene this was remixed from. */
export const SPLINE_CREDIT = {
  title: 'Nexbot',
  author: 'Aximoris',
  sourceUrl: 'https://community.spline.design/',
};

export function isSplineEnabled(): boolean {
  return SPLINE_SCENE_URL.trim().length > 0;
}
