/** * Tasks for Gulp task runner.
 * @module Tasks
 * @author Paul Walton
 */

/* jshint ignore:start */

import glob from "glob";
import path from "path";
import through2 from "through2";

// Gulp
import gulp from "gulp";
import ifThen from "gulp-if";
import plumber from "gulp-plumber";
import lazypipe from "lazypipe";
import rename from "gulp-rename";

// Console & Logging
import log from "fancy-log";
import chalk from "chalk";
import size from "gulp-size";
import humanize from "humanize-duration";

// CSS
import dartSass from "sass";
import gulpSass from "gulp-sass";
const sass = gulpSass(dartSass);
import postCSS from "gulp-postcss";
import autoprefixer from "autoprefixer";
import cleanCSS from "gulp-clean-css";

// JS
import eslint from "gulp-eslint";
import { rollup, watch as rollupWatch } from "rollup";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import { terser } from "rollup-plugin-terser";
import svgr from "@svgr/rollup";

const env = process.env.NODE_ENV;

const pipelines = {
	/**
	 * Pipeline partial to handle errors.
	 * @function pipelines.errorHandler
	 */
	errorHandler: lazypipe().pipe(plumber, {
		errorHandler: function (err) {
			log.error(chalk.red(err));
			this.emit("end");
		},
	}),
	updateFileMTime: lazypipe().pipe(through2.obj, {
		function(file, _enc, cb) {
			var date = new Date();
			file.stat.atime = date;
			file.stat.mtime = date;
			cb(null, file);
		},
	}),
};

const stripCase = (str) =>
	str
		.replace(/([A-Z]+)/g, " $1")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

const upperCaseWords = (str) => str.replace(/\b\w/g, (match) => match.toUpperCase());
const titleCase = (str) => upperCaseWords(stripCase(str));
const pascalCase = (str) => titleCase(str).replace(/\s+/g, "");
const lowerCaseFirst = (str) => str.charAt(0).toLowerCase() + str.slice(1);
const camelCase = (str) => lowerCaseFirst(pascalCase(str));

let isProductionMode = env === "production";
if (isProductionMode) {
	log.info(chalk.bgYellow(chalk.black("[!] PRODUCTION MODE [!]")));
}

let isWatching = false;

/**
 * Preprocess CSS.
 * @example gulp styles
 * @global
 */
export function styles() {
	return gulp
		.src(["style.scss", "editor.scss"], { cwd: "src", sourcemaps: true })
		.pipe(pipelines.errorHandler())
		.pipe(sass.sync().on("error", sass.logError))
		.pipe(postCSS([autoprefixer()]))
		.pipe(pipelines.updateFileMTime())
		.pipe(
			cleanCSS({ compatibility: "*" }) // ~= IE 10+
		)
		.pipe(rename({ prefix: "blocks.", suffix: ".build" }))
		.pipe(size({ showFiles: true, showTotal: false, title: "Clean CSS ->" }))
		.pipe(gulp.dest("dist", { sourcemaps: isProductionMode && "." }));
}

/**
 * Lint JS with ESLint
 * @example gulp lint
 * @global
 */
export function lint() {
	const warn = (str) => log.warn(chalk.yellow(str));
	const error = (str) => log.warn(chalk.red(str));
	return gulp
		.src("**/*.@(js|jsx)", { cwd: "src" })
		.pipe(eslint({ fix: !isWatching }))
		.pipe(
			eslint.result((result) => {
				if (result.messages.length) {
					const file = path.relative(__dirname, result.filePath);
					const link = (msg) => chalk.underline(`${file}(${msg.line},${msg.column})`);
					result.messages.forEach((msg) => {
						switch (msg.severity) {
							case 1:
								warn(`${link(msg)}: ${msg.message}`);
								break;
							case 2:
								error(`${link(msg)}: ${msg.message}`);
								break;
						}
					});
				}
			})
		)
		.pipe(ifThen(!isWatching, gulp.dest("src")));
}

const rollupOptions = {
	input: {
		// external: ["jquery", "wp", /@wordpress\/(.*)/],
		external: (id) => {
			if (["jquery", "wp"].includes(id)) return true;
			return /^@wordpress\/(.*)$/.test(id) && "@wordpress/icons" !== id;
		},
		plugins: [
			replace({
				values: {
					"process.env.NODE_ENV": JSON.stringify(env),
				},
				preventAssignment: true,
			}),
			nodeResolve({
				extensions: [".mjs", ".js", ".json", ".node", ".jsx"],
			}),
			svgr(),
			json(),
			commonjs({
				sourceMap: false,
				exclude: "src/**",
			}),
			babel({
				exclude: "**/node_modules/**", // just in case
				babelHelpers: "bundled",
			}),
		],
		onwarn(warning) {
			log.warn(chalk.yellow(warning));
		},
	},
	output: {
		format: "iife",
		dir: "dist",
		entryFileNames: "[name].build.js",
		sourcemap: !isProductionMode && "inline",
		sourcemapExcludeSources: true,
		globals: {
			jquery: "jQuery",
			wp: "wp",
		},
		globals: (id) => {
			switch (id) {
				case "jquery":
					return "jQuery";
				case "wp":
					return "wp";
				default:
					return id.replace(/^@wordpress\/(.*)$/, (_match, pkg) => {
						return `wp.${camelCase(pkg)}`;
					});
			}
		},
		compact: isProductionMode,
		plugins: [
			terser({
				compress: { passes: 2 },
				mangle: isProductionMode,
			}),
		],
	},
};

/**
 * Roll up JavaScript.
 * * Rollup will only start with JS files in the root JS src folder.
 * * Rollup will not start with files named with a underscore prefix.
 * @example gulp bundleScripts
 * @global
 */
export function bundleScripts() {
	return Promise.all(
		glob.sync("!(_)*.@(js|jsx)", { cwd: "src" }).map((file) => {
			return rollup({
				input: `src/${file}`,
				...rollupOptions.input,
			}).then((bundle) => {
				return bundle.write({
					name: camelCase(file).replace(/\.js/i, "Js"),
					...rollupOptions.output,
				});
			});
			// .then((x) => console.dir(x));
		})
	);
}

/**
 * Roll up JavaScript.
 * * Rollup will only start with JS files in the root JS src folder.
 * * Rollup will not start with files named with a underscore prefix.
 * @example gulp watchScripts
 * @global
 */
export function watchScripts() {
	glob.sync("!(_)*.@(js|jsx)", { cwd: "src" }).map((file) => {
		const watcher = rollupWatch({
			input: `src/${file}`,
			...rollupOptions.input,
			output: {
				name: camelCase(file).replace(/\.js/i, "Js"),
				...rollupOptions.output,
			},
		});
		watcher.on("event", (event) => {
			switch (event.code) {
				case "START":
					break;
				case "BUNDLE_START":
					log.info(`Rolling up '${chalk.cyan(event.input)}'...`);
					break;
				case "BUNDLE_END":
					log.info(`Rolled up '${chalk.cyan(event.input)}' after ${chalk.magenta(humanize(event.duration))}`);
					if (event.result) {
						event.result.close();
					}
					break;
				case "END":
					break;
				case "ERROR":
					log.warn(chalk.red(event.error));
					break;
			}
		});
		return watcher;
	});
}

/**
 * Runs all script-related tasks.
 * @function scripts
 * @example gulp scripts
 * @global
 */
// export const scripts = gulp.series(lint, bundleScripts, minifyScripts);
export const scripts = gulp.series(lint, bundleScripts);

/**
 * Compile & process all assets.
 * @function build
 * @example gulp build
 * @global
 */
export const build = gulp.parallel(scripts, styles);

/**
 * Watch files for changes, running tasks accordingly.
 * @example gulp watch
 * @global
 */
export function watch() {
	isWatching = true;
	gulp.watch(`src/**/*.scss`, styles);
	gulp.watch(`src/**/*.@(js|jsx)`, lint);
	watchScripts();
}

export function watchStyles() {
	isWatching = true;
	gulp.watch(`src/**/*.scss`, styles);
}

/**
 * Compile all assets, and watch files for changes.
 * * Default task.
 * @function dev
 * @example gulp dev
 * @example gulp
 * @global
 */
export const dev = gulp.series(build, watch);
export default dev;
