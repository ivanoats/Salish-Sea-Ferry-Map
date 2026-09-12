import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // `.agents/` and `.claude/` hold vendored agent skills with their own
    // source trees, tsconfigs, and lint rules — linting them here just
    // reports upstream's problems as ours.
    ignores: [
      "styled-system/**",
      ".next/**",
      "node_modules/**",
      ".agents/**",
      ".claude/**",
    ],
  },
];

export default eslintConfig;
