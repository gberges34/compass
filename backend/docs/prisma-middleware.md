# Prisma Error Handling Extension

## Overview

The `prismaErrorExtension` converts Prisma-specific errors to standardized AppError instances at the Prisma client level. This ensures consistent error handling across all database operations, including those inside transactions.

## Error Mappings

The extension handles the following Prisma errors:

| Prisma Code | Error Type | Description | Converted To |
|-------------|------------|-------------|--------------|
| **P2025** | Record not found | An operation failed because required records were not found | `NotFoundError(404)` |
| **P2002** | Unique constraint | A unique constraint violation occurred | Generic error with field details |
| **P2003** | Foreign key constraint | A foreign key constraint violation occurred | Generic error with field details |

## Implementation

### Using Prisma 6 Client Extensions

Prisma 6 replaced the deprecated `$use` middleware API with client extensions (`$extends`). Our error handling is implemented as a client extension:

```typescript
// backend/src/middleware/prismaErrorMiddleware.ts
export const prismaErrorExtension = Prisma.defineExtension({
  name: 'errorHandling',
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        try {
          return await query(args);
        } catch (error) {
          // Convert Prisma errors to AppErrors
          // ...
        }
      },
    },
  },
});
```

### Registration

The extension is registered in `src/prisma.ts`:

```typescript
import { prismaErrorExtension } from './middleware/prismaErrorMiddleware';

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // Apply error handling extension
  return client.$extends(prismaErrorExtension);
};

export const prisma = globalForPrisma.prisma || createPrismaClient();
```

## Benefits

### 1. Centralized Error Handling

All P2025 errors are caught and converted to `NotFoundError` without requiring manual checks in route handlers.

**Before:**
```typescript
const task = await prisma.task.findUnique({ where: { id } });
if (!task) throw new NotFoundError('Task');
await prisma.task.update({ where: { id }, data: { ... } });
```

**After:**
```typescript
// Automatically throws NotFoundError if task doesn't exist
await prisma.task.update({ where: { id }, data: { ... } });
```

### 2. Works Inside Transactions

The extension applies to all Prisma operations, including those inside `$transaction()`:

```typescript
await prisma.$transaction(async (tx) => {
  // If task doesn't exist, NotFoundError is thrown automatically
  await tx.task.update({ where: { id }, data: { status: 'DONE' } });
  await tx.postDoLog.create({ data: { ... } });
});
```

### 3. Consistent Error Format

All not-found errors follow the same format:

```json
{
  "error": "Task not found",
  "code": "NOT_FOUND"
}
```

Status: 404

### 4. Cleaner Route Code

Routes no longer need manual existence checks before updates/deletes:

```typescript
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateTaskSchema.parse(req.body);

  // No need for findUnique check - extension handles it
  const task = await prisma.task.update({
    where: { id },
    data: validatedData,
  });

  res.json(task);
}));
```

## Testing

Test the extension with:

```bash
cd backend
npx tsx test-prisma-middleware.ts
```

Expected output:
```
Testing Prisma middleware error handling...

Test 1: Update non-existent task
✅ PASS: NotFoundError thrown
   Message: Task not found
   Code: NOT_FOUND
   Status: 404

Test 2: Transaction with non-existent task
✅ PASS: NotFoundError thrown in transaction

Test 3: Delete non-existent task
✅ PASS: NotFoundError thrown for delete

Test 4: Normal operation
✅ PASS: Normal query works (found 1 tasks)

✅ All middleware tests passed!
```

## Express Error Handler

The Express error handler (`src/middleware/errorHandler.ts`) keeps P2025 handling as a fallback, but the extension should catch most cases:

```typescript
// P2025 is now caught by Prisma extension, but keep as fallback
// This handles any P2025 errors that might escape the extension
if (err.code === 'P2025') {
  return res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND'
  });
}
```

## Migration from Prisma 5

If you're upgrading from Prisma 5, note that:

1. **`$use` is deprecated** - Use `$extends` instead
2. **Middleware params are different** - Extensions use `{ operation, model, args, query }`
3. **Type safety is improved** - Extensions have better TypeScript support

## Limitations

1. The extension only applies to the Prisma client where it's registered
2. Raw queries (`$queryRaw`, `$executeRaw`) bypass the extension
3. Errors outside Prisma operations (e.g., network errors before reaching Prisma) are not caught

## References

- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)
- [Prisma Error Codes](https://www.prisma.io/docs/reference/api-reference/error-reference)
- [AppError Classes](../src/errors/AppError.ts)
