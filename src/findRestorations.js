module.exports = function findRestorations() {
  if (!this.Parser) {
    return;
  }
  const Parser = this.Parser;

  function tokenizeInlineRestorations(eat, value, silent) {
    const INLINE_REDACTION_RE = /^\[([^\]]*)\]\[(\d+)\]/;
    const match = INLINE_REDACTION_RE.exec(value);
    if (match && !silent) {
      if (silent) {
        return true;
      }
      const text = match[1];
      const index = parseInt(match[2]);
      return eat(match[0])({
        type: "inlineRestoration",
        redactionIndex: index,
        content: text
      });
    }
  }

  tokenizeInlineRestorations.locator = function(value, fromIndex) {
    return value.indexOf("[", fromIndex);
  };

  Parser.prototype.inlineTokenizers.findInlineRestorations = tokenizeInlineRestorations;
  const inlineMethods = Parser.prototype.inlineMethods;
  inlineMethods.splice(
    inlineMethods.indexOf("reference"),
    0,
    "findInlineRestorations"
  );

  function tokenizeBlockRestorations(eat, value, silent) {
    const BLOCK_REDACTION_RE = /^\[([^\]]*)\]\[(\d+)\]\n\n/;
    const startMatch = BLOCK_REDACTION_RE.exec(value);

    // if we don"t find an open block, return immediately
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

    // the entire string representing the "close" block of the redaction
    const blockClose = `\n\n[/][${index}]`;

    // the index within `value` at which the inner content of the redacted block ends
    // (ie the index at which the "close" block begins)
    const endIndex = value.indexOf(blockClose, startIndex);

    // if we didn"t find a close block, return immediately
    if (endIndex === -1) {
      return;
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
    return add({
      type: "blockRestoration",
      redactionIndex: index,
      content: content,
      children: children
    });
  }
  /* Run before default reference. */
  Parser.prototype.blockTokenizers.findBlockRestorations = tokenizeBlockRestorations;
  const blockMethods = Parser.prototype.blockMethods;
  blockMethods.splice(
    blockMethods.indexOf("paragraph"),
    0,
    "findBlockRestorations"
  );
};
