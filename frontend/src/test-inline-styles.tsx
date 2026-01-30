/**
 * TEST FILE: Sample JSX with inline styles to verify ESLint rules
 * This file should trigger ESLint errors
 * DO NOT USE IN PRODUCTION
 */

import React from 'react';

// ❌ VIOLATION: Inline style on DOM element (should fail)
export function TestInlineStyleDOM() {
  return (
    <div style={{ color: '#0066cc', padding: '16px' }}>
      This should trigger an ESLint error
    </div>
  );
}

// ❌ VIOLATION: Inline style on component (should fail)
interface CustomComponentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function CustomComponent({ children }: CustomComponentProps) {
  return <div>{children}</div>;
}

export function TestInlineStyleComponent() {
  return (
    <CustomComponent style={{ backgroundColor: '#ffffff' }}>
      This should trigger an ESLint error
    </CustomComponent>
  );
}

// ✅ VALID: Using CSS module (should pass)
import styles from './test-valid.module.css';

export function TestValidCSS() {
  return (
    <div className={styles.container}>
      This should pass ESLint
    </div>
  );
}
