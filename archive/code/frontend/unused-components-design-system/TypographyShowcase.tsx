/**
 * Typography Showcase Component
 * 
 * Demonstrates the enhanced typography tokens from task 1.3 (UI Enhancement spec)
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.7
 */

export function TypographyShowcase() {
  return (
    <div className="p-8 space-y-12 bg-background-primary">
      {/* Heading Hierarchy Section */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Heading Hierarchy (Req 16.2)
        </h2>
        <div className="space-y-4 bg-background-secondary p-6 rounded-lg">
          <h1 className="text-h1 font-semibold text-text-primary">
            Heading 1 - 36px (2.25rem) with 1.2 line-height
          </h1>
          <h2 className="text-h2 font-semibold text-text-primary">
            Heading 2 - 30px (1.875rem) with 1.2 line-height
          </h2>
          <h3 className="text-h3 font-semibold text-text-primary">
            Heading 3 - 24px (1.5rem) with 1.2 line-height
          </h3>
          <h4 className="text-h4 font-semibold text-text-primary">
            Heading 4 - 20px (1.25rem) with 1.2 line-height
          </h4>
        </div>
      </section>

      {/* Body Text Section */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Body Text Sizes (Req 16.3)
        </h2>
        <div className="space-y-4 bg-background-secondary p-6 rounded-lg">
          <p className="text-xs font-normal text-text-primary">
            Extra Small - 12px (0.75rem) with 1.5 line-height
          </p>
          <p className="text-sm font-normal text-text-primary">
            Small - 14px (0.875rem) with 1.5 line-height
          </p>
          <p className="text-base font-normal text-text-primary">
            Base - 16px (1rem) with 1.5 line-height (Default body text)
          </p>
          <p className="text-lg font-normal text-text-primary">
            Large - 18px (1.125rem) with 1.5 line-height
          </p>
        </div>
      </section>

      {/* Font Weights Section */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Font Weights (Req 16.4)
        </h2>
        <div className="space-y-4 bg-background-secondary p-6 rounded-lg">
          <p className="text-base font-thin text-text-primary">Thin (100)</p>
          <p className="text-base font-extralight text-text-primary">Extra Light (200)</p>
          <p className="text-base font-light text-text-primary">Light (300)</p>
          <p className="text-base font-normal text-text-primary">
            Normal (400) - Body text default
          </p>
          <p className="text-base font-medium text-text-primary">Medium (500)</p>
          <p className="text-base font-semibold text-text-primary">
            Semibold (600) - Heading default
          </p>
          <p className="text-base font-bold text-text-primary">Bold (700)</p>
          <p className="text-base font-extrabold text-text-primary">Extra Bold (800)</p>
          <p className="text-base font-black text-text-primary">Black (900)</p>
        </div>
      </section>

      {/* Tabular Numbers Section */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Tabular Numbers (Req 16.7)
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg">
          <div className="grid grid-cols-2 gap-8">
            {/* Without Tabular Numbers */}
            <div>
              <h3 className="text-h4 font-semibold text-text-primary mb-4">
                Without Tabular Numbers
              </h3>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-text-primary">
                  <span>Product A</span>
                  <span>$1,234.56</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product B</span>
                  <span>$89.99</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product C</span>
                  <span>$12,345.67</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product D</span>
                  <span>$1.00</span>
                </div>
              </div>
            </div>

            {/* With Tabular Numbers */}
            <div>
              <h3 className="text-h4 font-semibold text-text-primary mb-4">
                With Tabular Numbers
              </h3>
              <div className="space-y-2 font-mono">
                <div className="flex justify-between text-text-primary">
                  <span>Product A</span>
                  <span className="font-tabular-nums">$1,234.56</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product B</span>
                  <span className="font-tabular-nums">$89.99</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product C</span>
                  <span className="font-tabular-nums">$12,345.67</span>
                </div>
                <div className="flex justify-between text-text-primary">
                  <span>Product D</span>
                  <span className="font-tabular-nums">$1.00</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-text-tertiary mt-4">
            Notice how the numbers align perfectly in the right column with tabular numbers.
          </p>
        </div>
      </section>

      {/* Real-world Example */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Real-world Example: Product Card
        </h2>
        <div className="bg-background-secondary p-6 rounded-lg max-w-md">
          <h3 className="text-h3 font-semibold text-text-primary mb-2">
            Premium Wireless Headphones
          </h3>
          <p className="text-base font-normal text-text-secondary mb-4">
            High-quality audio with active noise cancellation and 30-hour battery life.
            Perfect for music lovers and professionals.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-normal text-text-tertiary">Price:</span>
              <span className="text-h4 font-semibold text-primary-500 font-tabular-nums">
                $299.99
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-normal text-text-tertiary">In Stock:</span>
              <span className="text-base font-medium text-success font-tabular-nums">
                42 units
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-normal text-text-tertiary">SKU:</span>
              <span className="text-base font-normal text-text-primary font-tabular-nums">
                WH-1000XM5
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Line Height Comparison */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary mb-6">
          Line Height Comparison (Req 16.3)
        </h2>
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-background-secondary p-6 rounded-lg">
            <h3 className="text-h4 font-semibold text-text-primary mb-4">
              Body Text (1.5 line-height)
            </h3>
            <p className="text-base font-normal text-text-primary">
              This is body text with a 1.5 line-height ratio. This provides optimal
              readability for longer paragraphs and content. The spacing between lines
              is comfortable for extended reading sessions.
            </p>
          </div>
          <div className="bg-background-secondary p-6 rounded-lg">
            <h3 className="text-h4 font-semibold text-text-primary mb-4">
              Heading (1.2 line-height)
            </h3>
            <h2 className="text-h2 font-semibold text-text-primary">
              This is a heading with 1.2 line-height for tighter spacing
            </h2>
            <p className="text-sm text-text-tertiary mt-2">
              Headings use tighter line-height for better visual hierarchy
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TypographyShowcase;
