import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

/**
 * API Key authentication middleware
 * 
 * Requires x-api-secret header to match the API_SECRET environment variable.
 * Used for simple API key authentication to protect backend routes.
 * 
 * Uses timing-safe comparison to prevent timing attacks.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiSecretHeader = req.headers['x-api-secret'];

  // Reject if header is missing, an array, or not a non-empty string
  if (!apiSecretHeader || Array.isArray(apiSecretHeader) || typeof apiSecretHeader !== 'string' || apiSecretHeader.length === 0) {
    throw new UnauthorizedError('Invalid or missing API secret');
  }

  // Hash both keys to ensure constant length for comparison
  // This prevents timing attacks that could leak key length information
  const keyHash = crypto.createHash('sha256').update(apiSecretHeader).digest();
  const envKeyHash = crypto.createHash('sha256').update(env.API_SECRET).digest();

  // Use timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(keyHash, envKeyHash)) {
    throw new UnauthorizedError('Invalid or missing API secret');
  }

  next();
};
