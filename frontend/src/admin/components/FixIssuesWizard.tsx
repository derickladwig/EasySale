import { useState } from 'react';
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
import { AlertCircle, CheckCircle, Store, Monitor } from 'lucide-react';
import { User } from '../hooks/useUsers';

interface FixIssuesWizardProps {
  isOpen: boolean;
  onClose: () => void;
  problematicUsers: User[];
  stores: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string; store_id: string }>;
  onFixIssues: (
    fixes: Array<{ userId: string; storeId?: string; stationId?: string }>
  ) => Promise<void>;
}

export function FixIssuesWizard({
  isOpen,
  onClose,
  problematicUsers,
  stores,
  stations,
  onFixIssues,
}: FixIssuesWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [fixes, setFixes] = useState<Record<string, { storeId?: string; stationId?: string }>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Group users by issue type
  const usersNeedingStore = problematicUsers.filter((user) => {
    const roleRequiresStore = [
      'cashier',
      'manager',
      'specialist',
      'technician',
    ].includes(user.role);
    return roleRequiresStore && !user.store_id;
  });

  const usersNeedingStation = problematicUsers.filter((user) => {
    return user.station_policy === 'specific' && !user.station_id;
  });

  const totalSteps =
    (usersNeedingStore.length > 0 ? 1 : 0) + (usersNeedingStation.length > 0 ? 1 : 0);

  const handleSetStore = (userId: string, storeId: string) => {
    setFixes((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], storeId },
    }));
  };

  const handleSetStation = (userId: string, stationId: string) => {
    setFixes((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], stationId },
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setIsProcessing(true);
    try {
      const fixArray = Object.entries(fixes).map(([userId, fix]) => ({
        userId,
        ...fix,
      }));
      await onFixIssues(fixArray);
      onClose();
      setFixes({});
      setCurrentStep(0);
    } catch (error) {
      console.error('Failed to fix issues:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStoreAssignment = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-warning-900">Store Assignment Required</h4>
          <p className="text-sm text-warning-700 mt-1">
            {usersNeedingStore.length} user{usersNeedingStore.length !== 1 ? 's' : ''} need
            {usersNeedingStore.length === 1 ? 's' : ''} a store assignment for POS operations.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {usersNeedingStore.map((user) => (
          <div key={user.id} className="p-4 border border-secondary-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium text-secondary-900">{user.username}</div>
                <div className="text-sm text-secondary-600 capitalize">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
              <Store className="w-5 h-5 text-secondary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Assign Store
              </label>
              <select
                value={fixes[user.id]?.storeId || ''}
                onChange={(e) => handleSetStore(user.id, e.target.value)}
                className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStationAssignment = () => (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-warning-900">Station Assignment Required</h4>
          <p className="text-sm text-warning-700 mt-1">
            {usersNeedingStation.length} user{usersNeedingStation.length !== 1 ? 's' : ''} need
            {usersNeedingStation.length === 1 ? 's' : ''} a specific station assignment.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {usersNeedingStation.map((user) => {
          const userStoreId = fixes[user.id]?.storeId || user.store_id;
          const availableStations = userStoreId
            ? stations.filter((s) => s.store_id === userStoreId)
            : [];

          return (
            <div key={user.id} className="p-4 border border-secondary-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-secondary-900">{user.username}</div>
                  <div className="text-sm text-secondary-600 capitalize">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
                <Monitor className="w-5 h-5 text-secondary-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Assign Station
                </label>
                <select
                  value={fixes[user.id]?.stationId || ''}
                  onChange={(e) => handleSetStation(user.id, e.target.value)}
                  disabled={!userStoreId}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-50 disabled:text-secondary-400"
                >
                  <option value="">Select a station</option>
                  {availableStations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                {!userStoreId && (
                  <p className="text-xs text-secondary-500 mt-1">
                    Assign a store first to see available stations
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSummary = () => {
    const fixCount = Object.keys(fixes).length;
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-success-50 border border-success-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-success-900">Ready to Fix Issues</h4>
            <p className="text-sm text-success-700 mt-1">
              {fixCount} user{fixCount !== 1 ? 's' : ''} will be updated with the assignments you've
              configured.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(fixes).map(([userId, fix]) => {
            const user = problematicUsers.find((u) => u.id === userId);
            if (!user) return null;

            return (
              <div key={userId} className="p-3 border border-secondary-200 rounded-lg">
                <div className="font-medium text-secondary-900">{user.username}</div>
                <div className="text-sm text-secondary-600 mt-1 space-y-1">
                  {fix.storeId && (
                    <div>Store: {stores.find((s) => s.id === fix.storeId)?.name}</div>
                  )}
                  {fix.stationId && (
                    <div>Station: {stations.find((s) => s.id === fix.stationId)?.name}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCurrentStep = () => {
    let stepIndex = 0;

    if (usersNeedingStore.length > 0) {
      if (currentStep === stepIndex) return renderStoreAssignment();
      stepIndex++;
    }

    if (usersNeedingStation.length > 0) {
      if (currentStep === stepIndex) return renderStationAssignment();
      stepIndex++;
    }

    return renderSummary();
  };

  const canProceed = () => {
    if (currentStep === 0 && usersNeedingStore.length > 0) {
      return usersNeedingStore.every((user) => fixes[user.id]?.storeId);
    }
    if (currentStep === 1 && usersNeedingStation.length > 0) {
      return usersNeedingStation.every((user) => fixes[user.id]?.stationId);
    }
    return true;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fix User Issues" size="lg">
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-secondary-600">
            Step {currentStep + 1} of {totalSteps + 1}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: totalSteps + 1 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === currentStep ? 'bg-primary-600' : 'bg-secondary-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current step content */}
        {renderCurrentStep()}

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t border-secondary-200">
          <Button
            onClick={currentStep === 0 ? onClose : handleBack}
            variant="secondary"
            disabled={isProcessing}
          >
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button
            onClick={currentStep === totalSteps ? handleFinish : handleNext}
            variant="primary"
            disabled={!canProceed() || isProcessing}
          >
            {isProcessing ? 'Processing...' : currentStep === totalSteps ? 'Fix Issues' : 'Next'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
