/**
 * Custom ESLint Rules for EasySale
 * 
 * This module exports custom ESLint rules for enforcing
 * EasySale coding standards and best practices.
 * 
 * @module eslint-rules
 */

import noTailwindBaseColors from './no-tailwind-base-colors.js';

export default {
  'no-tailwind-base-colors': noTailwindBaseColors,
};
