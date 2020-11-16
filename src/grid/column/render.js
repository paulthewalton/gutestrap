import classNames from "classnames";
import { InnerBlocks } from "@wordpress/block-editor";
import {
	COLUMN_OPTION_INHERIT,
	COLUMN_OPTION_WIDTH_DEFAULT,
	COLUMN_OPTION_WIDTH_FIT,
} from "./column-width-offset-control";

const columnWidthSuffix = (width) => {
	switch (width) {
		case COLUMN_OPTION_WIDTH_DEFAULT:
			return "";
		case COLUMN_OPTION_WIDTH_FIT:
			return "-auto";
		default:
			return `-${width}`;
	}
};

export const columnClassNames = ({ width = {}, offset = {} }) => {
	return classNames({
		[`col${columnWidthSuffix(width.xs || COLUMN_OPTION_WIDTH_DEFAULT)}`]: true,
		[`col-sm${columnWidthSuffix(width.sm)}`]: width.sm != null && width.sm !== COLUMN_OPTION_INHERIT,
		[`col-md${columnWidthSuffix(width.md)}`]: width.md != null && width.md !== COLUMN_OPTION_INHERIT,
		[`col-lg${columnWidthSuffix(width.lg)}`]: width.lg != null && width.lg !== COLUMN_OPTION_INHERIT,
		[`col-xl${columnWidthSuffix(width.xl)}`]: width.xl != null && width.xl !== COLUMN_OPTION_INHERIT,
		[`col-xxl${columnWidthSuffix(width.xxl)}`]: width.xxl != null && width.xxl !== COLUMN_OPTION_INHERIT,
		[`offset-${offset.xs}`]: !!offset.xs,
		[`offset-sm-${offset.sm}`]: offset.sm != null && offset.sm !== COLUMN_OPTION_INHERIT,
		[`offset-md-${offset.md}`]: offset.md != null && offset.md !== COLUMN_OPTION_INHERIT,
		[`offset-lg-${offset.lg}`]: offset.lg != null && offset.lg !== COLUMN_OPTION_INHERIT,
		[`offset-xl-${offset.xl}`]: offset.xl != null && offset.xl !== COLUMN_OPTION_INHERIT,
		[`offset-xxl-${offset.xxl}`]: offset.xxl != null && offset.xxl !== COLUMN_OPTION_INHERIT,
	});
};

/**
 * The save function defines the way in which the different attributes should be combined
 * into the final markup, which is then serialized by Gutenberg into post_content.
 *
 * The "save" property must be specified and must be a valid function.
 *
 * @link https://wordpress.org/gutenberg/handbook/block-api/block-edit-save/
 *
 * @param {Object} props Props.
 * @returns {Mixed} JSX Frontend HTML.
 */
export const ColumnRender = ({ attributes, className }) => {
	return (
		<div className={classNames(className, columnClassNames(attributes))}>
			<InnerBlocks.Content />
		</div>
	);
};
