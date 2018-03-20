/* eslint-env browser */
'use strict';

const {format, inspect} = require('util');

const LOG_LEVELS = {
	trace: 0,
	debug: 1,
	info: 2,
	warn: 3,
	error: 4,
	_infinite: Infinity
};

/**
 * Enum logging level values.
 * @enum {String}
 */
const ENUM_LEVELS = { // eslint-disable-line no-unused-vars
	trace: 'The highest level of logging, logs everything.',
	debug: 'Less spammy than trace, includes most info relevant for debugging.',
	info: 'The default logging level. Logs useful info, warnings, and errors.',
	warn: 'Only logs warnings and errors.',
	error: 'Only logs errors.'
};

/**
 * A factory that configures and returns a Logger constructor.
 * @param [initialOpts] {Object} - Configuration for the logger.
 *
 * @param [initialOpts.console] {Object} - Configuration for the console logging.
 * @param [initialOpts.console.enabled=false] {Boolean} - Whether to enable console logging.
 * @param [initialOpts.console.level="info"] {ENUM_LEVELS} - The level of logging to output to the console.
 *
 * @param [initialOpts.replicants=false] {Boolean} - Whether to enable logging specifically for the Replicants system.
 *
 * @param [Raven] {Object} - A pre-configured client-side Raven instance, for reporting errors to Sentry.io
 *
 * @returns {function} - A constructor used to create discrete logger instances.
 */
module.exports = function (initialOpts, Raven) {
	initialOpts = initialOpts || {};
	initialOpts.console = initialOpts.console || {};

	/**
	 * Constructs a new Logger instance that prefixes all output with the given name.
	 * @param name {String} - The label to prefix all output of this logger with.
	 * @returns {Object} - A Logger instance.
	 * @constructor
	 */
	class Logger {
		constructor(name) {
			this.name = name;
		}

		_invoke(logLevel, args, prefix = `[${this.name}]`) {
			const stackTrace = (new Error().stack || '').split('\n');
			let caller = stackTrace.length >= 4 ? stackTrace[3] : '';

			caller = caller.replace(/^ *at /, ''); // Chrome.
			caller = caller.replace(/^ *@/, ''); // Firefox.

			// FUTURE: Consider using https://github.com/stacktracejs/stacktrace.js

			const logMessage = [prefix].concat(Array.prototype.slice.call(args).concat([caller]));

			if (console.log.apply) {
				console[logLevel].apply(console, logMessage);
			} else {
				console(logMessage);
			}
		}

		trace() {
			if (Logger._silent) {
				return;
			}

			if (LOG_LEVELS[Logger._level] > LOG_LEVELS.trace) {
				return;
			}

			this._invoke('info', arguments);
		}

		debug() {
			if (Logger._silent) {
				return;
			}

			if (LOG_LEVELS[Logger._level] > LOG_LEVELS.debug) {
				return;
			}

			this._invoke('info', arguments);
		}

		info() {
			if (Logger._silent) {
				return;
			}

			if (LOG_LEVELS[Logger._level] > LOG_LEVELS.info) {
				return;
			}

			this._invoke('info', arguments);
		}

		warn() {
			if (Logger._silent) {
				return;
			}

			if (LOG_LEVELS[Logger._level] > LOG_LEVELS.warn) {
				return;
			}

			this._invoke('warn', arguments);
		}

		error() {
			if (Logger._silent) {
				return;
			}

			if (LOG_LEVELS[Logger._level] > LOG_LEVELS.error) {
				return;
			}

			this._invoke('error', arguments);

			if (Raven) {
				const formattedArgs = Array.from(arguments).map(argument => {
					return typeof argument === 'object' ?
						inspect(argument, {depth: null, showProxy: true}) :
						argument;
				});

				Raven.captureException(new Error(format(`[${this.name}]`, ...formattedArgs)), {
					logger: 'client @nodecg/logger'
				});
			}
		}

		replicants() {
			if (Logger._silent) {
				return;
			}

			if (!Logger._shouldLogReplicants) {
				return;
			}

			this._invoke('info', arguments);
		}

		static globalReconfigure(opts) {
			_configure(opts);
		}
	}

	// Initialize with defaults
	Logger._level = 'info';
	Logger._silent = true;
	Logger._shouldLogReplicants = false;

	_configure(initialOpts);

	function _configure(opts) {
		// Initialize opts with empty objects, if nothing was provided.
		opts = opts || {};
		opts.console = opts.console || {};

		if (typeof opts.console.enabled !== 'undefined') {
			Logger._silent = !opts.console.enabled;
		}

		if (typeof opts.console.level !== 'undefined') {
			Logger._level = opts.console.level;
		}

		if (typeof opts.replicants !== 'undefined') {
			Logger._shouldLogReplicants = opts.replicants;
		}
	}

	return Logger;
};

