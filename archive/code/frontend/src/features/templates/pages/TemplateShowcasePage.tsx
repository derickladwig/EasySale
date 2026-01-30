import { useState, Fragment } from 'react';
import { Card } from '@common/components/organisms/Card';
import { Button } from '@common/components/atoms/Button';
import { Badge } from '@common/components/atoms/Badge';
import { 
  getAllFormTemplates, 
  FormTemplateKey 
} from '@common/components/formTemplates';
import { 
  getAllWizardForms, 
  WizardFormKey 
} from '@common/components/wizardForms';
import { 
  getAllTableTemplates, 
  TableTemplateKey 
} from '@common/components/tableTemplates';
import { 
  getAllWidgetTemplates, 
  getAllDashboardCollections,
  WidgetTemplateKey,
} from '@common/components/widgetTemplates';
import { DynamicForm } from '@common/components/DynamicForm';
import { DynamicTable } from '@common/components/DynamicTable';
import { DynamicWidget } from '@common/components/DynamicWidget';
import { 
  FileText, 
  Table, 
  LayoutDashboard, 
  Workflow,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

type TabType = 'forms' | 'wizards' | 'tables' | 'widgets';

export function TemplateShowcasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('forms');
  const [selectedForm, setSelectedForm] = useState<FormTemplateKey | null>(null);
  const [selectedWizard, setSelectedWizard] = useState<WizardFormKey | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableTemplateKey | null>(null);
  const [selectedWidget, setSelectedWidget] = useState<WidgetTemplateKey | null>(null);
  const [wizardStep, setWizardStep] = useState(0);

  const formTemplates = getAllFormTemplates();
  const wizardForms = getAllWizardForms();
  const tableTemplates = getAllTableTemplates();
  const widgetTemplates = getAllWidgetTemplates();
  const dashboardCollections = getAllDashboardCollections();

  const tabs = [
    { id: 'forms' as TabType, label: 'Forms', icon: FileText, count: Object.keys(formTemplates).length },
    { id: 'wizards' as TabType, label: 'Wizards', icon: Workflow, count: Object.keys(wizardForms).length },
    { id: 'tables' as TabType, label: 'Tables', icon: Table, count: Object.keys(tableTemplates).length },
    { id: 'widgets' as TabType, label: 'Widgets', icon: LayoutDashboard, count: Object.keys(widgetTemplates).length },
  ];

  const handleFormSubmit = (data: Record<string, unknown>) => {
    console.log('Form submitted:', data);
    alert('Form submitted successfully! Check console for data.');
  };

  const renderFormsList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(formTemplates).map(([key, template]) => (
        <Card
          key={key}
          className="cursor-pointer hover:border-primary-500 transition-colors"
          onClick={() => setSelectedForm(key as FormTemplateKey)}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-text-primary">
                {template.title}
              </h3>
              <ChevronRight className="text-text-secondary" size={20} />
            </div>
            <p className="text-sm text-text-secondary mb-3">
              {template.description}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="default" size="sm">
                {template.fields.length} fields
              </Badge>
              <span className="text-xs text-text-tertiary">
                {template.submitLabel}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderWizardsList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(wizardForms).map(([key, wizard]) => {
        const steps = Object.values(wizard);
        return (
          <Card
            key={key}
            className="cursor-pointer hover:border-primary-500 transition-colors"
            onClick={() => {
              setSelectedWizard(key as WizardFormKey);
              setWizardStep(0);
            }}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-text-primary capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                <ChevronRight className="text-text-secondary" size={20} />
              </div>
              <p className="text-sm text-text-secondary mb-3">
                Multi-step wizard with {steps.length} steps
              </p>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-text-tertiary">
                    <CheckCircle size={14} className="text-primary-500" />
                    <span>{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );

  const renderTablesList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(tableTemplates).map(([key, schema]) => (
        <Card
          key={key}
          className="cursor-pointer hover:border-primary-500 transition-colors"
          onClick={() => setSelectedTable(key as TableTemplateKey)}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-text-primary capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </h3>
              <ChevronRight className="text-text-secondary" size={20} />
            </div>
            <p className="text-sm text-text-secondary mb-3">
              Table schema with {schema.columns.length} columns
            </p>
            <div className="flex flex-wrap gap-1">
              {schema.columns.slice(0, 4).map((col) => (
                <Badge key={col.key} variant="default" size="sm">
                  {col.label}
                </Badge>
              ))}
              {schema.columns.length > 4 && (
                <Badge variant="default" size="sm">
                  +{schema.columns.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderWidgetsList = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Individual Widgets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(widgetTemplates).map(([key, widget]) => (
            <Card
              key={key}
              className="cursor-pointer hover:border-primary-500 transition-colors"
              onClick={() => setSelectedWidget(key as WidgetTemplateKey)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-semibold text-text-primary">
                    {widget.title}
                  </h4>
                  <ChevronRight className="text-text-secondary" size={20} />
                </div>
                <p className="text-sm text-text-secondary mb-3">
                  {widget.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    {widget.type}
                  </Badge>
                  <Badge variant="default" size="sm">
                    {widget.size}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Dashboard Collections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(dashboardCollections).map(([key, widgets]) => (
            <Card key={key}>
              <div className="p-4">
                <h4 className="text-lg font-semibold text-text-primary mb-2 capitalize">
                  {key} Dashboard
                </h4>
                <p className="text-sm text-text-secondary mb-3">
                  Pre-configured dashboard with {widgets.length} widgets
                </p>
                <div className="flex flex-wrap gap-1">
                  {widgets.map((widget, index) => (
                    <Badge key={index} variant="default" size="sm">
                      {widget.title}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSelectedForm = () => {
    if (!selectedForm) return null;
    const template = formTemplates[selectedForm];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">
            {template.title}
          </h2>
          <Button variant="ghost" onClick={() => setSelectedForm(null)}>
            Back to List
          </Button>
        </div>
        <Card>
          <div className="p-6">
            <DynamicForm schema={template} onSubmit={handleFormSubmit} />
          </div>
        </Card>
      </div>
    );
  };

  const renderSelectedWizard = () => {
    if (!selectedWizard) return null;
    const wizard = wizardForms[selectedWizard];
    const steps = Object.values(wizard);
    const currentStep = steps[wizardStep];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary capitalize">
            {selectedWizard.replace(/([A-Z])/g, ' $1').trim()}
          </h2>
          <Button variant="ghost" onClick={() => setSelectedWizard(null)}>
            Back to List
          </Button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <Fragment key={index}>
              <div
                className={`flex items-center gap-2 ${
                  index === wizardStep
                    ? 'text-primary-500'
                    : index < wizardStep
                    ? 'text-success-400'
                    : 'text-text-tertiary'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    index === wizardStep
                      ? 'bg-primary-500 text-white'
                      : index < wizardStep
                      ? 'bg-success-500 text-white'
                      : 'bg-dark-700 text-text-tertiary'
                  }`}
                >
                  {index < wizardStep ? <CheckCircle size={16} /> : index + 1}
                </div>
                <span className="text-sm font-medium hidden md:inline">
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-dark-700" />
              )}
            </Fragment>
          ))}
        </div>

        <Card>
          <div className="p-6">
            <DynamicForm
              schema={currentStep}
              onSubmit={(data) => {
                console.log(`Step ${wizardStep + 1} data:`, data);
                if (wizardStep < steps.length - 1) {
                  setWizardStep(wizardStep + 1);
                } else {
                  alert('Wizard completed! Check console for all data.');
                  setSelectedWizard(null);
                  setWizardStep(0);
                }
              }}
            />
            {wizardStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setWizardStep(wizardStep - 1)}
                className="mt-4"
              >
                Previous Step
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderSelectedTable = () => {
    if (!selectedTable) return null;
    const schema = tableTemplates[selectedTable];

    // Generate sample data
    const sampleData = Array.from({ length: 5 }, (_, i) => {
      const row: Record<string, unknown> = {};
      schema.columns.forEach((col) => {
        if (col.type === 'text') row[col.key] = `Sample ${i + 1}`;
        else if (col.type === 'number') row[col.key] = (i + 1) * 10;
        else if (col.type === 'currency') row[col.key] = (i + 1) * 100;
        else if (col.type === 'date') row[col.key] = new Date().toISOString();
        else row[col.key] = `Value ${i + 1}`;
      });
      row[schema.keyField] = `id-${i + 1}`;
      return row;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary capitalize">
            {selectedTable.replace(/([A-Z])/g, ' $1').trim()} Table
          </h2>
          <Button variant="ghost" onClick={() => setSelectedTable(null)}>
            Back to List
          </Button>
        </div>
        <Card>
          <div className="p-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <DynamicTable 
              schema={schema as any} 
              data={sampleData as any[]} 
            />
          </div>
        </Card>
      </div>
    );
  };

  const renderSelectedWidget = () => {
    if (!selectedWidget) return null;
    const widget = widgetTemplates[selectedWidget];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-text-primary">
            {widget.title}
          </h2>
          <Button variant="ghost" onClick={() => setSelectedWidget(null)}>
            Back to List
          </Button>
        </div>
        <div className="max-w-md">
          <DynamicWidget schema={widget} />
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-dark-700 bg-dark-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-text-primary">
          Template Showcase
        </h1>
        <p className="text-text-secondary mt-1">
          Explore all available templates for forms, wizards, tables, and widgets
        </p>
      </div>

      {/* Tabs */}
      {!selectedForm && !selectedWizard && !selectedTable && !selectedWidget && (
        <div className="flex-shrink-0 border-b border-dark-700 bg-dark-800 px-6">
          <div className="flex gap-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                  <Badge variant={activeTab === tab.id ? 'primary' : 'default'} size="sm">
                    {tab.count}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedForm && renderSelectedForm()}
        {selectedWizard && renderSelectedWizard()}
        {selectedTable && renderSelectedTable()}
        {selectedWidget && renderSelectedWidget()}

        {!selectedForm && !selectedWizard && !selectedTable && !selectedWidget && (
          <>
            {activeTab === 'forms' && renderFormsList()}
            {activeTab === 'wizards' && renderWizardsList()}
            {activeTab === 'tables' && renderTablesList()}
            {activeTab === 'widgets' && renderWidgetsList()}
          </>
        )}
      </div>
    </div>
  );
}
