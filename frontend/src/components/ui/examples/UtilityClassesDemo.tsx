/**
 * Utility Classes Demo Component
 * 
 * This component demonstrates the interactive state utility classes
 * added in task 1.6 of the UI Enhancement specification.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import React from 'react';

export function UtilityClassesDemo() {
  return (
    <div className="p-8 space-y-12 bg-background-primary min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-h1 font-semibold text-text-primary mb-2">
          Interactive State Utility Classes
        </h1>
        <p className="text-base text-text-secondary mb-8">
          Demonstration of custom Tailwind utilities for focus, hover, active, and disabled states.
        </p>

        {/* Focus Ring Utilities */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Focus Ring Utilities
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Press Tab to navigate and see focus rings. Required for keyboard accessibility (WCAG AA).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="focus-ring bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
              Standard Focus Ring
            </button>
            <button className="focus-ring-inset bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
              Inset Focus Ring
            </button>
            <input
              className="focus-ring-error border-2 border-error px-3 py-3 rounded-lg bg-background-secondary text-text-primary"
              placeholder="Error Focus Ring"
            />
            <input
              className="focus-ring-success border-2 border-success px-3 py-3 rounded-lg bg-background-secondary text-text-primary"
              placeholder="Success Focus Ring"
            />
            <button className="focus-ring-none bg-background-tertiary text-text-primary px-4 py-3 rounded-lg font-medium">
              No Focus Ring (Not Recommended)
            </button>
          </div>
        </section>

        {/* Hover State Utilities */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Hover State Utilities
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Hover over elements to see brightness and lift effects.
          </p>
          
          <div className="mb-8">
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Brightness Utilities (10% increase on hover)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="hover-brightness-sm bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Small Brightness (5%)
              </button>
              <button className="hover-brightness bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Normal Brightness (10%)
              </button>
              <button className="hover-brightness-lg bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Large Brightness (15%)
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Lift Utilities (elevation on hover)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="hover-lift-sm bg-background-secondary p-6 rounded-lg shadow-md cursor-pointer">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Small Lift</h4>
                <p className="text-sm text-text-secondary">Subtle elevation effect</p>
              </div>
              <div className="hover-lift bg-background-secondary p-6 rounded-lg shadow-md cursor-pointer">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Normal Lift</h4>
                <p className="text-sm text-text-secondary">Standard elevation effect</p>
              </div>
              <div className="hover-lift-lg bg-background-secondary p-6 rounded-lg shadow-md cursor-pointer">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Large Lift</h4>
                <p className="text-sm text-text-secondary">Prominent elevation effect</p>
              </div>
            </div>
          </div>
        </section>

        {/* Active State Utilities */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Active State Utilities
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Click and hold to see scale and brightness effects.
          </p>
          
          <div className="mb-8">
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Scale Utilities (0.98 scale on press)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="active-scale-sm bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Small Scale (0.99)
              </button>
              <button className="active-scale bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Normal Scale (0.98)
              </button>
              <button className="active-scale-lg bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Large Scale (0.95)
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Brightness Utilities (15% decrease on press)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="active-brightness-sm bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Small Brightness (10%)
              </button>
              <button className="active-brightness bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Normal Brightness (15%)
              </button>
              <button className="active-brightness-lg bg-primary-500 text-white px-4 py-3 rounded-lg font-medium">
                Large Brightness (20%)
              </button>
            </div>
          </div>
        </section>

        {/* Disabled State Utilities */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Disabled State Utilities
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Disabled elements with 50% opacity and not-allowed cursor.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="disabled-state bg-primary-500 text-white px-4 py-3 rounded-lg font-medium" disabled>
              Full Disabled State
            </button>
            <button className="disabled-opacity bg-primary-500 text-white px-4 py-3 rounded-lg font-medium" disabled>
              Opacity Only
            </button>
            <button className="disabled-cursor bg-primary-500 text-white px-4 py-3 rounded-lg font-medium" disabled>
              Cursor Only
            </button>
            <button className="disabled-no-pointer bg-primary-500 text-white px-4 py-3 rounded-lg font-medium" disabled>
              No Pointer Events
            </button>
          </div>
        </section>

        {/* Combined Interactive Utilities */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Combined Interactive Utilities
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Pre-configured combinations for common patterns.
          </p>
          
          <div className="mb-8">
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Interactive Button
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="interactive-button bg-primary-500 text-white px-4 py-3 rounded-lg font-medium shadow-md">
                Primary Button
              </button>
              <button className="interactive-button bg-success text-white px-4 py-3 rounded-lg font-medium shadow-md">
                Success Button
              </button>
              <button className="interactive-button bg-error text-white px-4 py-3 rounded-lg font-medium shadow-md" disabled>
                Disabled Button
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Interactive Card
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="interactive-card bg-background-secondary p-6 rounded-lg shadow-md">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Card Title</h4>
                <p className="text-sm text-text-secondary mb-4">
                  This card has hover lift and focus ring effects.
                </p>
                <span className="text-primary-500 text-sm font-medium">Learn More →</span>
              </div>
              <div className="interactive-card bg-background-secondary p-6 rounded-lg shadow-md">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Another Card</h4>
                <p className="text-sm text-text-secondary mb-4">
                  Click anywhere on the card to interact.
                </p>
                <span className="text-primary-500 text-sm font-medium">View Details →</span>
              </div>
              <div className="interactive-card bg-background-secondary p-6 rounded-lg shadow-md">
                <h4 className="text-h4 font-semibold text-text-primary mb-2">Third Card</h4>
                <p className="text-sm text-text-secondary mb-4">
                  Consistent interaction patterns across all cards.
                </p>
                <span className="text-primary-500 text-sm font-medium">Explore →</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-h3 font-semibold text-text-primary mb-4">
              Interactive Element
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="interactive bg-primary-500 text-white px-6 py-4 rounded-lg font-medium text-lg">
                Complete Interactive State
              </button>
              <button className="interactive bg-background-tertiary text-text-primary px-6 py-4 rounded-lg font-medium text-lg">
                Secondary Interactive
              </button>
            </div>
          </div>
        </section>

        {/* Real-world Examples */}
        <section className="mb-12">
          <h2 className="text-h2 font-semibold text-text-primary mb-4">
            Real-world Examples
          </h2>
          <p className="text-base text-text-secondary mb-6">
            Practical examples combining multiple utilities.
          </p>
          
          <div className="space-y-6">
            {/* Form Example */}
            <div className="bg-background-secondary p-6 rounded-lg shadow-md">
              <h3 className="text-h3 font-semibold text-text-primary mb-4">
                Form with Interactive States
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Username
                  </label>
                  <input
                    className="focus-ring w-full px-4 py-3 rounded-lg bg-background-tertiary border-2 border-border text-text-primary"
                    type="text"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email (with error)
                  </label>
                  <input
                    className="focus-ring-error w-full px-4 py-3 rounded-lg bg-background-tertiary border-2 border-error text-text-primary"
                    type="email"
                    placeholder="Enter email"
                  />
                  <p className="text-sm text-error mt-1">Please enter a valid email address</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Password (with success)
                  </label>
                  <input
                    className="focus-ring-success w-full px-4 py-3 rounded-lg bg-background-tertiary border-2 border-success text-text-primary"
                    type="password"
                    placeholder="Enter password"
                  />
                  <p className="text-sm text-success mt-1">Strong password!</p>
                </div>
                <div className="flex gap-4 pt-2">
                  <button className="interactive-button bg-primary-500 text-white px-6 py-3 rounded-lg font-medium shadow-md">
                    Submit
                  </button>
                  <button className="interactive-button bg-background-tertiary text-text-primary px-6 py-3 rounded-lg font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons Example */}
            <div className="bg-background-secondary p-6 rounded-lg shadow-md">
              <h3 className="text-h3 font-semibold text-text-primary mb-4">
                Action Buttons with Different Intensities
              </h3>
              <div className="flex flex-wrap gap-4">
                <button className="focus-ring hover-brightness-lg active-scale-lg bg-primary-500 text-white px-6 py-3 rounded-lg font-medium shadow-md">
                  Primary Action
                </button>
                <button className="focus-ring hover-brightness active-scale bg-background-tertiary text-text-primary px-6 py-3 rounded-lg font-medium">
                  Secondary Action
                </button>
                <button className="focus-ring hover-brightness-sm active-scale-sm text-text-secondary px-6 py-3 rounded-lg font-medium">
                  Tertiary Action
                </button>
                <button className="focus-ring hover-brightness active-scale bg-error text-white px-6 py-3 rounded-lg font-medium shadow-md">
                  Danger Action
                </button>
                <button className="disabled-state bg-primary-500 text-white px-6 py-3 rounded-lg font-medium shadow-md" disabled>
                  Disabled Action
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Note */}
        <section className="bg-info/10 border-2 border-info rounded-lg p-6">
          <h3 className="text-h3 font-semibold text-text-primary mb-2 flex items-center gap-2">
            <span className="text-info">ℹ️</span>
            Accessibility Note
          </h3>
          <p className="text-base text-text-secondary">
            All interactive elements include focus rings for keyboard navigation (WCAG AA compliance).
            Animations automatically respect the user's <code className="bg-background-tertiary px-2 py-1 rounded text-sm">prefers-reduced-motion</code> setting.
            Always test with keyboard navigation (Tab key) to ensure accessibility.
          </p>
        </section>
      </div>
    </div>
  );
}
