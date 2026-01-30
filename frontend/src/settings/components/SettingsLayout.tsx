/**
 * Settings Layout Component
 * Provides consistent layout for settings pages with sidebar navigation and search
 */

import React from 'react';
import { Input } from '../../components/ui/Input';
import { SettingGroup, SETTING_GROUPS } from '../types';
import styles from './SettingsLayout.module.css';

export interface SettingsLayoutProps {
  activeGroup: SettingGroup;
  onGroupChange: (group: SettingGroup) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  children: React.ReactNode;
}

export function SettingsLayout({
  activeGroup,
  onGroupChange,
  searchQuery,
  onSearchChange,
  children,
}: SettingsLayoutProps) {
  return (
    <div className={styles.settingsLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search settings"
          />
        </div>

        {/* Navigation */}
        <nav className={styles.nav} aria-label="Settings navigation">
          {SETTING_GROUPS.map((group) => (
            <button
              key={group.id}
              className={`${styles.navItem} ${activeGroup === group.id ? styles.active : ''}`}
              onClick={() => onGroupChange(group.id)}
              aria-current={activeGroup === group.id ? 'page' : undefined}
            >
              <div className={styles.navItemContent}>
                <span className={styles.navItemLabel}>{group.label}</span>
                <span className={styles.navItemDescription}>{group.description}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
