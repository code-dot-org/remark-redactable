/**
 * Given some valid MDAST representing source content parsed in redact mode,
 * this method extends a parser to enable it to parse redacted versions of that
 * content.
 *
 * @example
 *
 *   const parse = require('remark-parse');
 *   const stringify = require('remark-stringify');
 *   const unified = require('unified');
 *   const redactedLink = require('./redactedLink');
 *
 *   const source = "Markdown containing [a link](http://example.com) to be redacted"
 *   const sourceTree = unified().use([
 *     parse,                          // use the standard parser
 *     redactedLink,                   // add the ability to redact links
 *     { settings: { redact: true } }, // put the parser in redaction mode
 *   ]).parse(source);
 *
 *   const redacted = "Markdown containing [a modified link][0] that has been redacted"
 *   // returns "Markdown containing [a modified link](http://example.com) that has been redacted"
 *   unified().use([
 *     parse,                         // use the standard parser
 *     restoreRedactions(sourceTree), // use this extension with the source content above
 *     stringify                      // output back to markdown
 *   ]).stringify(redacted);
 *
 * @see https://github.com/remarkjs/remark/tree/remark-parse%405.0.0/packages/remark-parse#extending-the-parser
 * @see renderRedactions
 * @requires restorationRegistration
 */
module.exports = function restoreRedactions(sourceTree) {
  // First, walk the source tree and find all redacted nodes.
  // Block nodes should come in open, close pairs that share an index; entries
  // in the redactions array should therefore either be an object representing a
  // single node or an object with three values:
  // - block = true - indicating that this is a block object
  // - open - node representing the opening block
  // - close - node representing the closing block
  const redactions = [];
  const openBlockIndexes = [];
  function getRedactedValues(node) {
    if (node.type === "redaction") {
      if (node.block) {
        if (node.closing) {
          redactions[openBlockIndexes.shift()].close = node;
        } else {
          openBlockIndexes.unshift(redactions.length);
          redactions.push({
            block: true,
            open: node
          });
        }
      } else {
        redactions.push(node);
      }
    }

    if (node.children && node.children.length) {
      node.children.forEach(getRedactedValues);
    }
  }
  getRedactedValues(sourceTree);

  // then return an extension to the parser that can consume the data from these
  // redacted nodes when it encounters a redaction
  return function () {
    if (!this.Parser) {
      return;
    }

    const Parser = this.Parser;

    // Add an inline tokenizer
    //
    // A redacted inline value looks like [some text][0], where "some text" is
    // something that can be translated and "0" is the index of the redacted
    // value.
    const INLINE_REDACTION_RE = /^\[([^\]]*)\]\[(\d+)\]/;
    const tokenizeInlineRedaction = function (eat, value, silent) {
      const match = INLINE_REDACTION_RE.exec(value);
      if (!match) {
        return;
      }

      // the translated data inside the first set of brackets
      const content = match[1];

      // the sequential index inside the second set of brackets
      const index = parseInt(match[2], 10);

      // TODO once we decide on how we want to handle errors, this is where the
      // error handler should probably go
      const redactedData = redactions[index];
      if (!redactedData) {
        return;
      }

      const restorationMethod = Parser.prototype.restorationMethods[redactedData.redactionType];
      if (!restorationMethod) {
        return
      }

      if (silent) {
        return true;
      }

      const add = eat(match[0]);
      return restorationMethod(add, redactedData, content);
    }

    tokenizeInlineRedaction.locator = function (value) {
      return value.search(INLINE_REDACTION_RE);
    }

    Parser.prototype.inlineTokenizers.redaction = tokenizeInlineRedaction;
    const inlineMethods = Parser.prototype.inlineMethods;
    inlineMethods.splice(inlineMethods.indexOf('reference'), 0, 'redaction');

    // Add a block tokenizer
    //
    // A redacted block will actually be two "blocks" representing the open and
    // close of a redacted block. Together, they will look like:
    //
    //     [some text][0]
    //
    //     some other markdown content contained within the redaction
    //
    //     [/][0]
    //
    // Where "some text" is something that can be translated  and "0" is the
    // index of the redacted value.
    const tokenizeBlockRedaction = function (eat, value, silent) {
      const BLOCK_REDACTION_RE = /^\[([^\]]*)\]\[(\d+)\]\n\n/;
      const startMatch = BLOCK_REDACTION_RE.exec(value)

      // if we don't find an open block, return immediately
      if (!startMatch) {
        return;
      }

      // the entire string representing the "open" block of the redaction
      const blockOpen = startMatch[0];

      // the index within `value` at which the inner content of the redacted block begins
      // (ie the index at which the "open" block ends)
      const startIndex = startMatch[0].length;

      // the translated data inside the first set of brackets
      const content = startMatch[1];

      // the sequential index inside the second set of brackets
      const index = parseInt(startMatch[2], 10);

      // if we don't have a redaction matching this index, return immediately
      // TODO once we decide on how we want to handle errors, this is where the
      // error handler should probably go
      const redactedData = redactions[index];
      if (!(redactedData && redactedData.block)) {
        return;
      }

      // the entire string representing the "close" block of the redaction
      const blockClose = `\n\n[/][${index}]`;

      // the index within `value` at which the inner content of the redacted block ends
      // (ie the index at which the "close" block begins)
      const endIndex = value.indexOf(blockClose, startIndex);

      // if we didn't find a close block, return immediately
      if (endIndex === -1) {
        return;
      }

      const restorationMethod = Parser.prototype.restorationMethods[redactedData.open.redactionType];
      if (!restorationMethod) {
        return
      }

      // if we get to here, then we have found a valid block! Return true if in
      // silent mode to indicate a passing test
      if (silent) {
        return true;
      }

      // if in normal (ie non-silent) mode, consume the token and produce a
      // render
      const subvalue = value.slice(startIndex, endIndex);
      const children = this.tokenizeBlock(subvalue, eat.now());
      const add = eat(blockOpen + subvalue + blockClose);
      return restorationMethod(add, redactedData, content, children);
    }

    /* Run before default reference. */
    Parser.prototype.blockTokenizers.redaction = tokenizeBlockRedaction;
    const blockMethods = Parser.prototype.blockMethods;
    blockMethods.splice(blockMethods.indexOf('paragraph'), 0, 'redaction');
  }
}
