/**
 * CategoryLookupPage - Product Hierarchy Browser
 * 
 * Provides a tree view of product categories with:
 * - Expandable/collapsible category tree
 * - Search and filter functionality
 * - Category attribute definitions
 * - Product count per category
 * - Admin editing capabilities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, ChevronDown, Folder, FolderOpen, Package, 
  Search, Plus, Edit2, Trash2, Save, X, Tag, Layers,
  Filter, RefreshCw
} from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import apiClient from '@common/utils/apiClient';
import { toast } from '@common/utils/toast';

// =============================================================================
// Types
// =============================================================================

interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  attributes?: CategoryAttribute[];
  productCount?: number;
  children?: Category[];
  isExpanded?: boolean;
}

interface CategoryAttribute {
  name: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required?: boolean;
}

interface CategoryTreeNode extends Category {
  level: number;
  children: CategoryTreeNode[];
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const categoryMap = new Map<string, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];
  
  // First pass: create nodes
  categories.forEach(cat => {
    categoryMap.set(cat.id, {
      ...cat,
      level: 0,
      children: [],
    });
  });
  
  // Second pass: build tree
  categories.forEach(cat => {
    const node = categoryMap.get(cat.id)!;
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      const parent = categoryMap.get(cat.parentId)!;
      node.level = parent.level + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  
  // Sort children alphabetically
  const sortChildren = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => sortChildren(node.children));
  };
  sortChildren(roots);
  
  return roots;
}

function flattenTree(nodes: CategoryTreeNode[], expanded: Set<string>): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  
  const traverse = (node: CategoryTreeNode) => {
    result.push(node);
    if (expanded.has(node.id) && node.children.length > 0) {
      node.children.forEach(traverse);
    }
  };
  
  nodes.forEach(traverse);
  return result;
}

// =============================================================================
// Components
// =============================================================================

interface CategoryRowProps {
  category: CategoryTreeNode;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onEdit?: () => void;
}

function CategoryRow({ 
  category, 
  isExpanded, 
  isSelected,
  onToggle, 
  onSelect,
  onEdit,
}: CategoryRowProps) {
  const hasChildren = category.children.length > 0;
  const indent = category.level * 24;
  
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
        isSelected 
          ? 'bg-accent/20 border-l-2 border-accent' 
          : 'hover:bg-surface-elevated border-l-2 border-transparent'
      }`}
      style={{ paddingLeft: `${indent + 12}px` }}
      onClick={onSelect}
    >
      {/* Expand/Collapse Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle();
        }}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
          hasChildren ? 'hover:bg-surface-base text-text-secondary' : 'text-transparent'
        }`}
      >
        {hasChildren && (
          isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
        )}
      </button>
      
      {/* Icon */}
      {hasChildren ? (
        isExpanded ? (
          <FolderOpen className="w-4 h-4 text-warning" />
        ) : (
          <Folder className="w-4 h-4 text-warning" />
        )
      ) : (
        <Tag className="w-4 h-4 text-accent" />
      )}
      
      {/* Name */}
      <span className="flex-1 text-sm text-text-primary truncate">{category.name}</span>
      
      {/* Product Count */}
      {category.productCount !== undefined && category.productCount > 0 && (
        <span className="text-xs text-text-muted px-1.5 py-0.5 bg-surface-base rounded">
          {category.productCount}
        </span>
      )}
      
      {/* Attributes Badge */}
      {category.attributes && category.attributes.length > 0 && (
        <span className="text-xs text-accent px-1.5 py-0.5 bg-accent/10 rounded">
          {category.attributes.length} attrs
        </span>
      )}
      
      {/* Edit Button */}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-base rounded transition-opacity"
        >
          <Edit2 className="w-3 h-3 text-text-muted" />
        </button>
      )}
    </div>
  );
}

interface CategoryDetailsPanelProps {
  category: CategoryTreeNode | null;
  onClose: () => void;
  onSave?: (category: Category) => void;
  isAdmin?: boolean;
}

function CategoryDetailsPanel({ 
  category, 
  onClose,
  onSave,
  isAdmin = false,
}: CategoryDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAttributes, setEditedAttributes] = useState<CategoryAttribute[]>([]);
  
  useEffect(() => {
    if (category) {
      setEditedName(category.name);
      setEditedDescription(category.description || '');
      setEditedAttributes(category.attributes || []);
      setIsEditing(false);
    }
  }, [category]);
  
  if (!category) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted">
        <div className="text-center">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a category to view details</p>
        </div>
      </div>
    );
  }
  
  const handleSave = () => {
    if (onSave) {
      onSave({
        ...category,
        name: editedName,
        description: editedDescription,
        attributes: editedAttributes,
      });
    }
    setIsEditing(false);
  };
  
  const addAttribute = () => {
    setEditedAttributes([
      ...editedAttributes,
      { name: '', type: 'text', required: false },
    ]);
  };
  
  const updateAttribute = (index: number, updates: Partial<CategoryAttribute>) => {
    const newAttrs = [...editedAttributes];
    newAttrs[index] = { ...newAttrs[index], ...updates };
    setEditedAttributes(newAttrs);
  };
  
  const removeAttribute = (index: number) => {
    setEditedAttributes(editedAttributes.filter((_, i) => i !== index));
  };
  
  return (
    <div className="flex-1 border-l border-border bg-surface-base overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {category.children.length > 0 ? (
            <Folder className="w-5 h-5 text-warning" />
          ) : (
            <Tag className="w-5 h-5 text-accent" />
          )}
          {isEditing ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-lg font-medium bg-surface-elevated border border-border rounded px-2 py-1 text-text-primary"
            />
          ) : (
            <h2 className="text-lg font-medium text-text-primary">{category.name}</h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-surface-elevated rounded"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Info */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">Information</h3>
          <div className="bg-surface-elevated rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">ID</span>
              <code className="text-text-tertiary bg-surface-base px-1 rounded">{category.id}</code>
            </div>
            {category.parentId && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Parent ID</span>
                <code className="text-text-tertiary bg-surface-base px-1 rounded">{category.parentId}</code>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Level</span>
              <span className="text-text-primary">{category.level}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Subcategories</span>
              <span className="text-text-primary">{category.children.length}</span>
            </div>
            {category.productCount !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Products</span>
                <span className="text-accent font-medium">{category.productCount}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
          {isEditing ? (
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-lg p-3 text-sm text-text-primary resize-none"
              rows={3}
              placeholder="Category description..."
            />
          ) : (
            <p className="text-sm text-text-muted bg-surface-elevated rounded-lg p-3">
              {category.description || 'No description'}
            </p>
          )}
        </div>
        
        {/* Attributes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-text-secondary">Attributes</h3>
            {isEditing && (
              <Button variant="outline" size="sm" onClick={addAttribute}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            )}
          </div>
          
          {editedAttributes.length > 0 ? (
            <div className="space-y-2">
              {editedAttributes.map((attr, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 bg-surface-elevated rounded-lg p-2"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={attr.name}
                        onChange={(e) => updateAttribute(index, { name: e.target.value })}
                        placeholder="Attribute name"
                        className="flex-1 bg-surface-base border border-border rounded px-2 py-1 text-sm text-text-primary"
                      />
                      <select
                        value={attr.type}
                        onChange={(e) => updateAttribute(index, { type: e.target.value as CategoryAttribute['type'] })}
                        className="bg-surface-base border border-border rounded px-2 py-1 text-sm text-text-primary"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="select">Select</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs text-text-muted">
                        <input
                          type="checkbox"
                          checked={attr.required || false}
                          onChange={(e) => updateAttribute(index, { required: e.target.checked })}
                          className="rounded"
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="p-1 hover:bg-error/20 rounded text-error"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-text-primary">{attr.name}</span>
                      <span className="text-xs text-text-muted px-1.5 py-0.5 bg-surface-base rounded">
                        {attr.type}
                      </span>
                      {attr.required && (
                        <span className="text-xs text-error px-1.5 py-0.5 bg-error/10 rounded">
                          required
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted bg-surface-elevated rounded-lg p-3 text-center">
              No attributes defined
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CategoryLookupPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<CategoryTreeNode | null>(null);
  const [showEmptyCategories, setShowEmptyCategories] = useState(true);
  
  // Build tree from flat categories
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  
  // Filter and flatten tree for display
  const visibleCategories = useMemo(() => {
    let filtered = categoryTree;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchingIds = new Set<string>();
      
      // Find all matching categories and their ancestors
      const findMatches = (nodes: CategoryTreeNode[], ancestors: string[] = []) => {
        nodes.forEach(node => {
          if (node.name.toLowerCase().includes(query) || 
              node.id.toLowerCase().includes(query)) {
            matchingIds.add(node.id);
            ancestors.forEach(id => matchingIds.add(id));
          }
          findMatches(node.children, [...ancestors, node.id]);
        });
      };
      findMatches(categoryTree);
      
      // Filter tree to only show matching branches
      const filterTree = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
        return nodes
          .filter(node => matchingIds.has(node.id))
          .map(node => ({
            ...node,
            children: filterTree(node.children),
          }));
      };
      filtered = filterTree(categoryTree);
      
      // Auto-expand matching categories
      const newExpanded = new Set(expandedIds);
      matchingIds.forEach(id => newExpanded.add(id));
      if (newExpanded.size !== expandedIds.size) {
        setExpandedIds(newExpanded);
      }
    }
    
    // Filter empty categories if option is disabled
    if (!showEmptyCategories) {
      const filterEmpty = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
        return nodes
          .filter(node => (node.productCount || 0) > 0 || node.children.length > 0)
          .map(node => ({
            ...node,
            children: filterEmpty(node.children),
          }));
      };
      filtered = filterEmpty(filtered);
    }
    
    return flattenTree(filtered, expandedIds);
  }, [categoryTree, searchQuery, expandedIds, showEmptyCategories]);
  
  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);
  
  const loadCategories = async () => {
    setLoading(true);
    try {
      // Get categories from config
      const config = await apiClient.get<{ categories?: Category[] }>('/api/config');
      
      // Get product counts per category
      const products = await apiClient.get<{ items: Array<{ category: string }> }>('/api/products?limit=10000');
      
      const countMap = new Map<string, number>();
      products?.items?.forEach(p => {
        const count = countMap.get(p.category) || 0;
        countMap.set(p.category, count + 1);
      });
      
      // Merge counts into categories
      const categoriesWithCounts = (config?.categories || []).map(cat => ({
        ...cat,
        productCount: countMap.get(cat.id) || 0,
      }));
      
      setCategories(categoriesWithCounts);
      
      // Auto-expand first level
      const firstLevelIds = categoriesWithCounts
        .filter(c => !c.parentId)
        .map(c => c.id);
      setExpandedIds(new Set(firstLevelIds));
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };
  
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CategoryTreeNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        collectIds(node.children);
      });
    };
    collectIds(categoryTree);
    setExpandedIds(allIds);
  };
  
  const collapseAll = () => {
    setExpandedIds(new Set());
  };
  
  const handleSaveCategory = async (updatedCategory: Category) => {
    try {
      // In a real implementation, this would call the API to update the category
      toast.success(`Category "${updatedCategory.name}" updated`);
      
      // Update local state
      setCategories(prev => prev.map(c => 
        c.id === updatedCategory.id ? updatedCategory : c
      ));
      
      // Update selected category
      if (selectedCategory?.id === updatedCategory.id) {
        setSelectedCategory({
          ...selectedCategory,
          ...updatedCategory,
        });
      }
    } catch (error) {
      toast.error('Failed to update category');
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-accent" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Category Hierarchy</h1>
            <p className="text-sm text-text-muted">
              {categories.length} categories • {visibleCategories.length} visible
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCategories}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-surface-elevated">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-9 pr-4 py-2 bg-surface-base border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        
        {/* Filters */}
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={showEmptyCategories}
            onChange={(e) => setShowEmptyCategories(e.target.checked)}
            className="rounded border-border"
          />
          Show empty
        </label>
        
        {/* Expand/Collapse */}
        <div className="flex items-center gap-1 border-l border-border pl-3">
          <button
            type="button"
            onClick={expandAll}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-base rounded transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-surface-base rounded transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree View */}
        <div className="w-80 flex-shrink-0 border-r border-border overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 text-accent animate-spin" />
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted p-4">
              <Folder className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-center">
                {searchQuery ? 'No categories match your search' : 'No categories found'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {visibleCategories.map(category => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  isExpanded={expandedIds.has(category.id)}
                  isSelected={selectedCategory?.id === category.id}
                  onToggle={() => toggleExpanded(category.id)}
                  onSelect={() => setSelectedCategory(category)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Details Panel */}
        <CategoryDetailsPanel
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
          onSave={handleSaveCategory}
          isAdmin={true}
        />
      </div>
    </div>
  );
}

export default CategoryLookupPage;
