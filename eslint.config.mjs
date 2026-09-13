import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    // `.agents/` and `.claude/` hold vendored agent skills with their own
    // source trees, tsconfigs, and lint rules — linting them here just
    // reports upstream's problems as ours. `public/maplibre/` is the
    // minified worker staged out of node_modules by the postinstall step;
    // it's gitignored for the same reason it shouldn't be linted.
    ignores: [
      "styled-system/**",
      ".next/**",
      "node_modules/**",
      ".agents/**",
      ".claude/**",
      "public/maplibre/**",
    ],
  },
  {
    // eslint-config-next registers the @typescript-eslint plugin and parser
    // but leaves every unused-code rule off, so nothing local reported dead
    // variables, imports, or helpers — DeepSource caught them on CI after a
    // push instead. This closes that gap.
    //
    // The TypeScript rule rather than the core one: the core rule reads the
    // parameter names in a TS function-type declaration (`(id: string) =>
    // void`) as unused bindings and reports three false positives in
    // operator-filter.tsx alone.
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    // Registered again here rather than relied on from next's config: in
    // flat config a rule can only be switched on inside a config object
    // that declares its plugin itself.
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          // A leading underscore is the opt-out, for the cases where a name
          // has to exist but isn't used — a positional parameter before one
          // that is, or a destructuring rest that drops a key deliberately.
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
