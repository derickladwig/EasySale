#!/usr/bin/env node

/**
 * Create Feature CLI
 * 
 * Scaffolds a new feature module with the standard directory structure.
 * 
 * Usage:
 *   npm run create:feature -- --name=my-feature
 *   npm run create:feature -- --name=my-feature --with-domain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || true;
  }
});

// Validate required arguments
if (!options.name) {
  console.error('❌ Error: Feature name is required');
  console.log('');
  console.log('Usage:');
  console.log('  npm run create:feature -- --name=my-feature');
  console.log('  npm run create:feature -- --name=my-feature --with-domain');
  console.log('');
  console.log('Options:');
  console.log('  --name=<name>    Feature name (required, kebab-case)');
  console.log('  --with-domain    Also create a domain module');
  process.exit(1);
}

const featureName = options.name;
const withDomain = options['with-domain'] || false;

// Convert kebab-case to PascalCase
const toPascalCase = (str) => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const pascalName = toPascalCase(featureName);
const featuresDir = path.join(__dirname, '..', 'src', 'features');
const domainsDir = path.join(__dirname, '..', 'src', 'domains');
const featureDir = path.join(featuresDir, featureName);
const domainDir = path.join(domainsDir, featureName);

// Check if feature already exists
if (fs.existsSync(featureDir)) {
  console.error(`❌ Error: Feature '${featureName}' already exists at ${featureDir}`);
  process.exit(1);
}

console.log(`\n🚀 Creating feature: ${featureName}\n`);

// Create directories
const dirs = [
  featureDir,
  path.join(featureDir, 'components'),
  path.join(featureDir, 'hooks'),
  path.join(featureDir, 'pages'),
];

dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`  📁 Created: ${path.relative(process.cwd(), dir)}`);
});

// Create files
const files = {
  // index.ts
  'index.ts': `/**
 * ${pascalName} Feature - Public API
 * 
 * This module exports the public interface for the ${featureName} feature.
 */

// Pages
export { ${pascalName}Page } from './pages/${pascalName}Page';

// Types (export if needed by other features)
// export type { ${pascalName}Data } from './types';
`,

  // components/index.ts
  'components/index.ts': `/**
 * ${pascalName} Components
 */

// Export components here
// export { ${pascalName}Card } from './${pascalName}Card';
`,

  // hooks/index.ts
  'hooks/index.ts': `/**
 * ${pascalName} Hooks
 */

// Export hooks here
// export { use${pascalName} } from './use${pascalName}';
`,

  // pages/index.ts
  'pages/index.ts': `/**
 * ${pascalName} Pages
 */

export { ${pascalName}Page } from './${pascalName}Page';
`,

  // pages/FeaturePage.tsx
  [`pages/${pascalName}Page.tsx`]: `/**
 * ${pascalName} Page
 * 
 * Main page for the ${featureName} feature.
 */

import { PageHeader } from '@common/components/organisms/PageHeader';
import { Panel } from '@common/components/organisms/Panel';

export function ${pascalName}Page() {
  return (
    <>
      <PageHeader
        title="${pascalName}"
        subtitle="Description of the ${featureName} feature"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <Panel>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              ${pascalName} Feature
            </h2>
            <p className="text-text-secondary">
              This is the ${featureName} feature. Add your components here.
            </p>
          </div>
        </Panel>
      </div>
    </>
  );
}
`,

  // README.md
  'README.md': `# ${pascalName} Feature

Brief description of what this feature does.

## Structure

\`\`\`
${featureName}/
├── components/     # UI components
├── hooks/          # Custom hooks
├── pages/          # Route pages
└── index.ts        # Public exports
\`\`\`

## Module Boundaries

### Imports From:
- \`@common/*\` - Shared components and utilities
- \`@domains/*\` - Business logic modules

### Exports:
- \`${pascalName}Page\` - Main page component

## Usage

Add to routes in \`src/routes/lazyRoutes.tsx\`:

\`\`\`typescript
export const Lazy${pascalName}Page = lazyWithFallback(
  () => import('../features/${featureName}/pages/${pascalName}Page')
);
\`\`\`

Then add the route in \`App.tsx\`:

\`\`\`typescript
<Route path="${featureName}" element={<Lazy${pascalName}Page />} />
\`\`\`
`,
};

Object.entries(files).forEach(([filename, content]) => {
  const filePath = path.join(featureDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(`  📄 Created: ${path.relative(process.cwd(), filePath)}`);
});

// Create domain if requested
if (withDomain) {
  console.log(`\n🔧 Creating domain: ${featureName}\n`);
  
  if (fs.existsSync(domainDir)) {
    console.log(`  ⚠️  Domain '${featureName}' already exists, skipping`);
  } else {
    fs.mkdirSync(domainDir, { recursive: true });
    console.log(`  📁 Created: ${path.relative(process.cwd(), domainDir)}`);
    
    const domainFiles = {
      // types.ts
      'types.ts': `/**
 * ${pascalName} Domain Types
 */

export interface ${pascalName}Data {
  id: string;
  // Add your type fields here
}

export interface Create${pascalName}Request {
  // Add create request fields
}

export interface Update${pascalName}Request {
  // Add update request fields
}
`,

      // api.ts
      'api.ts': `/**
 * ${pascalName} Domain API
 */

import { apiClient } from '@common/api/client';
import type { ${pascalName}Data, Create${pascalName}Request, Update${pascalName}Request } from './types';

export const ${featureName.replace(/-/g, '')}Api = {
  list: () => apiClient.get<${pascalName}Data[]>('/api/${featureName}'),
  get: (id: string) => apiClient.get<${pascalName}Data>(\`/api/${featureName}/\${id}\`),
  create: (data: Create${pascalName}Request) => apiClient.post<${pascalName}Data>('/api/${featureName}', data),
  update: (id: string, data: Update${pascalName}Request) => apiClient.put<${pascalName}Data>(\`/api/${featureName}/\${id}\`, data),
  delete: (id: string) => apiClient.delete(\`/api/${featureName}/\${id}\`),
};
`,

      // hooks.ts
      'hooks.ts': `/**
 * ${pascalName} Domain Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ${featureName.replace(/-/g, '')}Api } from './api';
import type { Create${pascalName}Request, Update${pascalName}Request } from './types';

export const ${featureName.replace(/-/g, '')}Keys = {
  all: ['${featureName}'] as const,
  list: () => [...${featureName.replace(/-/g, '')}Keys.all, 'list'] as const,
  detail: (id: string) => [...${featureName.replace(/-/g, '')}Keys.all, 'detail', id] as const,
};

export function use${pascalName}ListQuery() {
  return useQuery({
    queryKey: ${featureName.replace(/-/g, '')}Keys.list(),
    queryFn: ${featureName.replace(/-/g, '')}Api.list,
  });
}

export function use${pascalName}Query(id: string) {
  return useQuery({
    queryKey: ${featureName.replace(/-/g, '')}Keys.detail(id),
    queryFn: () => ${featureName.replace(/-/g, '')}Api.get(id),
    enabled: !!id,
  });
}

export function useCreate${pascalName}Mutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Create${pascalName}Request) => ${featureName.replace(/-/g, '')}Api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${featureName.replace(/-/g, '')}Keys.all });
    },
  });
}

export function useUpdate${pascalName}Mutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update${pascalName}Request }) => 
      ${featureName.replace(/-/g, '')}Api.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${featureName.replace(/-/g, '')}Keys.all });
    },
  });
}

export function useDelete${pascalName}Mutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ${featureName.replace(/-/g, '')}Api.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${featureName.replace(/-/g, '')}Keys.all });
    },
  });
}
`,

      // index.ts
      'index.ts': `/**
 * ${pascalName} Domain - Public API
 */

// Types
export type { ${pascalName}Data, Create${pascalName}Request, Update${pascalName}Request } from './types';

// API
export { ${featureName.replace(/-/g, '')}Api } from './api';

// Hooks
export {
  ${featureName.replace(/-/g, '')}Keys,
  use${pascalName}ListQuery,
  use${pascalName}Query,
  useCreate${pascalName}Mutation,
  useUpdate${pascalName}Mutation,
  useDelete${pascalName}Mutation,
} from './hooks';
`,
    };
    
    Object.entries(domainFiles).forEach(([filename, content]) => {
      const filePath = path.join(domainDir, filename);
      fs.writeFileSync(filePath, content);
      console.log(`  📄 Created: ${path.relative(process.cwd(), filePath)}`);
    });
  }
}

console.log(`
✅ Feature '${featureName}' created successfully!

Next steps:
  1. Add components to ${featureName}/components/
  2. Add hooks to ${featureName}/hooks/
  3. Update the page in ${featureName}/pages/${pascalName}Page.tsx
  4. Add route to src/routes/lazyRoutes.tsx
  5. Add navigation entry if needed

See ${featureName}/README.md for more details.
`);
