/**
 * This method extends a parser to enable it to find potential content that
 * should be restored.
 */

const INLINE_RESTORATION = 'inlineRestoration';
const BLOCK_RESTORATION = 'blockRestoration';
module.exports = function parseRestorations() {
  if (!this.Parser) {
    return;
  }
  const Parser = this.Parser;

  const inlineTokenizers = Parser.prototype.inlineTokenizers;
  inlineTokenizers[INLINE_RESTORATION] = function(eat, value, silent) {

    const leftBracket = '[';
    const rightBracket = ']';
    let brackets = { leftBracket:0, rightBracket:0};

    //track the string to be eaten
    let stringSoFar = "";

    //track the text content and index of redacted content
    let parsedText = "";
    let contents = [];

    if (value && value.length > 0 && value[0] === leftBracket) {

      for (let i = 0; i < value.length; i ++) {
        const char = value[i];
        if (char === leftBracket) {
          brackets.leftBracket ++;
        }
        else if (char === rightBracket) {
          brackets.rightBracket ++;
        }

        if (brackets.leftBracket > brackets.rightBracket) {
          stringSoFar += char;
          parsedText += char;
        }

        else if (brackets.leftBracket === brackets.rightBracket && parsedText !== "") {
          //add the text value to contents, excluding the brackets
          contents.push(parsedText.substring(1));
          parsedText = "";
          stringSoFar += rightBracket;

          const digitRegEx = /(\d+)/;

          //construct a restoration node if we have 1 set of brackets with or without nesting,
          //and 1 set of brackets with only digit characters inside
          if (contents.length === 2 && digitRegEx.exec(contents[1])) {

            if (silent) {
              return true;
            }

            //base case: no nested brackets, e.g. [chat][1]
            if (brackets.leftBracket === 2 && brackets.rightBracket === 2) {
              return eat(stringSoFar)({
                type: 'inlineRestoration',
                redactionIndex: parseInt(contents[1]),
                content: contents[0]
              });
            }

            //recurse on the nested brackets, e.g. [[lien image][2]][3]
            else if (brackets.leftBracket > 2 && brackets.rightBracket > 2) {
              return eat(stringSoFar)({
                type: 'inlineRestoration',
                redactionIndex: parseInt(contents[1]),
                children: this.tokenizeInline(contents[0], eat.now())
              });
            }
          }
        }
      }
    }
  };

  inlineTokenizers[INLINE_RESTORATION].locator = function(value, fromIndex) {
    return value.indexOf('[', fromIndex);
  };

  const inlineMethods = Parser.prototype.inlineMethods;
  inlineMethods.splice(
    inlineMethods.indexOf('reference'),
    0,
    INLINE_RESTORATION
  );

  const blockTokenizers = Parser.prototype.blockTokenizers;
  blockTokenizers[BLOCK_RESTORATION] = function(eat, value, silent) {
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
  };
  /* Run before default reference. */
  const blockMethods = Parser.prototype.blockMethods;
  blockMethods.splice(blockMethods.indexOf('paragraph'), 0, BLOCK_RESTORATION);
};
