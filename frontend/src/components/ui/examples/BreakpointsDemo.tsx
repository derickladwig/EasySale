/**
 * Breakpoints Demo Component
 * 
 * Demonstrates the configured breakpoints, container queries, and aspect ratio utilities.
 * 
 * Requirements:
 * - 5.1: Responsive column counts (xs, sm, md, lg, xl breakpoints)
 * - 5.2: Container queries support
 * - 5.3: Aspect ratio utilities
 */

import React from 'react';

export function BreakpointsDemo() {
  return (
    <div className="p-8 space-y-8 bg-background-primary min-h-screen">
      <h1 className="text-h1 font-semibold text-text-primary">
        Breakpoints & Responsive Design Demo
      </h1>

      {/* Breakpoints Demo (Req 5.1) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">
          Breakpoints (xs, sm, md, lg, xl, 2xl)
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="bg-primary-500 text-white p-4 rounded-lg text-center"
              >
                Item {item}
              </div>
            ))}
          </div>
          <p className="text-text-secondary mt-4 text-sm">
            Resize the window to see the grid adapt:
            <br />
            • xs (0px): 1 column
            <br />
            • sm (640px): 2 columns
            <br />
            • md (768px): 3 columns
            <br />
            • lg (1024px): 4 columns
            <br />
            • xl (1280px): 5 columns
            <br />• 2xl (1536px): 6 columns
          </p>
        </div>
      </section>

      {/* Container Queries Demo (Req 5.2) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">
          Container Queries
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="@container">
            <div className="grid @xs:grid-cols-1 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="bg-success-DEFAULT text-white p-4 rounded-lg text-center"
                >
                  Card {item}
                </div>
              ))}
            </div>
          </div>
          <p className="text-text-secondary mt-4 text-sm">
            Container queries allow components to respond to their container's
            size, not just the viewport size.
          </p>
        </div>
      </section>

      {/* Aspect Ratio Demo (Req 5.3, 5.7) */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">
          Aspect Ratio Utilities
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg space-y-6">
          {/* Square */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Square (1:1)
            </h3>
            <div className="aspect-square bg-primary-500 rounded-lg flex items-center justify-center text-white max-w-xs">
              Square Aspect Ratio
            </div>
          </div>

          {/* Video */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Video (16:9)
            </h3>
            <div className="aspect-video bg-info-DEFAULT rounded-lg flex items-center justify-center text-white max-w-2xl">
              Video Aspect Ratio (16:9)
            </div>
          </div>

          {/* Widescreen */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Widescreen (21:9)
            </h3>
            <div className="aspect-widescreen bg-warning-DEFAULT rounded-lg flex items-center justify-center text-white max-w-3xl">
              Widescreen Aspect Ratio (21:9)
            </div>
          </div>

          {/* Portrait */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Portrait (3:4)
            </h3>
            <div className="aspect-portrait bg-error-DEFAULT rounded-lg flex items-center justify-center text-white max-w-xs">
              Portrait Aspect Ratio (3:4)
            </div>
          </div>

          {/* Photo */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Photo (4:3)
            </h3>
            <div className="aspect-photo bg-success-DEFAULT rounded-lg flex items-center justify-center text-white max-w-xl">
              Photo Aspect Ratio (4:3)
            </div>
          </div>

          {/* Golden Ratio */}
          <div>
            <h3 className="text-h4 font-medium text-text-primary mb-2">
              Golden Ratio (1.618:1)
            </h3>
            <div className="aspect-golden bg-secondary-600 rounded-lg flex items-center justify-center text-white max-w-2xl">
              Golden Ratio (1.618:1)
            </div>
          </div>

          <p className="text-text-secondary text-sm">
            Aspect ratio utilities ensure consistent heights for cards and
            images across different screen sizes.
          </p>
        </div>
      </section>

      {/* Responsive Grid with Aspect Ratios */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">
          Combined: Responsive Grid + Aspect Ratios
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div
                key={item}
                className="aspect-square bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-semibold text-lg shadow-md hover:shadow-lg transition-shadow"
              >
                Card {item}
              </div>
            ))}
          </div>
          <p className="text-text-secondary mt-4 text-sm">
            This grid combines responsive breakpoints with aspect ratio
            utilities to create consistent card layouts that adapt to any
            screen size.
          </p>
        </div>
      </section>

      {/* Orientation Media Queries */}
      <section className="space-y-4">
        <h2 className="text-h2 font-semibold text-text-primary">
          Orientation Media Queries
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="portrait:bg-primary-500 landscape:bg-success-DEFAULT p-6 rounded-lg text-white text-center">
            <p className="font-semibold">
              This box changes color based on orientation:
            </p>
            <p className="mt-2">
              • Portrait: Blue
              <br />• Landscape: Green
            </p>
          </div>
          <p className="text-text-secondary mt-4 text-sm">
            Rotate your device or resize the window to see the color change.
          </p>
        </div>
      </section>
    </div>
  );
}

export default BreakpointsDemo;
