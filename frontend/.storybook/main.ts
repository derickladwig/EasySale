import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    {
      name: "@storybook/addon-essentials",
      options: {
        docs: false, // Disable docs addon due to version mismatch
      },
    },
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-links"
  ],
  "framework": "@storybook/react-vite"
};
export default config;