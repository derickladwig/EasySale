/**
 * Common Types
 * 
 * Centralized type definitions used across the application.
 */

export type { 
  FeatureStatus, 
  TabDef, 
  NavItemDef 
} from './featureStatus';

export { 
  isNavigable, 
  isVisible, 
  getStatusBadgeLabel 
} from './featureStatus';
