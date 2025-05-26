/**
 * Centralized logging utility for the video gallery application.
 * Provides color-coded logging for info, warnings, and errors.
 * Uses console.log with ANSI color codes via chalk for compatibility.
 *
 * @module lib/logger
 * @requires chalk
 */

import chalk from 'chalk';

export const logger = {
  info: (message: string) => console.log(chalk.cyan(`${new Date().toISOString()} INFO ${message}`)),
  warn: (message: string) => console.log(chalk.yellow(`${new Date().toISOString()} WARN ${message}`)),
  error: (message: string) => console.log(chalk.red(`${new Date().toISOString()} EROR ${message}`)),
};