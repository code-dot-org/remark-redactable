/**
 * Tthis method extends a parser to enable it to find potential content that
 * should be restored.
 */

const INLINE_RESTORATION = 'inlineRestoration';
const BLOCK_RESTORATION = 'blockRestoration';
/* eslint-disable no-console */
module.exports = function parseRestorations() {
  if (!this.Parser) {
    return;
  }
  const Parser = this.Parser;

  const inlineTokenizers = Parser.prototype.inlineTokenizers;
  inlineTokenizers[INLINE_RESTORATION] = function(eat, value, silent) {
    const INLINE_REDACTION_RE = /^\[([^\]]*)\]\[(\d+)\]/;
    const match = INLINE_REDACTION_RE.exec(value);
    if (match && !silent) {
      if (silent) {
        return true;
      }
      const text = match[1];
      const index = parseInt(match[2]);
      const node2 = {
        type: 'inlineRestoration',
        redactionIndex: index,
        content: text
      }
      console.log("original node: " + JSON.stringify(node2));
      // return eat(match[0])(node);
    }
    function constructNode(value, isFirstPass = false, self, now) {
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
            console.log("contents: " + contents);

            if (contents.length === 2) {
              let node = {};
              //base case: no nested brackets, [chat][1]
              if (brackets.leftBracket === 2 && brackets.rightBracket === 2) {
                node = {
                  type: 'inlineRestoration',
                  redactionIndex: parseInt(contents[1]),
                  content: contents[0]
                };
              }
              //recurse on the nested brackets
              else if (brackets.leftBracket > 2 && brackets.rightBracket > 2) {
                node = {
                  type: 'inlineRestoration',
                  redactionIndex: parseInt(contents[1]),
                  children: self.tokenizeInline(contents[0], now)
                };
              }
              if (isFirstPass) {
                return [node, stringSoFar];
              }
              else {
                return node;
              }
            }
          }
        }
      }
    }

    const constructedNode = constructNode(value, true, this, eat.now());
    if (constructedNode && constructedNode.length === 2) {
      console.log("constructedNode" + constructedNode);
      console.log(JSON.stringify(constructedNode[0]));
      if (silent) {
        return true;
      }
      //eat([[lien image][2]][3])({
      //{"type":"inlineRestoration","redactionIndex":3,"children":[{"type":"inlineRestoration","redactionIndex":2,"content":"lien image"}]}
    //})

    //eat ([chat][1])({
    //{"type":"inlineRestoration","redactionIndex":1,"content":"chat"}
  //})
    //
    // et un [[lien image][2] and [another image][4]][3]
      return eat(constructedNode[1])(constructedNode[0]);
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
