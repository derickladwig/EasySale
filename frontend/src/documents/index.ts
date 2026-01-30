/**
 * Documents Feature Exports
 */

export { DocumentsPage } from './pages/DocumentsPage';
export { useDocuments } from './hooks/useDocuments';
export { useIngestDocument } from './hooks/useIngestDocument';
export { calculateStats } from './utils/statsAggregation';
export type { DocumentStats, CaseWithState } from './utils/statsAggregation';
export { getVisibleActions, isActionVisible } from './utils/caseActionVisibility.property.test';
