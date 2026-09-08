/**
 * The sky.
 *
 * Naano's whole identity hangs on a photographic cloud hero. Copying the
 * photograph was not an option and a stock replacement would have been a
 * 400KB JPEG that crops badly at every breakpoint, so the clouds are drawn:
 * overlapping circles inside a soft blur filter, which is how a cloud is
 * actually shaped and how they have been painted since the first CGI ones.
 *
 * The result scales to any viewport, weighs about a kilobyte, needs no
 * network, and can be tinted from the same design tokens as everything else.
 *
 * Deterministic by construction - the puffs are hand-placed rather than
 * random, so the server and client render identical markup and there is no
 * hydration mismatch to chase.
 */

interface Puff {
  /** Percentage across the viewBox. */
  cx: number;
  cy: number;
  r: number;
}

/** One cloud is a cluster of circles: a wide base with taller lumps on top. */
function cloud(x: number, y: number, scale: number): Puff[] {
  return [
    { cx: x, cy: y, r: 26 * scale },
    { cx: x - 30 * scale, cy: y + 6 * scale, r: 20 * scale },
    { cx: x + 30 * scale, cy: y + 5 * scale, r: 22 * scale },
    { cx: x - 14 * scale, cy: y - 14 * scale, r: 18 * scale },
    { cx: x + 16 * scale, cy: y - 12 * scale, r: 16 * scale },
    { cx: x - 52 * scale, cy: y + 14 * scale, r: 14 * scale },
    { cx: x + 54 * scale, cy: y + 13 * scale, r: 15 * scale },
  ];
}

/**
 * Three depth bands. Distant clouds are smaller, paler and higher; near ones
 * are large, bright and cropped by the bottom edge. That ordering is the whole
 * illusion - without it a cloud field reads as wallpaper.
 */
const FAR: Puff[] = [
  ...cloud(120, 120, 0.6),
  ...cloud(700, 86, 0.52),
  ...cloud(1200, 138, 0.66),
];
const MID: Puff[] = [
  ...cloud(300, 292, 1),
  ...cloud(880, 250, 0.88),
  ...cloud(1340, 320, 1.05),
];
const NEAR: Puff[] = [
  ...cloud(-30, 470, 1.55),
  ...cloud(540, 528, 1.4),
  ...cloud(1090, 492, 1.65),
  ...cloud(1500, 545, 1.35),
];

function Band({ puffs, fill, opacity }: { puffs: Puff[]; fill: string; opacity: number }) {
  return (
    <g fill={fill} opacity={opacity}>
      {puffs.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} />
      ))}
    </g>
  );
}

export function Sky({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`sky pointer-events-none absolute inset-0 -z-10 ${className ?? ''}`}>
      <svg
        viewBox="0 0 1440 700"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        <defs>
          {/*
            The blur is what turns a pile of circles into a cloud. Each band
            gets its own radius so the far clouds stay hazy and the near ones
            keep a defined edge.
          */}
          <filter id="sky-far" x="-20%" y="-60%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <filter id="sky-mid" x="-20%" y="-60%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="6.5" />
          </filter>
          <filter id="sky-near" x="-20%" y="-60%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="4.5" />
          </filter>
          {/*
            Fades the field into the page rather than ending on a line. It only
            starts working in the bottom third - an earlier version began at
            45% and quietly erased the near clouds, which are the ones doing
            all the work.
          */}
          <linearGradient id="sky-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcfcfb" stopOpacity="0" />
            <stop offset="68%" stopColor="#fcfcfb" stopOpacity="0" />
            <stop offset="88%" stopColor="#fcfcfb" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fcfcfb" stopOpacity="1" />
          </linearGradient>
        </defs>

        <g filter="url(#sky-far)">
          <Band puffs={FAR} fill="#ffffff" opacity={0.75} />
        </g>
        <g filter="url(#sky-mid)">
          <Band puffs={MID} fill="#ffffff" opacity={0.88} />
        </g>
        <g filter="url(#sky-near)">
          <Band puffs={NEAR} fill="#ffffff" opacity={1} />
        </g>

        <rect x="0" y="0" width="1440" height="700" fill="url(#sky-fade)" />
      </svg>
    </div>
  );
}
