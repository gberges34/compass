import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, Plus, Archive } from 'lucide-react';

import Card from '../components/Card';
import Button from '../components/Button';
import ToggleSwitch from '../components/ToggleSwitch';
import ConfirmationModal from '../components/ConfirmationModal';
import Select from '../components/Select';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useToast } from '../contexts/ToastContext';

import type { CategoryEntity } from '../types';
import { useCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useCategories';
import { CATEGORY_ACCENT_TOKENS, categoryAccentTokenConfig, getCategoryAccentTokenConfig } from '../lib/designTokens';

function buildDefaultCategoryName(existing: CategoryEntity[]): string {
  const base = 'New Category';
  const names = new Set(existing.map((c) => c.name.trim().toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;

  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base} ${i}`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now()}`;
}

function normalizeStopLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

type CategoryRowProps = {
  category: CategoryEntity;
  autoFocusName?: boolean;
  onAutoFocusComplete?: () => void;
  onArchiveToggle: (category: CategoryEntity, nextActive: boolean) => void;
  onFieldSave: (id: string, updates: CategoryPatch) => void;
  dragDisabled?: boolean;
};

type CategoryPatch = Partial<
  Pick<CategoryEntity, 'name' | 'icon' | 'color' | 'togglProjectId' | 'sortOrder' | 'isArchived'>
>;

function CategoryRow({
  category,
  autoFocusName,
  onAutoFocusComplete,
  onArchiveToggle,
  onFieldSave,
  dragDisabled = false,
}: CategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: dragDisabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState(category.name);
  const [icon, setIcon] = useState(category.icon);
  const [color, setColor] = useState(category.color);
  const [togglProjectId, setTogglProjectId] = useState(category.togglProjectId ?? '');

  useEffect(() => {
    setName(category.name);
    setIcon(category.icon);
    setColor(category.color);
    setTogglProjectId(category.togglProjectId ?? '');
  }, [category.id, category.name, category.icon, category.color, category.togglProjectId]);

  useEffect(() => {
    if (!autoFocusName) return;
    if (!nameInputRef.current) return;
    nameInputRef.current.focus();
    nameInputRef.current.select();
    onAutoFocusComplete?.();
  }, [autoFocusName, onAutoFocusComplete]);

  const accent = getCategoryAccentTokenConfig(color);

  const saveName = () => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setName(category.name);
      return;
    }
    if (normalizeStopLabel(trimmed) === normalizeStopLabel(category.name)) {
      setName(category.name);
      return;
    }
    onFieldSave(category.id, { name: trimmed });
  };

  const saveIcon = () => {
    const trimmed = icon.trim();
    if (!trimmed) {
      setIcon(category.icon);
      return;
    }
    if (trimmed === category.icon) return;
    onFieldSave(category.id, { icon: trimmed });
  };

  const saveTogglProjectId = () => {
    const normalized = togglProjectId.trim();
    const nextValue = normalized === '' ? null : normalized;
    if ((category.togglProjectId ?? null) === nextValue) return;
    onFieldSave(category.id, { togglProjectId: nextValue });
  };

  const handleColorChange = (next: string) => {
    setColor(next);
    if (next === category.color) return;
    onFieldSave(category.id, { color: next });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[44px_64px_minmax(160px,1fr)_220px_220px_120px_120px] items-center gap-12 px-16 py-12 border-b border-fog ${
        isDragging ? 'bg-cloud shadow-e02 rounded-default' : 'bg-snow hover:bg-cloud/40'
      }`}
    >
      <button
        type="button"
        className={`min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-default border border-stone bg-snow hover:bg-fog ${
          dragDisabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        aria-label="Reorder category"
        disabled={dragDisabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-20 h-20 text-slate" />
      </button>

      <input
        value={icon}
        onChange={(e) => setIcon(e.target.value)}
        onBlur={saveIcon}
        className="h-10 px-12 text-body bg-snow border border-stone rounded-default transition-all duration-micro focus:border-action focus:ring-2 focus:ring-action/20 w-full"
        aria-label="Category icon"
        title="Icon"
      />

      <input
        ref={nameInputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-10 px-12 text-body bg-snow border border-stone rounded-default transition-all duration-micro focus:border-action focus:ring-2 focus:ring-action/20 w-full"
        aria-label="Category name"
        disabled={category.isLocked}
        title={category.isLocked ? 'Locked categories can’t be renamed' : 'Name'}
      />

      <div className="flex items-center gap-12">
        <div className={`w-20 h-20 rounded-default border ${accent.bg} ${accent.border}`} aria-hidden="true" />
        <Select
          value={color}
          onChange={(e) => handleColorChange(e.target.value)}
          options={CATEGORY_ACCENT_TOKENS.map((token) => ({
            value: token,
            label: categoryAccentTokenConfig[token].label,
          }))}
          aria-label="Category color"
          className="w-full"
        />
      </div>

      <input
        value={togglProjectId}
        onChange={(e) => setTogglProjectId(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={saveTogglProjectId}
        inputMode="numeric"
        pattern="\\d*"
        placeholder="—"
        className="h-10 px-12 text-body bg-snow border border-stone rounded-default transition-all duration-micro focus:border-action focus:ring-2 focus:ring-action/20 w-full placeholder:text-slate/70"
        aria-label="Toggl project id"
      />

      <div className="flex items-center gap-8">
        {category.isLocked && (
          <span
            className="inline-flex items-center justify-center w-32 h-32 rounded-default bg-fog border border-stone"
            title="Locked"
            aria-label="Locked"
          >
            <Lock className="w-16 h-16 text-slate" />
          </span>
        )}
        {category.isArchived && (
          <span
            className="inline-flex items-center justify-center w-32 h-32 rounded-default bg-fog border border-stone"
            title="Archived"
            aria-label="Archived"
          >
            <Archive className="w-16 h-16 text-slate" />
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-8">
        <ToggleSwitch
          checked={!category.isArchived}
          onChange={(checked) => onArchiveToggle(category, checked)}
          disabled={category.isLocked}
          ariaLabel={category.isLocked ? 'Locked category' : category.isArchived ? 'Restore category' : 'Archive category'}
        />
      </div>
    </div>
  );
}

const CategoriesPage: React.FC = () => {
  const toast = useToast();
  const { data: categories = [], isLoading, error } = useCategories({ includeArchived: true });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showArchived, setShowArchived] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<CategoryEntity | null>(null);
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { activeCategories, archivedCategories } = useMemo(() => {
    const sorted = [...categories].sort((a, b) => {
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });

    return {
      activeCategories: sorted.filter((c) => !c.isArchived),
      archivedCategories: sorted.filter((c) => c.isArchived),
    };
  }, [categories]);

  const visibleArchived = showArchived ? archivedCategories : [];

  const handleFieldSave = (id: string, updates: CategoryPatch) => {
    updateCategory.mutate({ id, updates });
  };

  const handleAddCategory = async () => {
    try {
      const name = buildDefaultCategoryName(categories);
      const created = await createCategory.mutateAsync({
        name,
        color: 'sky',
        icon: '📁',
        togglProjectId: null,
      });
      setFocusCategoryId(created.id);
      toast.showSuccess('Category created');
    } catch (err: any) {
      toast.showError(err?.userMessage || 'Failed to create category');
    }
  };

  const handleArchiveToggle = (category: CategoryEntity, nextActive: boolean) => {
    if (category.isLocked) return;

    if (!nextActive && !category.isArchived) {
      setPendingArchive(category);
      return;
    }

    if (nextActive && category.isArchived) {
      handleFieldSave(category.id, { isArchived: false });
    }
  };

  const confirmArchive = async () => {
    if (!pendingArchive) return;
    try {
      await deleteCategory.mutateAsync(pendingArchive.id);
      toast.showSuccess('Category archived');
    } catch (err: any) {
      toast.showError(err?.userMessage || 'Failed to archive category');
    } finally {
      setPendingArchive(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = activeCategories.findIndex((c) => c.id === active.id);
    const newIndex = activeCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(activeCategories, oldIndex, newIndex);
    next.forEach((cat, index) => {
      if (cat.sortOrder !== index) {
        handleFieldSave(cat.id, { sortOrder: index });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-24">
        <LoadingSkeleton variant="card" count={1} />
        <LoadingSkeleton variant="card" count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load categories"
        description={error instanceof Error ? error.message : 'Please try again.'}
      />
    );
  }

  return (
    <div className="space-y-24">
      <Card padding="large">
        <div className="flex items-start justify-between gap-16">
          <div>
            <h1 className="text-h1 text-ink">Categories</h1>
            <p className="text-small text-slate mt-8">Manage icons, colors, Toggl project IDs, and ordering.</p>
          </div>

          <div className="flex items-center gap-16">
            <div className="flex items-center gap-12">
              <span className="text-small text-slate">Show archived</span>
              <ToggleSwitch checked={showArchived} onChange={setShowArchived} ariaLabel="Show archived categories" />
            </div>

            <Button variant="primary" onClick={handleAddCategory} disabled={createCategory.isPending}>
              <span className="inline-flex items-center gap-8">
                <Plus className="w-18 h-18" />
                New Category
              </span>
            </Button>
          </div>
        </div>
      </Card>

      {activeCategories.length === 0 && !showArchived ? (
        <EmptyState
          title="No categories yet"
          description="Create your first category to start organizing tasks and time."
        />
      ) : (
        <Card padding="none">
          <div className="px-16 py-12 border-b border-fog bg-cloud">
            <div className="grid grid-cols-[44px_64px_minmax(160px,1fr)_220px_220px_120px_120px] items-center gap-12 text-micro font-medium text-slate">
              <span aria-hidden="true" />
              <span>Icon</span>
              <span>Name</span>
              <span>Color</span>
              <span>Toggl ID</span>
              <span>Status</span>
              <span className="text-right">Active</span>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {activeCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  autoFocusName={focusCategoryId === category.id}
                  onAutoFocusComplete={() => setFocusCategoryId(null)}
                  onArchiveToggle={handleArchiveToggle}
                  onFieldSave={handleFieldSave}
                />
              ))}
            </SortableContext>
          </DndContext>

          {showArchived && (
            <>
              {visibleArchived.length > 0 && (
                <div className="px-16 py-12 border-b border-fog bg-cloud">
                  <p className="text-micro font-medium text-slate">Archived</p>
                </div>
              )}
              {visibleArchived.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  dragDisabled
                  onArchiveToggle={handleArchiveToggle}
                  onFieldSave={handleFieldSave}
                />
              ))}
            </>
          )}
        </Card>
      )}

      {pendingArchive && (
        <ConfirmationModal
          title="Archive category?"
          message={`Archive “${pendingArchive.name}”? You can restore it later.`}
          confirmLabel="Archive"
          cancelLabel="Cancel"
          onConfirm={() => void confirmArchive()}
          onCancel={() => setPendingArchive(null)}
          variant="danger"
        />
      )}
    </div>
  );
};

export default CategoriesPage;
