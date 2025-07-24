export let LogLevel;
((LogLevel) => {
  LogLevel[(LogLevel.DEBUG = 0)] = 'DEBUG';
  LogLevel[(LogLevel.INFO = 1)] = 'INFO';
  LogLevel[(LogLevel.WARN = 2)] = 'WARN';
  LogLevel[(LogLevel.ERROR = 3)] = 'ERROR';
  LogLevel[(LogLevel.SILENT = 4)] = 'SILENT';
})(LogLevel || (LogLevel = {}));
//# sourceMappingURL=logger-types.js.map
