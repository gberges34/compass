import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

/**
 * API Key authentication middleware
 * 
 * Requires x-api-key header to match the API_KEY environment variable.
 * Used for simple API key authentication to protect backend routes.
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.API_KEY) {
    throw new UnauthorizedError('Invalid or missing API key');
  }

  next();
};

