// backend/src/middleware/__tests__/auth.test.ts
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../auth';
import { UnauthorizedError } from '../../errors/AppError';
import { env } from '../../config/env';

// Mock the env module
jest.mock('../../config/env', () => ({
  env: {
    API_SECRET: 'test-api-secret-12345',
  },
}));

describe('authMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockStatus = jest.fn().mockReturnThis();
    mockJson = jest.fn().mockReturnThis();
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
    mockNext = jest.fn();
    mockRequest = {
      headers: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('missing header', () => {
    it('should throw UnauthorizedError when x-api-secret header is missing', () => {
      mockRequest.headers = {};

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when x-api-secret header is undefined', () => {
      mockRequest.headers = {
        'x-api-secret': undefined,
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('array header', () => {
    it('should throw UnauthorizedError when x-api-secret is an array', () => {
      mockRequest.headers = {
        'x-api-secret': ['key1', 'key2'],
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when x-api-secret is an array with one element', () => {
      mockRequest.headers = {
        'x-api-secret': ['test-api-secret-12345'],
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('incorrect key', () => {
    it('should throw UnauthorizedError when key is incorrect (same length)', () => {
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret-99999', // Same length, different value
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when key is incorrect (different length)', () => {
      mockRequest.headers = {
        'x-api-secret': 'wrong-key', // Different length
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when key is empty string', () => {
      mockRequest.headers = {
        'x-api-secret': '',
      };

      expect(() => {
        authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(UnauthorizedError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('correct key', () => {
    it('should call next() when API key is correct', () => {
      mockRequest.headers = {
        'x-api-secret': 'test-api-secret-12345',
      };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
