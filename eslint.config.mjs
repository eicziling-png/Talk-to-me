import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [
      ".next/**",
      ".wrangler/**",
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**"
    ]
  }
];

export default config;
