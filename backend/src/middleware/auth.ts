import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

/**
 * API Key authentication middleware
 * 
 * Requires x-api-key header to match the API_KEY environment variable.
 * Used for simple API key authentication to protect backend routes.
 * 
 * Uses timing-safe comparison to prevent timing attacks.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKeyHeader = req.headers['x-api-key'];

  // Reject if header is missing, an array, or not a non-empty string
  if (!apiKeyHeader || Array.isArray(apiKeyHeader) || typeof apiKeyHeader !== 'string' || apiKeyHeader.length === 0) {
    throw new UnauthorizedError('Invalid or missing API key');
  }

  // Hash both keys to ensure constant length for comparison
  // This prevents timing attacks that could leak key length information
  const keyHash = crypto.createHash('sha256').update(apiKeyHeader).digest();
  const envKeyHash = crypto.createHash('sha256').update(env.API_KEY).digest();

  // Use timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(keyHash, envKeyHash)) {
    throw new UnauthorizedError('Invalid or missing API key');
  }

  next();
};

