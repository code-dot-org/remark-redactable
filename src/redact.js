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
 *   const redactedLink = require('./redactedLink');
 *
 *   const source = "Markdown containing [a link](http://example.com) to be redacted"
 *   // returns "Markdown containing [a link][0] to be redacted"
 *   unified().use([
 *     parse,        // use the standard parser
 *     stringify,    // output back to markdown
 *     redact,       // use this extension
 *     redactedLink, // add the ability to redact links
 *   ]).processSync(source);
 *
 * @see https://github.com/remarkjs/remark/tree/remark-stringify%405.0.0/packages/remark-stringify#extending-the-compiler
 * @see restore
 */
module.exports = function redact() {
  if (this.Compiler) {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;

    let index = 0;
    let openBlockIndexes = [];

    visitors.redaction = function redaction(node) {
      let value = "";

      var self = this;
      var exit = self.enterLink();
      if (node.children) {
        value = self.all(node).join('');
      }
      exit();

      if (node.block) {
        // redacted blocks should come in open, close pairs that share an index;
        // when we encounter an open, push the current index onto a stack and
        // pop it back off when we encounter a close to keep them balanced.
        if (node.closing) {
          return `[/${value}][${openBlockIndexes.shift()}]`;
        } else {
          openBlockIndexes.unshift(index++);
          return `[${value}][${openBlockIndexes[0]}]`;
        }
      } else {
        return `[${value}][${index++}]`;
      }
    }
  }

  if (this.Parser) {
    this.Parser.prototype.setOptions({
      redact: true
    })
  }
}

