/**
 * Login Shell Component
 *
 * Slot-based layout system for the login interface.
 * Supports three layout templates with responsive behavior.
 */

import { ReactNode } from 'react';
import { useLoginTheme } from '../theme/LoginThemeProvider';

// ============================================================================
// Slot Components
// ============================================================================

interface SlotProps {
  children?: ReactNode;
  className?: string;
}

function HeaderSlot({ children, className = '' }: SlotProps) {
  return <header className={`login-header-slot ${className}`}>{children}</header>;
}

function LeftSlot({ children, className = '' }: SlotProps) {
  return <aside className={`login-left-slot ${className}`}>{children}</aside>;
}

function MainSlot({ children, className = '' }: SlotProps) {
  return <main className={`login-main-slot ${className}`}>{children}</main>;
}

function FooterSlot({ children, className = '' }: SlotProps) {
  return <footer className={`login-footer-slot ${className}`}>{children}</footer>;
}

function BackgroundSlot({ children, className = '' }: SlotProps) {
  return <div className={`login-background-slot ${className}`}>{children}</div>;
}

// ============================================================================
// LoginShell Component
// ============================================================================

interface LoginShellProps {
  header?: ReactNode;
  left?: ReactNode;
  main?: ReactNode;
  footer?: ReactNode;
  background?: ReactNode;
}

export function LoginShell({ header, left, main, footer, background }: LoginShellProps) {
  const { config } = useLoginTheme();
  const { layout } = config;
  const { template, slots, responsive } = layout;

  // Determine layout class based on template
  const getLayoutClass = (): string => {
    const baseClass = 'login-shell';
    const templateClass = `login-shell--${template}`;

    // Add responsive class if mobile stacking is enabled
    const responsiveClass = responsive.stackOnMobile ? 'login-shell--stack-mobile' : '';

    return `${baseClass} ${templateClass} ${responsiveClass}`.trim();
  };

  // Determine if a slot should be rendered
  const shouldRenderSlot = (slotName: 'header' | 'left' | 'main' | 'footer'): boolean => {
    const slot = slots[slotName];
    // Header and footer have 'enabled' property
    if ('enabled' in slot) {
      return slot.enabled;
    }
    // Left and main slots are always enabled (they only have 'variant')
    return true;
  };

  return (
    <div className={getLayoutClass()}>
      {/* Background layer (always rendered if provided) */}
      {background && <BackgroundSlot>{background}</BackgroundSlot>}

      {/* Content layers */}
      <div className="login-shell__content">
        {/* Header slot */}
        {shouldRenderSlot('header') && header && <HeaderSlot>{header}</HeaderSlot>}

        {/* Main content area */}
        <div className="login-shell__main-area">
          {/* Left slot */}
          {shouldRenderSlot('left') && left && (
            <LeftSlot className={`login-shell__left--${slots.left.variant}`}>{left}</LeftSlot>
          )}

          {/* Main slot */}
          {shouldRenderSlot('main') && main && (
            <MainSlot className={`login-shell__main--${slots.main.variant}`}>{main}</MainSlot>
          )}
        </div>

        {/* Footer slot */}
        {shouldRenderSlot('footer') && footer && <FooterSlot>{footer}</FooterSlot>}
      </div>

      {/* Responsive breakpoint styles */}
      <style>{`
        .login-shell {
          position: relative;
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .login-background-slot {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .login-shell__content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .login-shell__main-area {
          flex: 1;
          display: flex;
          align-items: stretch;
        }

        /* Template A: Split Hero Compact Form */
        .login-shell--splitHeroCompactForm .login-shell__main-area {
          flex-direction: row;
        }

        .login-shell--splitHeroCompactForm .login-left-slot {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--login-space-xl, 2rem);
        }

        .login-shell--splitHeroCompactForm .login-main-slot {
          flex: 0 0 auto;
          width: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--login-space-lg, 1.5rem);
        }

        /* Template B/C: Left Status Right Auth Card */
        .login-shell--leftStatusRightAuthCard .login-shell__main-area,
        .login-shell--leftStatusRightAuthCardPhoto .login-shell__main-area {
          flex-direction: row;
        }

        .login-shell--leftStatusRightAuthCard .login-left-slot,
        .login-shell--leftStatusRightAuthCardPhoto .login-left-slot {
          flex: 0 0 auto;
          width: 320px;
          display: flex;
          flex-direction: column;
          padding: var(--login-space-lg, 1.5rem);
        }

        .login-shell--leftStatusRightAuthCard .login-main-slot,
        .login-shell--leftStatusRightAuthCardPhoto .login-main-slot {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--login-space-xl, 2rem);
        }

        /* Mobile responsive */
        @media (max-width: ${responsive.breakpoints.mobile}px) {
          .login-shell--stack-mobile .login-shell__main-area {
            flex-direction: column;
          }

          .login-shell--stack-mobile .login-left-slot,
          .login-shell--stack-mobile .login-main-slot {
            width: 100%;
            flex: 1 1 auto;
          }
        }

        /* Tablet responsive */
        @media (min-width: ${responsive.breakpoints.mobile + 1}px) and (max-width: ${responsive.breakpoints.tablet}px) {
          .login-shell--splitHeroCompactForm .login-main-slot {
            width: 360px;
          }

          .login-shell--leftStatusRightAuthCard .login-left-slot,
          .login-shell--leftStatusRightAuthCardPhoto .login-left-slot {
            width: 280px;
          }
        }

        /* Desktop responsive */
        @media (min-width: ${responsive.breakpoints.desktop + 1}px) {
          .login-shell--splitHeroCompactForm .login-main-slot {
            width: 440px;
          }

          .login-shell--leftStatusRightAuthCard .login-left-slot,
          .login-shell--leftStatusRightAuthCardPhoto .login-left-slot {
            width: 360px;
          }
        }

        /* Kiosk responsive */
        @media (min-width: ${responsive.breakpoints.kiosk + 1}px) {
          .login-shell--splitHeroCompactForm .login-main-slot {
            width: 480px;
          }

          .login-shell--leftStatusRightAuthCard .login-left-slot,
          .login-shell--leftStatusRightAuthCardPhoto .login-left-slot {
            width: 400px;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { HeaderSlot, LeftSlot, MainSlot, FooterSlot, BackgroundSlot };
export type { LoginShellProps, SlotProps };
