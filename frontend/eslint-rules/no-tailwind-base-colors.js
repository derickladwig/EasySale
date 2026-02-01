/**
 * ESLint Rule: no-tailwind-base-colors
 * 
 * Prevents the use of Tailwind base color utilities in components.
 * Enforces the use of semantic tokens from the theme system.
 * 
 * @fileoverview Disallow Tailwind base color utilities (e.g., bg-blue-500, text-red-600)
 * @author EasySale Team
 * 
 * Rule Details:
 * - Detects Tailwind base color utilities in className strings
 * - Detects color utilities in template literals
 * - Provides helpful error messages with semantic alternatives
 * - Supports auto-fix where possible
 * - Excludes theme files, test files, and stories
 * 
 * Examples of incorrect code:
 * ```jsx
 * <div className="bg-blue-500 text-red-600">...</div>
 * <button className={`border-green-400 ${active}`}>...</button>
 * ```
 * 
 * Examples of correct code:
 * ```jsx
 * <div className="bg-primary-500 text-error-600">...</div>
 * <button className={`border-success-400 ${active}`}>...</button>
 * ```
 */

// Tailwind base color names
const BASE_COLORS = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan',
  'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
];

// Tailwind color utilities (prefixes)
const COLOR_UTILITIES = [
  'bg', 'text', 'border', 'ring', 'fill', 'stroke',
  'from', 'via', 'to', // Gradients
  'outline', 'decoration', 'accent', 'caret', 'divide', 'placeholder'
];

// Semantic token mapping for suggestions
const SEMANTIC_MAPPING = {
  // Status colors
  'red': 'error',
  'green': 'success',
  'yellow': 'warning',
  'blue': 'info',
  'orange': 'warning',
  'amber': 'warning',
  
  // Neutral colors
  'slate': 'surface',
  'gray': 'surface',
  'zinc': 'surface',
  'neutral': 'surface',
  'stone': 'surface',
  
  // Brand colors
  'indigo': 'primary',
  'violet': 'primary',
  'purple': 'primary',
  'sky': 'accent',
  'cyan': 'accent',
  'teal': 'accent',
};

/**
 * Build regex pattern for Tailwind base colors
 */
function buildColorPattern() {
  const utilities = COLOR_UTILITIES.join('|');
  const colors = BASE_COLORS.join('|');
  // Matches: bg-blue-500, text-red-600/50, border-green-400, etc.
  return new RegExp(
    `\\b(${utilities})-(${colors})-(\\d{2,3})(/\\d{1,3})?\\b`,
    'g'
  );
}

const TAILWIND_COLOR_PATTERN = buildColorPattern();

/**
 * Get semantic alternative for a base color
 */
function getSemanticAlternative(utility, color, shade, opacity) {
  const semantic = SEMANTIC_MAPPING[color] || 'primary';
  const opacitySuffix = opacity || '';
  return `${utility}-${semantic}-${shade}${opacitySuffix}`;
}

/**
 * Check if file should be excluded
 */
function shouldExcludeFile(filename) {
  if (!filename) return false;
  
  const excludePatterns = [
    // Theme system files
    /styles\/tokens\.css$/,
    /styles\/themes\.css$/,
    /theme\/ThemeEngine\.ts$/,
    /config\/themeBridge\.ts$/,
    /auth\/theme\//,
    
    // Test files
    /\.test\.(ts|tsx|js|jsx)$/,
    /\.spec\.(ts|tsx|js|jsx)$/,
    /\.stories\.(ts|tsx|js|jsx)$/,
    /__tests__\//,
    
    // Legacy/quarantine
    /legacy_quarantine\//,
    /archive\//,
    
    // Config files
    /\.config\.(ts|js)$/,
    /tailwind\.config/,
  ];
  
  return excludePatterns.some(pattern => pattern.test(filename));
}

/**
 * Extract class names from JSX attribute
 */
function extractClassNames(node) {
  if (!node || !node.value) return [];
  
  const classNames = [];
  
  if (node.value.type === 'Literal') {
    // Simple string: className="bg-blue-500"
    classNames.push({
      type: 'literal',
      value: node.value.value,
      node: node.value,
    });
  } else if (node.value.type === 'JSXExpressionContainer') {
    const expr = node.value.expression;
    
    if (expr.type === 'Literal') {
      // Expression with literal: className={"bg-blue-500"}
      classNames.push({
        type: 'literal',
        value: expr.value,
        node: expr,
      });
    } else if (expr.type === 'TemplateLiteral') {
      // Template literal: className={`bg-blue-500 ${active}`}
      expr.quasis.forEach(quasi => {
        if (quasi.value.raw) {
          classNames.push({
            type: 'template',
            value: quasi.value.raw,
            node: quasi,
          });
        }
      });
    } else if (expr.type === 'CallExpression') {
      // Function call: className={clsx('bg-blue-500', active)}
      expr.arguments.forEach(arg => {
        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          classNames.push({
            type: 'literal',
            value: arg.value,
            node: arg,
          });
        } else if (arg.type === 'TemplateLiteral') {
          arg.quasis.forEach(quasi => {
            if (quasi.value.raw) {
              classNames.push({
                type: 'template',
                value: quasi.value.raw,
                node: quasi,
              });
            }
          });
        }
      });
    }
  }
  
  return classNames;
}

/**
 * Find Tailwind base color violations in a string
 */
function findViolations(text) {
  const violations = [];
  let match;
  
  // Reset regex state
  TAILWIND_COLOR_PATTERN.lastIndex = 0;
  
  while ((match = TAILWIND_COLOR_PATTERN.exec(text)) !== null) {
    const [fullMatch, utility, color, shade, opacity] = match;
    violations.push({
      match: fullMatch,
      utility,
      color,
      shade,
      opacity: opacity || '',
      index: match.index,
      suggestion: getSemanticAlternative(utility, color, shade, opacity),
    });
  }
  
  return violations;
}

/**
 * Create ESLint rule
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Tailwind base color utilities in favor of semantic tokens',
      category: 'Best Practices',
      recommended: true,
      url: 'https://github.com/easysale/docs/theming/semantic-tokens.md',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          excludePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional file patterns to exclude',
          },
          autoFix: {
            type: 'boolean',
            default: true,
            description: 'Enable auto-fix to replace with semantic tokens',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noBaseColor: 'Avoid Tailwind base color "{{match}}". Use semantic token "{{suggestion}}" instead.',
      noBaseColorGeneric: 'Avoid Tailwind base colors. Use semantic tokens from the theme system.',
    },
  },

  create(context) {
    const filename = context.getFilename();
    const options = context.options[0] || {};
    const autoFix = options.autoFix !== false;
    
    // Skip excluded files
    if (shouldExcludeFile(filename)) {
      return {};
    }
    
    // Check additional exclude patterns from options
    if (options.excludePatterns) {
      const customPatterns = options.excludePatterns.map(p => new RegExp(p));
      if (customPatterns.some(pattern => pattern.test(filename))) {
        return {};
      }
    }

    return {
      JSXAttribute(node) {
        // Only check className and class attributes
        if (!node.name || (node.name.name !== 'className' && node.name.name !== 'class')) {
          return;
        }
        
        const classNames = extractClassNames(node);
        
        classNames.forEach(({ value, node: valueNode }) => {
          if (typeof value !== 'string') return;
          
          const violations = findViolations(value);
          
          if (violations.length === 0) return;
          
          // Report each violation
          violations.forEach(violation => {
            context.report({
              node: valueNode,
              messageId: 'noBaseColor',
              data: {
                match: violation.match,
                suggestion: violation.suggestion,
              },
              fix: autoFix ? (fixer) => {
                // Get the source text
                const sourceCode = context.getSourceCode();
                let text = sourceCode.getText(valueNode);
                
                // Apply all fixes at once to avoid conflicts
                violations.forEach(v => {
                  const escapedMatch = v.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  text = text.replace(
                    new RegExp(escapedMatch, 'g'),
                    v.suggestion
                  );
                });
                
                return fixer.replaceText(valueNode, text);
              } : null,
            });
          });
        });
      },
    };
  },
};
