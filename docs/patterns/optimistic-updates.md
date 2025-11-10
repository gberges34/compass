# Optimistic Updates Pattern

## Overview

All user interactions in Compass should show immediate visual feedback without requiring page refresh. This is achieved through React Query's optimistic updates and cache management.

## The Pattern

### 1. Define Mutations with Optimistic Updates

```typescript
export function useMutationName() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data) => api.mutationCall(data),

    // Step 1: Optimistic update BEFORE API call
    onMutate: async (variables) => {
      // Cancel ongoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: relevantKeys });

      // Snapshot current cache for rollback
      const allCachedQueries = queryClient.getQueriesData({ queryKey: relevantKeys });

      // Update cache optimistically
      allCachedQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, (old) => {
          // Apply optimistic update logic
          return updatedData;
        });
      });

      // Return context for error rollback
      return { allCachedQueries };
    },

    // Step 2: Handle errors with rollback
    onError: (err, variables, context) => {
      console.error('[mutationName] Error:', err);

      // Rollback to snapshot
      if (context?.allCachedQueries) {
        context.allCachedQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.showError('Operation failed');
    },

    // Step 3: Refetch on success to sync with server
    onSuccess: () => {
      // Use refetchQueries (not invalidateQueries) for immediate updates
      queryClient.refetchQueries({ queryKey: relevantKeys });
    },
  });
}
```

### 2. Use Mutations in Components

```typescript
const Component = () => {
  const mutation = useMutationName();

  const handleAction = async (data) => {
    try {
      await mutation.mutateAsync(data);
      toast.showSuccess('Success!');
    } catch (err) {
      // Error already handled in mutation
    }
  };

  return (
    <button
      onClick={() => handleAction(data)}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Loading...' : 'Action'}
    </button>
  );
};
```

## Key Principles

1. **Immediate Feedback**: UI updates before API responds
2. **Rollback on Error**: Failed operations revert to previous state
3. **Server Sync**: After success, refetch to ensure consistency
4. **All Caches**: Update all relevant cache entries, not just one
5. **Loading States**: Show loading indicators during mutations

## Examples

### Schedule Task
- **Optimistic**: Add scheduledStart to task in cache
- **Error**: Remove scheduledStart from task
- **Success**: Refetch to get server-confirmed time

### Delete Task
- **Optimistic**: Remove task from all cached lists
- **Error**: Restore task to original position
- **Success**: Refetch to confirm deletion

### Update Task
- **Optimistic**: Apply changes to task in cache
- **Error**: Revert to original values
- **Success**: Refetch to get server-confirmed data

## Common Pitfalls

### ❌ Using invalidateQueries instead of refetchQueries
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  // ^ This marks queries as stale but doesn't immediately refetch
}
```

### ✅ Use refetchQueries for immediate updates
```typescript
onSuccess: () => {
  queryClient.refetchQueries({ queryKey: taskKeys.lists() });
  // ^ This immediately refetches active queries
}
```

### ❌ Updating only one cache entry
```typescript
onMutate: async () => {
  const previousTasks = queryClient.getQueryData(taskKeys.list({ status: 'NEXT' }));
  queryClient.setQueryData(taskKeys.list({ status: 'NEXT' }), updatedData);
  // ^ This only updates one specific cache entry
}
```

### ✅ Update all cache entries
```typescript
onMutate: async () => {
  const allCachedQueries = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
  allCachedQueries.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, updatedData);
  });
  // ^ This updates all cached task lists
}
```

## Testing

Always test optimistic updates:

```typescript
it('should update cache optimistically before server responds', async () => {
  // Pre-populate cache
  queryClient.setQueryData(queryKey, initialData);

  // Mock slow API response
  jest.mocked(api.call).mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve(data), 100))
  );

  // Execute mutation
  result.current.mutate(variables);

  // Verify cache updated immediately (before API responds)
  await waitFor(() => {
    const cachedData = queryClient.getQueryData(queryKey);
    expect(cachedData).toEqual(optimisticData);
  });
});
```

## Migration Checklist

When migrating a page to React Query:

- [ ] Replace useState with useQuery for data fetching
- [ ] Replace manual API calls with useMutation hooks
- [ ] Add optimistic updates to all mutations
- [ ] Remove manual fetchData/refetch calls
- [ ] Add loading states (mutation.isPending)
- [ ] Add error handling in mutations
- [ ] Test all CRUD operations show immediate feedback
- [ ] Test error rollback works correctly
- [ ] Update tests to cover optimistic updates
