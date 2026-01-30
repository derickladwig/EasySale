/**
 * Settings Navigation Utilities
 *
 * Handles navigation to specific settings with scroll and highlight effects
 */

/**
 * Navigate to a setting and highlight it
 * @param path - The navigation path (e.g., '/admin/users-roles?tab=users')
 * @param settingId - Optional ID of the setting element to scroll to and highlight
 */
export function navigateToSetting(path: string, settingId?: string) {
  // Navigate to the path
  window.location.href = path;

  // If settingId provided, scroll and highlight after navigation
  if (settingId) {
    // Wait for navigation and DOM to be ready
    setTimeout(() => {
      scrollToAndHighlight(settingId);
    }, 500);
  }
}

/**
 * Scroll to an element and highlight it
 * @param elementId - The ID of the element to scroll to
 */
export function scrollToAndHighlight(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID "${elementId}" not found`);
    return;
  }

  // Scroll to element with smooth behavior
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  // Add highlight class
  element.classList.add('setting-highlight');

  // Remove highlight after animation
  setTimeout(() => {
    element.classList.remove('setting-highlight');
  }, 2000);
}

/**
 * Parse URL hash for setting ID and auto-scroll
 * Call this in useEffect on page load
 */
export function handleSettingHash() {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#setting-')) {
    const settingId = hash.substring(1); // Remove '#'
    setTimeout(() => {
      scrollToAndHighlight(settingId);
    }, 300);
  }
}

/**
 * Generate a setting element ID from a setting name
 * @param name - The setting name
 * @returns A valid HTML ID
 */
export function generateSettingId(name: string): string {
  return `setting-${name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')}`;
}
