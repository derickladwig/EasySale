import React from 'react';
import { 
  Stack, 
  Inline, 
  Grid, 
  Card, 
  Button, 
  Input, 
  Select, 
  DataTable,
  SectionHeader,
  Toolbar,
  EmptyState,
  InlineAlert,
  Badge
} from '../index';

/**
 * Component showcase demonstrating all UI components in both light and dark themes.
 * This file serves as a visual reference and manual testing tool.
 */
export function ComponentShowcase() {
  const sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  ];

  const columns = [
    { key: 'name', header: 'Name', render: (item: any) => item.name },
    { key: 'email', header: 'Email', render: (item: any) => item.email },
    { key: 'status', header: 'Status', render: (item: any) => <Badge variant="success">{item.status}</Badge> },
  ];

  const selectOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <Stack gap="8">
        <SectionHeader 
          title="Component Showcase"
          helperText="All components using design tokens"
          actions={
            <Inline gap="2">
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="primary" size="sm">Primary</Button>
            </Inline>
          }
        />

        <Card variant="elevated" padding="lg">
          <Stack gap="6">
            <h3>Layout Primitives</h3>
            
            <div>
              <h4>Stack (Vertical)</h4>
              <Stack gap="2">
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 1</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 2</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 3</div>
              </Stack>
            </div>

            <div>
              <h4>Inline (Horizontal)</h4>
              <Inline gap="2">
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 1</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 2</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Item 3</div>
              </Inline>
            </div>

            <div>
              <h4>Grid</h4>
              <Grid columns="3" gap="4">
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Cell 1</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Cell 2</div>
                <div style={{ padding: '1rem', background: 'var(--color-surface-3)' }}>Cell 3</div>
              </Grid>
            </div>
          </Stack>
        </Card>

        <Card variant="outlined" padding="lg">
          <Stack gap="6">
            <h3>Buttons</h3>
            <Inline gap="2" wrap>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </Inline>
            <Inline gap="2" wrap>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </Inline>
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="6">
            <h3>Form Controls</h3>
            <Input 
              label="Username" 
              placeholder="Enter username"
              helperText="Choose a unique username"
            />
            <Input 
              label="Email" 
              type="email"
              error="Invalid email address"
            />
            <Select 
              label="Country"
              options={selectOptions}
              placeholder="Select a country"
              helperText="Choose your country"
            />
          </Stack>
        </Card>

        <Card variant="elevated" padding="lg">
          <Stack gap="4">
            <h3>Data Table</h3>
            <DataTable
              data={sampleData}
              columns={columns}
              keyExtractor={(item) => item.id.toString()}
            />
          </Stack>
        </Card>

        <Card variant="outlined" padding="lg">
          <Stack gap="4">
            <h3>Toolbar</h3>
            <Toolbar
              search={<Input placeholder="Search..." />}
              filters={
                <Inline gap="2">
                  <Button variant="ghost" size="sm">Filter</Button>
                  <Button variant="ghost" size="sm">Sort</Button>
                </Inline>
              }
              actions={
                <Inline gap="2">
                  <Button variant="secondary" size="sm">Export</Button>
                  <Button variant="primary" size="sm">Add New</Button>
                </Inline>
              }
            />
          </Stack>
        </Card>

        <Card variant="default" padding="lg">
          <Stack gap="4">
            <h3>Alerts</h3>
            <InlineAlert variant="info" title="Information">
              This is an informational message.
            </InlineAlert>
            <InlineAlert variant="success" title="Success">
              Operation completed successfully!
            </InlineAlert>
            <InlineAlert variant="warning" title="Warning">
              Please review this carefully.
            </InlineAlert>
            <InlineAlert variant="error" title="Error">
              Something went wrong.
            </InlineAlert>
          </Stack>
        </Card>

        <Card variant="elevated" padding="lg">
          <Stack gap="4">
            <h3>Badges</h3>
            <Inline gap="2" wrap>
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
            </Inline>
            <Inline gap="2" wrap>
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
            </Inline>
          </Stack>
        </Card>

        <Card variant="outlined" padding="none">
          <EmptyState
            title="No Data Available"
            message="There are no items to display at this time."
            icon="📭"
            action={<Button variant="primary">Create New Item</Button>}
          />
        </Card>
      </Stack>
    </div>
  );
}
