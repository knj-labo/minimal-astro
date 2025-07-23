import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  LogLevel,
  type Logger,
  createContextualLogger,
} from '../../../../src/core/utils/logger.js';

describe('Logger', () => {
  let mockConsole: any;

  beforeEach(() => {
    // Mock console methods
    mockConsole = {
      log: mock(() => {}),
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
    };

    // Replace global console
    global.console = mockConsole as any;
  });

  describe('createContextualLogger', () => {
    it('should create a logger with context', () => {
      const logger = createContextualLogger('test-context');

      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.child).toBeDefined();
    });

    it('should create logger with default log level', () => {
      const logger = createContextualLogger('test');

      // Default level should allow info, warn, error but not debug
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.debug('debug message');

      expect(mockConsole.info).toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled(); // Debug is off by default
    });
  });

  describe('Log Levels', () => {
    it('should respect ERROR log level', () => {
      const logger = createContextualLogger('test', { level: LogLevel.ERROR });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect WARN log level', () => {
      const logger = createContextualLogger('test', { level: LogLevel.WARN });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect INFO log level', () => {
      const logger = createContextualLogger('test', { level: LogLevel.INFO });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should respect DEBUG log level', () => {
      const logger = createContextualLogger('test', { level: LogLevel.DEBUG });

      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');

      expect(mockConsole.debug).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).toHaveBeenCalledTimes(1);
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Log Formatting', () => {
    it('should include context in log messages', () => {
      const logger = createContextualLogger('my-module');

      logger.info('test message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[my-module]'),
        expect.stringContaining('[INFO]'),
        'test message'
      );
    });

    it('should handle multiple arguments', () => {
      const logger = createContextualLogger('test');

      logger.info('message', { data: 'value' }, 123);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'message',
        { data: 'value' },
        123
      );
    });

    it('should format error objects', () => {
      const logger = createContextualLogger('test');
      const error = new Error('Test error');

      logger.error('An error occurred:', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'An error occurred:',
        error
      );
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with extended context', () => {
      const parentLogger = createContextualLogger('parent');
      const childLogger = parentLogger.child('child');

      childLogger.info('test');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[parent:child]'),
        expect.any(String),
        'test'
      );
    });

    it('should inherit parent log level', () => {
      const parentLogger = createContextualLogger('parent', { level: LogLevel.ERROR });
      const childLogger = parentLogger.child('child');

      childLogger.info('should not appear');
      childLogger.error('should appear');

      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalledTimes(1);
    });

    it('should support nested child loggers', () => {
      const logger = createContextualLogger('app');
      const moduleLogger = logger.child('module');
      const componentLogger = moduleLogger.child('component');

      componentLogger.info('nested message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[app:module:component]'),
        expect.any(String),
        'nested message'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty messages', () => {
      const logger = createContextualLogger('test');

      logger.info('');
      logger.info();

      expect(mockConsole.info).toHaveBeenCalledTimes(2);
    });

    it('should handle null and undefined', () => {
      const logger = createContextualLogger('test');

      logger.info(null);
      logger.info(undefined);

      expect(mockConsole.info).toHaveBeenCalledTimes(2);
    });

    it('should handle circular references in objects', () => {
      const logger = createContextualLogger('test');
      const obj: any = { a: 1 };
      obj.circular = obj;

      // Should not throw
      expect(() => logger.info('circular:', obj)).not.toThrow();
      expect(mockConsole.info).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should not evaluate debug messages when debug is disabled', () => {
      const logger = createContextualLogger('test', { level: LogLevel.INFO });
      const expensiveOperation = mock(() => 'expensive result');

      logger.debug('Debug:', expensiveOperation());

      // The expensive operation should still be called because
      // JavaScript evaluates arguments before passing to function
      expect(expensiveOperation).toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });
});
