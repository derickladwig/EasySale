import { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@common/components/atoms';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  description: string;
  product_count: number;
  children?: Category[];
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/product/categories', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCategories(buildCategoryTree(data));
      } else if (response.status === 404) {
        // Graceful fallback if endpoint not available
        console.warn('Categories endpoint not available');
        setCategories([]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildCategoryTree = (flatCategories: Category[]): Category[] => {
    const categoryMap = new Map<number, Category>();
    const rootCategories: Category[] = [];

    // Create map of all categories
    flatCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build tree structure
    flatCategories.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parent_id === null) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      }
    });

    return rootCategories;
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDelete = async (category: Category) => {
    if (category.product_count > 0) {
      alert(
        `Cannot delete category "${category.name}" because it contains ${category.product_count} products.`
      );
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        fetchCategories();
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to delete');
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category.id);

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-surface-elevated rounded-lg group"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="text-text-tertiary hover:text-text-secondary"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{category.name}</span>
              {category.product_count > 0 && (
                <span className="text-xs text-text-tertiary">
                  ({category.product_count} products)
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-text-secondary truncate">{category.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditingCategory(category)}
              className="p-1 text-text-tertiary hover:text-primary-600"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category)}
              className="p-1 text-text-tertiary hover:text-error-600"
              disabled={category.product_count > 0}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>{category.children!.map((child) => renderCategory(child, level + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="p-6 text-text-secondary">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-text-tertiary" />
          <h3 className="text-lg font-medium text-text-primary">Product Categories</h3>
        </div>
        <Button
          onClick={() => setEditingCategory({} as Category)}
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Category
        </Button>
      </div>

      {/* Category Tree */}
      <div className="p-4 bg-surface-base border border-border rounded-lg">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <p>No categories found</p>
            <p className="text-sm mt-1">Create your first category to organize products</p>
          </div>
        ) : (
          <div className="space-y-1">{categories.map((category) => renderCategory(category))}</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <CategoryEditorModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={() => {
            setEditingCategory(null);
            fetchCategories();
          }}
        />
      )}
    </div>
  );
}

// Category Editor Modal
interface CategoryEditorModalProps {
  category: Category;
  onClose: () => void;
  onSave: () => void;
}

function CategoryEditorModal({ category, onClose, onSave }: CategoryEditorModalProps) {
  const [formData, setFormData] = useState({
    name: category.name || '',
    description: category.description || '',
    parent_id: category.parent_id || null,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = category.id ? `/api/categories/${category.id}` : '/api/categories';
      const method = category.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to save');
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 'var(--z-modal)' }}>
      <div className="bg-surface-base rounded-lg max-w-md w-full p-6 border border-border" style={{ boxShadow: 'var(--shadow-modal)' }}>
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          {category.id ? 'Edit Category' : 'Add Category'}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}
