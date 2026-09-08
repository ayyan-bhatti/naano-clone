import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    /*
      @splinetool/react-spline cannot be resolved by webpack as published.

      Its package.json is `"type": "module"` and its exports map offers only
      `types` and `import` for every subpath - no `require`, no `default`. Any
      resolution pass not running under the `import` condition finds no match
      and reports "Package path . is not exported", which reads like the
      subpath is missing when what is missing is a condition it can use. Its
      sibling @splinetool/runtime ships both `import` and `require` and
      resolves fine, so this is specific to the React wrapper.

      transpilePackages does not help (it still goes through the exports map)
      and serverExternalPackages conflicts with it. Pointing the bare specifier
      at the built ESM file bypasses the map. That file is the exact target the
      `import` condition names, so what gets loaded is unchanged - only how it
      is found.
    */
    config.resolve.alias = {
      ...config.resolve.alias,
      '@splinetool/react-spline': path.resolve(
        process.cwd(),
        'node_modules/@splinetool/react-spline/dist/react-spline.js',
      ),
    };

    /*
      @splinetool/runtime's Draco loader builds asset URLs with
      `new URL('../libs/draco/...', import.meta.url)`. Webpack treats that as a
      static asset reference and tries to resolve it at build time, but the
      package ships no libs/ directory at all - so the build fails on files
      that were never meant to exist locally. The runtime resolves those URLs
      itself, and only when a scene actually contains Draco-compressed
      geometry.

      Disabling url parsing for that build directory leaves the expressions
      alone. The character class has to accept a backslash as well as a slash
      or it never matches on Windows.
    */
    config.module.rules.push({
      test: /node_modules[\\/]@splinetool[\\/]runtime[\\/]build[\\/].*\.js$/,
      parser: { url: false },
    });

    return config;
  },
};

export default nextConfig;
