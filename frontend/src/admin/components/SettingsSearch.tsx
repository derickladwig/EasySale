import { useState, useEffect, useRef } from 'react';
import { Search, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchSettings, SettingIndexEntry } from '../utils/settingsIndex';
import { useDebounce } from '@common/hooks/useDebounce';

const RECENT_SEARCHES_KEY = 'settings_recent_searches';
const MAX_RECENT = 5;

export function SettingsSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300); // Debounce search by 300ms
  const [results, setResults] = useState<SettingIndexEntry[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      const searchResults = searchSettings(debouncedQuery);
      setResults(searchResults);
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  // Navigate to setting
  const navigateToSetting = (setting: SettingIndexEntry) => {
    saveRecentSearch(query);

    // Navigate with hash for scroll-to-element
    const settingId = setting.id;
    const pathWithHash = `${setting.path}#setting-${settingId}`;

    navigate(pathWithHash);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigateToSetting(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchQuery: string) => {
    setQuery(searchQuery);
    inputRef.current?.focus();
  };

  // Scope badge color - uses semantic theme tokens
  const getScopeBadgeColor = (scope: SettingIndexEntry['scope']) => {
    switch (scope) {
      case 'global':
        return 'bg-info-100 text-info-dark';
      case 'store':
        return 'bg-success-100 text-success-700';
      case 'station':
        return 'bg-purple-500/20 text-purple-400';
      case 'user':
        return 'bg-warning-100 text-warning-700';
    }
  };

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="Search settings..."
          className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Dropdown - uses dropdown z-index token */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute w-full mt-2 bg-surface-elevated border border-border rounded-xl max-h-96 overflow-y-auto"
          style={{ 
            zIndex: 'var(--z-dropdown)',
            boxShadow: 'var(--shadow-dropdown)'
          }}
        >
          {/* Results */}
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((setting, index) => (
                <button
                  key={setting.id}
                  onClick={() => navigateToSetting(setting)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-3 text-left hover:bg-surface-elevated transition-colors ${
                    index === selectedIndex ? 'bg-surface-elevated' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-text-primary">{setting.name}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${getScopeBadgeColor(
                            setting.scope
                          )}`}
                        >
                          {setting.scope}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-1">
                        {setting.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-text-tertiary">{setting.page}</span>
                        {setting.section && (
                          <>
                            <span className="text-xs text-text-tertiary">›</span>
                            <span className="text-xs text-text-tertiary">{setting.section}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-tertiary flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim().length > 0 ? (
            <div className="px-4 py-8 text-center text-text-secondary">
              <p>No settings found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          ) : null}

          {/* Recent Searches */}
          {query.trim().length === 0 && recentSearches.length > 0 && (
            <div className="py-2 border-t border-border">
              <div className="px-4 py-2 text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearchClick(search)}
                  className="w-full px-4 py-2 text-left hover:bg-surface-elevated transition-colors flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">{search}</span>
                </button>
              ))}
            </div>
          )}

          {/* Keyboard Hints */}
          <div className="px-4 py-2 border-t border-border bg-surface-elevated">
            <div className="flex items-center gap-4 text-xs text-text-tertiary">
              <span>
                <kbd className="px-1.5 py-0.5 bg-surface-base border border-border rounded">↑↓</kbd>{' '}
                Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-surface-base border border-border rounded">
                  Enter
                </kbd>{' '}
                Select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-surface-base border border-border rounded">
                  Esc
                </kbd>{' '}
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
