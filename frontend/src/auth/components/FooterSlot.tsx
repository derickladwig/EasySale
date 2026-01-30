/**
 * Footer Slot Component
 *
 * Displays version number, build identifier, and copyright text.
 *
 * Validates Requirements 9.4, 9.5
 */

import { useLoginTheme } from '../theme/LoginThemeProvider';

// ============================================================================
// Types
// ============================================================================

interface FooterSlotProps {
  version: string;
  buildId?: string;
  copyright: string;
}

// ============================================================================
// Footer Slot Component
// ============================================================================

export function FooterSlot({ version, buildId, copyright }: FooterSlotProps) {
  const { config } = useLoginTheme();
  const { tokens } = config;

  return (
    <footer
      className="footer-slot"
      data-testid="footer-slot"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${tokens.spacing.scale.md} ${tokens.spacing.scale.lg}`,
        backgroundColor: tokens.colors.surface.primary,
        borderTop: `1px solid ${tokens.colors.border.default}`,
        fontSize: tokens.typography.fontSize.xs,
        color: tokens.colors.text.tertiary,
      }}
    >
      {/* Left: Version and Build */}
      <div
        className="footer-slot__version-info"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.scale.sm,
        }}
        data-testid="footer-version-info"
      >
        <span className="footer-slot__version" data-testid="footer-version">
          v{version}
        </span>
        {buildId && (
          <>
            <span
              className="footer-slot__separator"
              style={{
                color: tokens.colors.border.default,
              }}
            >
              •
            </span>
            <span
              className="footer-slot__build"
              style={{
                fontFamily: tokens.typography.fontFamily.monospace,
              }}
              data-testid="footer-build"
            >
              {buildId}
            </span>
          </>
        )}
      </div>

      {/* Right: Copyright */}
      <div className="footer-slot__copyright" data-testid="footer-copyright">
        {copyright}
      </div>
    </footer>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { FooterSlotProps };
