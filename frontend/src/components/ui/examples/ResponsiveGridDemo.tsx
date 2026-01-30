/**
 * Responsive Grid Utilities Demo
 * 
 * This component demonstrates the new responsive grid utilities added to Tailwind config.
 * Task 2.2: Create responsive grid utilities
 * 
 * Features:
 * - Responsive column count classes (1 on mobile, 2 on tablet, 3+ on desktop)
 * - Responsive gap classes (16px on mobile, 24px on desktop)
 * - Responsive padding classes (16px on mobile, 24px on desktop)
 */

export function ResponsiveGridDemo() {
  return (
    <div className="space-y-8 p-responsive">
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Responsive Grid Columns
        </h2>
        <p className="text-text-secondary mb-6">
          Grid adapts from 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)
        </p>
        
        {/* Standard responsive grid: 1 → 2 → 3 columns */}
        <div className="grid grid-cols-responsive gap-responsive">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-background-secondary p-responsive rounded-lg border border-border-light"
            >
              <div className="text-text-primary font-medium">Card {i}</div>
              <div className="text-text-tertiary text-sm">
                Responsive grid item
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Responsive Grid - 4 Columns
        </h2>
        <p className="text-text-secondary mb-6">
          Grid adapts from 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop)
        </p>
        
        {/* 4-column responsive grid: 1 → 2 → 4 columns */}
        <div className="grid grid-cols-responsive-4 gap-responsive">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="bg-background-secondary p-responsive rounded-lg border border-border-light"
            >
              <div className="text-text-primary font-medium">Item {i}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Auto-Fit Grid
        </h2>
        <p className="text-text-secondary mb-6">
          Grid automatically fits as many columns as possible (min 250px per column)
        </p>
        
        {/* Auto-fit grid with minimum column width */}
        <div className="grid grid-auto-fit gap-responsive">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              className="bg-background-secondary p-responsive rounded-lg border border-border-light"
            >
              <div className="text-text-primary font-medium">Auto {i}</div>
              <div className="text-text-tertiary text-sm">
                Min width: 250px
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Responsive Gaps
        </h2>
        <p className="text-text-secondary mb-6">
          Gap changes from 16px (mobile) to 24px (desktop)
        </p>
        
        <div className="grid grid-cols-responsive gap-responsive">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-primary-500 p-4 rounded-lg text-white text-center"
            >
              Gap Demo {i}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Responsive Padding
        </h2>
        <p className="text-text-secondary mb-6">
          Padding changes from 16px (mobile) to 24px (desktop)
        </p>
        
        <div className="bg-background-secondary rounded-lg border border-border-light">
          <div className="p-responsive">
            <div className="text-text-primary font-medium mb-2">
              Container with Responsive Padding
            </div>
            <div className="text-text-tertiary">
              This container has 16px padding on mobile and 24px padding on desktop.
              Resize your browser to see the difference.
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-4">
          Utility Classes Reference
        </h2>
        <div className="bg-background-secondary p-responsive rounded-lg border border-border-light">
          <div className="space-y-4">
            <div>
              <h3 className="text-h4 font-semibold text-text-primary mb-2">
                Column Count Classes
              </h3>
              <ul className="text-text-secondary space-y-1 text-sm">
                <li><code className="text-primary-400">.grid-cols-responsive</code> - 1 → 2 → 3 columns</li>
                <li><code className="text-primary-400">.grid-cols-responsive-2</code> - 1 → 2 columns</li>
                <li><code className="text-primary-400">.grid-cols-responsive-4</code> - 1 → 2 → 4 columns</li>
                <li><code className="text-primary-400">.grid-cols-responsive-6</code> - 2 → 3 → 6 columns</li>
                <li><code className="text-primary-400">.grid-auto-fit-sm</code> - Auto-fit (min 200px)</li>
                <li><code className="text-primary-400">.grid-auto-fit</code> - Auto-fit (min 250px)</li>
                <li><code className="text-primary-400">.grid-auto-fit-md</code> - Auto-fit (min 300px)</li>
                <li><code className="text-primary-400">.grid-auto-fit-lg</code> - Auto-fit (min 350px)</li>
              </ul>
            </div>

            <div>
              <h3 className="text-h4 font-semibold text-text-primary mb-2">
                Gap Classes
              </h3>
              <ul className="text-text-secondary space-y-1 text-sm">
                <li><code className="text-primary-400">.gap-responsive</code> - 16px → 24px</li>
                <li><code className="text-primary-400">.gap-x-responsive</code> - Horizontal gap 16px → 24px</li>
                <li><code className="text-primary-400">.gap-y-responsive</code> - Vertical gap 16px → 24px</li>
              </ul>
            </div>

            <div>
              <h3 className="text-h4 font-semibold text-text-primary mb-2">
                Padding Classes
              </h3>
              <ul className="text-text-secondary space-y-1 text-sm">
                <li><code className="text-primary-400">.p-responsive</code> - All sides 16px → 24px</li>
                <li><code className="text-primary-400">.px-responsive</code> - Horizontal 16px → 24px</li>
                <li><code className="text-primary-400">.py-responsive</code> - Vertical 16px → 24px</li>
                <li><code className="text-primary-400">.pt-responsive</code> - Top 16px → 24px</li>
                <li><code className="text-primary-400">.pb-responsive</code> - Bottom 16px → 24px</li>
                <li><code className="text-primary-400">.pl-responsive</code> - Left 16px → 24px</li>
                <li><code className="text-primary-400">.pr-responsive</code> - Right 16px → 24px</li>
                <li><code className="text-primary-400">.container-padding</code> - Container padding 16px → 24px</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
