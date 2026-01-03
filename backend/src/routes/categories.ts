import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { cacheControl, CachePolicies } from '../middleware/cacheControl';

const router = Router();

const CATEGORY_ACCENT_TOKENS = [
  'mint',
  'sky',
  'lavender',
  'blush',
  'sun',
  'rose',
  'peach',
  'apricot',
  'butter',
  'lime',
  'pistachio',
  'leaf',
  'spearmint',
  'jade',
  'aqua',
  'glacier',
  'ice',
  'azure',
  'periwinkle',
  'iris',
  'lilac',
  'orchid',
  'mauve',
  'pink',
  'petal',
] as const;

const colorTokenEnum = z.enum(CATEGORY_ACCENT_TOKENS);

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function toNameKey(value: string): string {
  return normalizeName(value).toLowerCase();
}

function normalizeTogglProjectId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const idParamSchema = z.object({ id: z.string().uuid() });

const createCategorySchema = z.object({
  name: z.string().min(1),
  color: colorTokenEnum,
  icon: z.string().min(1).max(8),
  togglProjectId: z.string().regex(/^\d+$/).optional().nullable().or(z.literal('')),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  color: colorTokenEnum.optional(),
  icon: z.string().min(1).max(8).optional(),
  togglProjectId: z.string().regex(/^\d+$/).optional().nullable().or(z.literal('')),
  isArchived: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.get(
  '/',
  cacheControl(CachePolicies.LONG),
  asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(categories);
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const input = createCategorySchema.parse(req.body);
    const name = normalizeName(input.name);
    const nameKey = toNameKey(name);
    const togglProjectId = normalizeTogglProjectId(input.togglProjectId);

    try {
      const created = await prisma.category.create({
        data: {
          name,
          nameKey,
          color: input.color,
          icon: input.icon,
          togglProjectId: togglProjectId ?? null,
        },
      });
      res.status(201).json(created);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestError('Category name already exists');
      }
      throw error;
    }
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const input = updateCategorySchema.parse(req.body);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category');

    const wantsArchive = input.isArchived === true;
    if (existing.isLocked) {
      if (input.name !== undefined) {
        throw new BadRequestError('This category is locked and cannot be renamed');
      }
      if (wantsArchive) {
        throw new BadRequestError('This category is locked and cannot be archived');
      }
    }

    const data: Record<string, any> = {};
    if (input.name !== undefined) {
      const name = normalizeName(input.name);
      data.name = name;
      data.nameKey = toNameKey(name);
    }
    if (input.color !== undefined) data.color = input.color;
    if (input.icon !== undefined) data.icon = input.icon;
    if (input.togglProjectId !== undefined) {
      data.togglProjectId = normalizeTogglProjectId(input.togglProjectId) ?? null;
    }
    if (input.isArchived !== undefined) data.isArchived = input.isArchived;
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

    try {
      const updated = await prisma.category.update({
        where: { id },
        data,
      });
      res.json(updated);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestError('Category name already exists');
      }
      throw error;
    }
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category');
    if (existing.isLocked) {
      throw new BadRequestError('This category is locked and cannot be archived');
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { isArchived: true },
    });
    res.json(updated);
  })
);

export default router;

