import { useState } from 'react';
import { Tabs } from '@common/components/organisms';
import { UsersTab } from '../components/UsersTab';
import { RolesTab } from '../components/RolesTab';
import { AuditLogTab } from '../components/AuditLogTab';

export function UsersRolesPage() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    {
      id: 'users',
      label: 'Users',
    },
    {
      id: 'roles',
      label: 'Roles',
    },
    {
      id: 'audit',
      label: 'Audit Log',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab />;
      case 'roles':
        return <RolesTab />;
      case 'audit':
        return <AuditLogTab />;
      default:
        return <UsersTab />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs items={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 p-6">{renderTabContent()}</div>
    </div>
  );
}
