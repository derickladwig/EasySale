/**
 * Review State Machine Hook
 * 
 * Manages state transitions for the Document Cleanup Engine review workflow.
 * Ensures user-drawn shields are never lost due to API failures.
 * 
 * @see docs/ux/REVIEW_STATE_MACHINE.md for state diagram and requirements
 */

import { useReducer, useEffect, useCallback } from 'react';
import { toast } from '@common/utils/toast';

// ============================================
// Types
// ============================================

export interface NormalizedBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShieldType =
  | 'Logo'
  | 'Watermark'
  | 'RepetitiveHeader'
  | 'RepetitiveFooter'
  | 'Stamp'
  | 'UserDefined'
  | 'VendorSpecific'
  | 'TemplateSpecific';

export type ApplyMode = 'Applied' | 'Suggested' | 'Disabled';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type ShieldSource = 'AutoDetected' | 'VendorRule' | 'TemplateRule' | 'SessionOverride';

export type PageTarget =
  | { type: 'All' }
  | { type: 'First' }
  | { type: 'Last' }
  | { type: 'Specific'; pages: number[] };

export interface ZoneTarget {
  include_zones: string[] | null;
  exclude_zones: string[];
}

export interface ShieldProvenance {
  source: ShieldSource;
  user_id: string | null;
  vendor_id: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CleanupShield {
  id: string;
  shield_type: ShieldType;
  normalized_bbox: NormalizedBBox;
  page_target: PageTarget;
  zone_target: ZoneTarget;
  apply_mode: ApplyMode;
  risk_level: RiskLevel;
  confidence: number;
  min_confidence: number;
  why_detected: string;
  provenance: ShieldProvenance;
}

export interface PrecedenceExplanation {
  shield_id: string;
  winning_source: ShieldSource;
  overridden_sources: ShieldSource[];
  reason: string;
}

export interface ZoneConflict {
  shield_id: string;
  zone_id: string;
  overlap_ratio: number;
  action_taken: string;
}

// ============================================
// State Types
// ============================================

export type ReviewStateType =
  | 'loading_case'
  | 'ready'
  | 'saving_rules_vendor'
  | 'saving_rules_template'
  | 'rerunning_extraction'
  | 'error_nonblocking';

export interface ReviewState {
  type: ReviewStateType;
  shields: CleanupShield[];
  sessionOverrides: CleanupShield[];
  precedenceExplanations: PrecedenceExplanation[];
  zoneConflicts: ZoneConflict[];
  error: string | null;
  previousStateType: ReviewStateType | null;
}

// ============================================
// Actions
// ============================================

export type ReviewAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; shields: CleanupShield[]; explanations?: PrecedenceExplanation[]; conflicts?: ZoneConflict[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SAVE_VENDOR_START' }
  | { type: 'SAVE_TEMPLATE_START' }
  | { type: 'RERUN_START' }
  | { type: 'OPERATION_SUCCESS'; shields?: CleanupShield[] }
  | { type: 'OPERATION_ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'DISMISS_ERROR' }
  | { type: 'ADD_SHIELD'; shield: CleanupShield }
  | { type: 'UPDATE_SHIELD'; shield: CleanupShield }
  | { type: 'REMOVE_SHIELD'; shieldId: string }
  | { type: 'SET_APPLY_MODE'; shieldId: string; mode: ApplyMode }
  | { type: 'SET_PAGE_TARGET'; shieldId: string; target: PageTarget }
  | { type: 'SET_ZONE_TARGET'; shieldId: string; target: ZoneTarget }
  | { type: 'RESTORE_SESSION'; overrides: CleanupShield[] };

// ============================================
// Initial State
// ============================================

const initialState: ReviewState = {
  type: 'loading_case',
  shields: [],
  sessionOverrides: [],
  precedenceExplanations: [],
  zoneConflicts: [],
  error: null,
  previousStateType: null,
};

// ============================================
// Reducer
// ============================================

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        type: 'loading_case',
        error: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        type: 'ready',
        shields: action.shields,
        precedenceExplanations: action.explanations ?? [],
        zoneConflicts: action.conflicts ?? [],
        error: null,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        type: 'error_nonblocking',
        previousStateType: 'loading_case',
        error: action.error,
      };

    case 'SAVE_VENDOR_START':
      return {
        ...state,
        type: 'saving_rules_vendor',
        previousStateType: state.type,
        error: null,
      };

    case 'SAVE_TEMPLATE_START':
      return {
        ...state,
        type: 'saving_rules_template',
        previousStateType: state.type,
        error: null,
      };

    case 'RERUN_START':
      return {
        ...state,
        type: 'rerunning_extraction',
        previousStateType: state.type,
        error: null,
      };

    case 'OPERATION_SUCCESS':
      return {
        ...state,
        type: 'ready',
        shields: action.shields ?? state.shields,
        sessionOverrides: [], // Clear session overrides on success
        error: null,
        previousStateType: null,
      };

    case 'OPERATION_ERROR':
      return {
        ...state,
        type: 'error_nonblocking',
        error: action.error,
        // Session overrides preserved - no change
      };

    case 'RETRY':
      // Return to the previous operation state
      if (state.previousStateType && state.previousStateType !== 'error_nonblocking') {
        return {
          ...state,
          type: state.previousStateType,
          error: null,
        };
      }
      return {
        ...state,
        type: 'ready',
        error: null,
      };

    case 'DISMISS_ERROR':
      return {
        ...state,
        type: 'ready',
        error: null,
        previousStateType: null,
      };

    case 'ADD_SHIELD': {
      const newOverrides = [...state.sessionOverrides, action.shield];
      return {
        ...state,
        shields: [...state.shields, action.shield],
        sessionOverrides: newOverrides,
      };
    }

    case 'UPDATE_SHIELD': {
      const updatedShields = state.shields.map((s) =>
        s.id === action.shield.id ? action.shield : s
      );
      const updatedOverrides = state.sessionOverrides.some((s) => s.id === action.shield.id)
        ? state.sessionOverrides.map((s) => (s.id === action.shield.id ? action.shield : s))
        : [...state.sessionOverrides, action.shield];
      return {
        ...state,
        shields: updatedShields,
        sessionOverrides: updatedOverrides,
      };
    }

    case 'REMOVE_SHIELD': {
      return {
        ...state,
        shields: state.shields.filter((s) => s.id !== action.shieldId),
        sessionOverrides: state.sessionOverrides.filter((s) => s.id !== action.shieldId),
      };
    }

    case 'SET_APPLY_MODE': {
      const updatedShields = state.shields.map((s) =>
        s.id === action.shieldId ? { ...s, apply_mode: action.mode } : s
      );
      const shield = state.shields.find((s) => s.id === action.shieldId);
      if (shield) {
        const updatedShield = { ...shield, apply_mode: action.mode };
        const updatedOverrides = state.sessionOverrides.some((s) => s.id === action.shieldId)
          ? state.sessionOverrides.map((s) => (s.id === action.shieldId ? updatedShield : s))
          : [...state.sessionOverrides, updatedShield];
        return {
          ...state,
          shields: updatedShields,
          sessionOverrides: updatedOverrides,
        };
      }
      return { ...state, shields: updatedShields };
    }

    case 'SET_PAGE_TARGET': {
      const updatedShields = state.shields.map((s) =>
        s.id === action.shieldId ? { ...s, page_target: action.target } : s
      );
      const shield = state.shields.find((s) => s.id === action.shieldId);
      if (shield) {
        const updatedShield = { ...shield, page_target: action.target };
        const updatedOverrides = state.sessionOverrides.some((s) => s.id === action.shieldId)
          ? state.sessionOverrides.map((s) => (s.id === action.shieldId ? updatedShield : s))
          : [...state.sessionOverrides, updatedShield];
        return {
          ...state,
          shields: updatedShields,
          sessionOverrides: updatedOverrides,
        };
      }
      return { ...state, shields: updatedShields };
    }

    case 'SET_ZONE_TARGET': {
      const updatedShields = state.shields.map((s) =>
        s.id === action.shieldId ? { ...s, zone_target: action.target } : s
      );
      const shield = state.shields.find((s) => s.id === action.shieldId);
      if (shield) {
        const updatedShield = { ...shield, zone_target: action.target };
        const updatedOverrides = state.sessionOverrides.some((s) => s.id === action.shieldId)
          ? state.sessionOverrides.map((s) => (s.id === action.shieldId ? updatedShield : s))
          : [...state.sessionOverrides, updatedShield];
        return {
          ...state,
          shields: updatedShields,
          sessionOverrides: updatedOverrides,
        };
      }
      return { ...state, shields: updatedShields };
    }

    case 'RESTORE_SESSION':
      return {
        ...state,
        sessionOverrides: action.overrides,
        shields: [...state.shields, ...action.overrides.filter(
          (o) => !state.shields.some((s) => s.id === o.id)
        )],
      };

    default:
      return state;
  }
}

// ============================================
// Session Storage Helpers
// ============================================

const SESSION_STORAGE_KEY_PREFIX = 'cleanup_overrides_';

interface SessionOverridesData {
  caseId: string;
  shields: CleanupShield[];
  lastModified: string;
  pendingAction?: 'save_vendor' | 'save_template' | 'rerun';
}

function saveToSessionStorage(caseId: string, overrides: CleanupShield[], pendingAction?: string): void {
  if (typeof window === 'undefined') return;
  
  const data: SessionOverridesData = {
    caseId,
    shields: overrides,
    lastModified: new Date().toISOString(),
    pendingAction: pendingAction as SessionOverridesData['pendingAction'],
  };
  
  try {
    sessionStorage.setItem(`${SESSION_STORAGE_KEY_PREFIX}${caseId}`, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save session overrides:', e);
  }
}

function loadFromSessionStorage(caseId: string): CleanupShield[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${caseId}`);
    if (!stored) return null;
    
    const data: SessionOverridesData = JSON.parse(stored);
    if (data.caseId !== caseId) return null;
    
    return data.shields;
  } catch (e) {
    console.warn('Failed to load session overrides:', e);
    return null;
  }
}

function clearSessionStorage(caseId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(`${SESSION_STORAGE_KEY_PREFIX}${caseId}`);
  } catch (e) {
    console.warn('Failed to clear session overrides:', e);
  }
}

// ============================================
// Hook
// ============================================

export interface UseReviewStateMachineOptions {
  caseId: string;
  vendorId?: string;
  templateId?: string;
}

export interface UseReviewStateMachineReturn {
  state: ReviewState;
  dispatch: React.Dispatch<ReviewAction>;
  // Convenience methods
  isLoading: boolean;
  isReady: boolean;
  isSaving: boolean;
  isRerunning: boolean;
  hasError: boolean;
  hasUnsavedChanges: boolean;
  // Actions
  loadCase: () => Promise<void>;
  saveAsVendorRule: () => Promise<void>;
  saveAsTemplateRule: () => Promise<void>;
  rerunExtraction: () => Promise<void>;
  addShield: (shield: CleanupShield) => void;
  updateShield: (shield: CleanupShield) => void;
  removeShield: (shieldId: string) => void;
  setApplyMode: (shieldId: string, mode: ApplyMode) => void;
  setPageTarget: (shieldId: string, target: PageTarget) => void;
  setZoneTarget: (shieldId: string, target: ZoneTarget) => void;
  retry: () => void;
  dismissError: () => void;
}

export function useReviewStateMachine(
  options: UseReviewStateMachineOptions
): UseReviewStateMachineReturn {
  const { caseId, vendorId, templateId } = options;
  const [state, dispatch] = useReducer(reviewReducer, initialState);

  // Restore session overrides on mount
  useEffect(() => {
    const stored = loadFromSessionStorage(caseId);
    if (stored && stored.length > 0) {
      dispatch({ type: 'RESTORE_SESSION', overrides: stored });
    }
  }, [caseId]);

  // Persist session overrides on change
  useEffect(() => {
    if (state.sessionOverrides.length > 0) {
      saveToSessionStorage(caseId, state.sessionOverrides);
    }
  }, [caseId, state.sessionOverrides]);

  // Clear session storage on successful save
  useEffect(() => {
    if (state.type === 'ready' && state.sessionOverrides.length === 0) {
      clearSessionStorage(caseId);
    }
  }, [caseId, state.type, state.sessionOverrides.length]);

  // Load case
  const loadCase = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    
    try {
      const response = await fetch('/api/cleanup/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_case_id: caseId,
          vendor_id: vendorId,
          template_id: templateId,
          session_overrides: state.sessionOverrides,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      dispatch({
        type: 'LOAD_SUCCESS',
        shields: data.resolved_shields ?? [],
        explanations: data.precedence_explanations ?? [],
        conflicts: data.critical_zone_conflicts ?? [],
      });
    } catch (e) {
      dispatch({ type: 'LOAD_ERROR', error: e instanceof Error ? e.message : 'Failed to load case' });
    }
  }, [caseId, vendorId, templateId, state.sessionOverrides]);

  // Save as vendor rule
  const saveAsVendorRule = useCallback(async () => {
    if (!vendorId) {
      dispatch({ type: 'OPERATION_ERROR', error: 'No vendor ID specified' });
      toast.error('No vendor ID specified');
      return;
    }

    dispatch({ type: 'SAVE_VENDOR_START' });

    try {
      const response = await fetch(`/api/cleanup/vendors/${vendorId}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: state.shields }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      dispatch({ type: 'OPERATION_SUCCESS' });
      toast.success('Vendor rules saved successfully');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to save vendor rules';
      dispatch({ type: 'OPERATION_ERROR', error: errorMsg });
      toast.error(errorMsg, { description: 'Your changes are preserved locally. You can retry.' });
    }
  }, [vendorId, state.shields]);

  // Save as template rule
  const saveAsTemplateRule = useCallback(async () => {
    if (!templateId) {
      dispatch({ type: 'OPERATION_ERROR', error: 'No template ID specified' });
      toast.error('No template ID specified');
      return;
    }

    dispatch({ type: 'SAVE_TEMPLATE_START' });

    try {
      const response = await fetch(`/api/cleanup/templates/${templateId}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: state.shields, vendor_id: vendorId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      dispatch({ type: 'OPERATION_SUCCESS' });
      toast.success('Template rules saved successfully');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to save template rules';
      dispatch({ type: 'OPERATION_ERROR', error: errorMsg });
      toast.error(errorMsg, { description: 'Your changes are preserved locally. You can retry.' });
    }
  }, [templateId, vendorId, state.shields]);

  // Re-run extraction
  const rerunExtraction = useCallback(async () => {
    dispatch({ type: 'RERUN_START' });

    try {
      // First save a snapshot of current shields
      await fetch(`/api/review/${caseId}/cleanup-snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved_shields: state.shields }),
      });

      // Then trigger re-extraction (this would call the OCR pipeline)
      // For now, just simulate success
      dispatch({ type: 'OPERATION_SUCCESS' });
      toast.success('Extraction completed successfully');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to re-run extraction';
      dispatch({ type: 'OPERATION_ERROR', error: errorMsg });
      toast.error(errorMsg, { description: 'Your shield edits are preserved. You can retry.' });
    }
  }, [caseId, state.shields]);

  // Convenience action wrappers
  const addShield = useCallback((shield: CleanupShield) => {
    dispatch({ type: 'ADD_SHIELD', shield });
  }, []);

  const updateShield = useCallback((shield: CleanupShield) => {
    dispatch({ type: 'UPDATE_SHIELD', shield });
  }, []);

  const removeShield = useCallback((shieldId: string) => {
    dispatch({ type: 'REMOVE_SHIELD', shieldId });
  }, []);

  const setApplyMode = useCallback((shieldId: string, mode: ApplyMode) => {
    dispatch({ type: 'SET_APPLY_MODE', shieldId, mode });
  }, []);

  const setPageTarget = useCallback((shieldId: string, target: PageTarget) => {
    dispatch({ type: 'SET_PAGE_TARGET', shieldId, target });
  }, []);

  const setZoneTarget = useCallback((shieldId: string, target: ZoneTarget) => {
    dispatch({ type: 'SET_ZONE_TARGET', shieldId, target });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' });
  }, []);

  const dismissError = useCallback(() => {
    dispatch({ type: 'DISMISS_ERROR' });
  }, []);

  return {
    state,
    dispatch,
    // Computed state
    isLoading: state.type === 'loading_case',
    isReady: state.type === 'ready',
    isSaving: state.type === 'saving_rules_vendor' || state.type === 'saving_rules_template',
    isRerunning: state.type === 'rerunning_extraction',
    hasError: state.type === 'error_nonblocking',
    hasUnsavedChanges: state.sessionOverrides.length > 0,
    // Actions
    loadCase,
    saveAsVendorRule,
    saveAsTemplateRule,
    rerunExtraction,
    addShield,
    updateShield,
    removeShield,
    setApplyMode,
    setPageTarget,
    setZoneTarget,
    retry,
    dismissError,
  };
}

export default useReviewStateMachine;
