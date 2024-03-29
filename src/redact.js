const visit = require('unist-util-visit');
/**
 * Add support for rending the redacted nodes generated when parsing source data
 * in redact mode. Redacted can be in one of two forms, inline or block:
 *
 * Inline:
 *
 *   [text to translate][i]
 *
 * Block:
 *
 *   [text to translate][i]
 *
 *     other markdown
 *
 *   [/i]
 *
 * Where in both cases "text to translate" is english text that we should
 * expect the translator to modify, and `i` is the sequential index of this
 * redaction in the content (used to match the redacted content back up with
 * source content for restoration)
 *
 * @example
 *
 *   const parse = require('remark-parse');
 *   const stringify = require('remark-stringify');
 *   const unified = require('unified');
 *   const { link } = require('@code-dot-org/remark-plugins');
 *
 *   const source = "Markdown containing [a link](http://example.com) to be redacted"
 *   // returns "Markdown containing [a link][0] to be redacted"
 *   unified().use([
 *     parse,     // use the standard parser
 *     stringify, // output back to markdown
 *     redact,    // use this extension
 *     link,      // add the ability to redact links
 *   ]).processSync(source);
 *
 * @see https://github.com/remarkjs/remark/tree/remark-stringify%405.0.0/packages/remark-stringify#extending-the-compiler
 * @see restore
 */
module.exports = function redact() {
  if (this.Compiler) {
    const visitors = this.Compiler.prototype.visitors;
    const stringifyContent = function(node) {
      return (node.redactionContent || [])
        .map(content => this.visit(content, node))
        .join("");
    };

    visitors.inlineRedaction = function(node) {
      let exit;
      if (node.redactionType === "link" || node.redactionType === "image") {
        exit = this.enterLink();
      }

      const value = stringifyContent.call(this, node);

      if (exit) {
        exit();
      }
      return `[${value}][${node.redactionIndex}]`;
    };

    visitors.blockRedaction = function(node) {
      const value = stringifyContent.call(this, node);

      const open = `[${value}][${node.redactionIndex}]`;
      const close = `[/][${node.redactionIndex}]`;

      const subvalue = this.block(node);

      return [open, subvalue, close].join("\n\n");
    };
  }

  let index = 0;
  function applyRedactionIndex(node) {
    node.redactionIndex = index++;
  }

  function transform(tree) {
    visit(tree, 'blockRedaction', applyRedactionIndex);
    visit(tree, 'inlineRedaction', applyRedactionIndex);
  }

  if (this.Parser) {
    this.Parser.prototype.setOptions({
      redact: true
    });
    return transform;
  }
}

