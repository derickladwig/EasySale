/**
 * Icon utilities for dynamic icon rendering.
 * 
 * Uses named imports instead of star imports to enable tree-shaking.
 * Only the icons actually used are included in the bundle.
 */

import {
  // Navigation
  Home,
  ShoppingCart,
  Search,
  Package,
  Users,
  BarChart3,
  Settings,
  // Actions
  Plus,
  Minus,
  X,
  Check,
  Edit,
  Trash2,
  Save,
  // Categories
  Tag,
  Car,
  Palette,
  Wrench,
  // UI Elements
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  // Status
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  // User
  User,
  LogOut,
  LogIn,
  // Payment
  CreditCard,
  Banknote,
  Receipt,
  Percent,
  // Layout
  Grid3X3,
  LayoutGrid,
  List,
  // Business
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building,
  Store,
  // Documents
  FileText,
  ClipboardList,
  Printer,
  Download,
  Upload,
  // Charts
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,
  // Inventory
  Box,
  Boxes,
  Warehouse,
  Truck,
  // Restaurant specific
  UtensilsCrossed,
  Coffee,
  Salad,
  Cookie,
  Cake,
  ChefHat,
  // Retail specific
  Shirt,
  Smartphone,
  Watch,
  Gift,
  // Misc
  Star,
  Heart,
  History,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  Zap,
  Sun,
  Moon,
  // Admin Navigation
  Wand2,
  Activity,
  Plug,
  Calculator,
  DollarSign,
  ClipboardCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon registry mapping string names to Lucide icon components.
 * Add new icons here as needed.
 */
const iconRegistry: Record<string, LucideIcon> = {
  // Navigation
  Home,
  ShoppingCart,
  Search,
  Package,
  Users,
  BarChart3,
  Settings,

  // Actions
  Plus,
  Minus,
  X,
  Check,
  Edit,
  Trash2,
  Save,

  // Categories
  Tag,
  Car,
  Palette,
  Wrench,

  // UI Elements
  Menu,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,

  // Status
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  AlertCircle,
  CheckCircle,
  Info,

  // User
  User,
  LogOut,
  LogIn,

  // Payment
  CreditCard,
  Banknote,
  Receipt,
  Percent,

  // Layout
  Grid3X3,
  LayoutGrid,
  List,

  // Business
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Building,
  Store,

  // Documents
  FileText,
  ClipboardList,
  Printer,
  Download,
  Upload,

  // Charts
  TrendingUp,
  TrendingDown,
  PieChart,
  LineChart,

  // Inventory
  Box,
  Boxes,
  Warehouse,
  Truck,

  // Restaurant specific
  UtensilsCrossed,
  Coffee,
  Salad,
  Cookie,
  Cake,
  ChefHat,

  // Retail specific
  Shirt,
  Smartphone,
  Watch,
  Gift,

  // Misc
  Star,
  Heart,
  History,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  Zap,
  Sun,
  Moon,

  // Admin Navigation (added for navigation-consolidation)
  Wand2,
  Activity,
  Plug,
  Calculator,
  DollarSign,
  ClipboardCheck,
};

/**
 * Get an icon component by name
 */
export function getIcon(name: string | undefined): LucideIcon | null {
  if (!name) return null;
  return iconRegistry[name] || null;
}

/**
 * Hook to get an icon component by name
 */
export function useIcon(name: string | undefined): LucideIcon | null {
  return getIcon(name);
}

/**
 * Dynamic Icon component that renders based on string name
 */
interface DynamicIconProps {
  name: string | undefined;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function DynamicIcon({ name, size = 24, className, strokeWidth }: DynamicIconProps) {
  // Get the icon component - this is a lookup, not component creation
  const Icon = name ? iconRegistry[name] : null;

  if (!Icon) {
    // Return a placeholder or null
    return null;
  }

  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}

/**
 * Check if an icon name is valid
 */
export function isValidIcon(name: string): boolean {
  return name in iconRegistry;
}

/**
 * Get all available icon names
 */
export function getAvailableIcons(): string[] {
  return Object.keys(iconRegistry);
}

export type { LucideIcon };
