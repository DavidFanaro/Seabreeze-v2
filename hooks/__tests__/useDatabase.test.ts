/**
 * @file hooks/useDatabase.test.ts
 * @purpose Test suite for useDatabase hook ensuring proper database initialization and configuration.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';
import useDatabase, { dbname } from '../useDatabase';

const mockSQLiteClient = {
  execSync: jest.fn(),
  transaction: jest.fn(),
  closeSync: jest.fn(),
};

const mockDrizzleDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock the entire module after imports
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: jest.fn(),
}));

jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(),
}));

jest.mock('@/db/schema', () => ({
  chat: jest.fn(),
}));

const mockUseSQLiteContext = jest.mocked(useSQLiteContext);
const mockDrizzle = jest.mocked(drizzle);

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSQLiteContext.mockReturnValue(mockSQLiteClient as any);
  mockDrizzle.mockReturnValue(mockDrizzleDb as any);
});

describe('useDatabase', () => {
  describe('database name configuration', () => {
    it('should export correct database name', () => {
      expect(dbname).toBe('seabreeze');
    });

    it('should use consistent database name across calls', () => {
      const name1 = dbname;
      const name2 = dbname;
      expect(name1).toBe(name2);
      expect(name1).toBe('seabreeze');
    });
  });

  describe('hook behavior', () => {
    it('should return a database instance', () => {
      const { result } = renderHook(() => useDatabase());

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });

    it('should return same instance on multiple calls', () => {
      const { result: result1 } = renderHook(() => useDatabase());
      const { result: result2 } = renderHook(() => useDatabase());

      expect(result1.current).toBe(result2.current);
    });

    it('should be stable across re-renders', () => {
      const { result, rerender } = renderHook(() => useDatabase());

      const firstInstance = result.current;
      
      rerender(undefined);
      
      expect(result.current).toBe(firstInstance);
    });
  });

  describe('hook interface', () => {
    it('should be a function', () => {
      expect(typeof useDatabase).toBe('function');
    });

    it('should accept no parameters', () => {
      expect(() => {
        useDatabase();
      }).not.toThrow();
    });

    it('should return an object', () => {
      const { result } = renderHook(() => useDatabase());

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe('object');
    });
  });

  describe('initialization side effects', () => {
    it('should initialize without throwing errors', () => {
      expect(() => {
        renderHook(() => useDatabase());
      }).not.toThrow();
    });

    it('should have imported all dependencies successfully', () => {
      // If we get to this point, all imports were successful
      expect(dbname).toBe('seabreeze');
      expect(typeof useDatabase).toBe('function');
    });
  });
});
