let tokenizeLink;
let tokenizeAutoLink;

/**
 * Parser extension to support rendering of links (including images and
 * autolinks) when in redact mode.
 *
 * Note that most plugins that support redact mode are adding the ability to
 * parse an entirely new syntax in both normal and redact mode, whereas this one
 * is _extending_ the built-in ability to parse the various types of links to
 * add redact mode.
 *
 * As such, this basically acts as an interstitial between the built-in link
 * method to turn its output into a redaction when appropriate.
 *
 * @example
 *
 *   const parse = require('remark-parse');
 *   const stringify = require('remark-stringify');
 *   const unified = require('unified');
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
 * @see https://github.com/remarkjs/remark/tree/remark-parse%405.0.0/packages/remark-parse#extending-the-parser
 * @see redact
 */
module.exports = function redactedLink() {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;
  const restorationMethods = Parser.prototype.restorationMethods;

  if (restorationMethods) {
    restorationMethods.redactedlink = function (add, node, content) {
      return add(Object.assign({}, node, {
        type: 'link',
        children: [{
          type: "text",
          value: content
        }]
      }));
    }

    restorationMethods.redactedimage = function (add, node, content) {
      return add(Object.assign({}, node, {
        type: 'image',
        alt: content
      }));
    }
  }

  tokenizeLink = tokenizers.link;
  tokenizeAutoLink = tokenizers.autoLink;

  tokenizeRedactedLink.locator = tokenizers.link.locator;
  tokenizers.redactedLink = tokenizeRedactedLink

  tokenizeRedactedAutoLink.locator = tokenizers.autoLink.locator;
  tokenizers.redactedAutoLink = tokenizeRedactedAutoLink

  // If in redacted mode, run this instead of original link tokenizer. If
  // running regularly, do nothing special.
  if (Parser.prototype.options.redact) {
    methods.splice(methods.indexOf('link'), 1, 'redactedLink');
    methods.splice(methods.indexOf('autoLink'), 1, 'redactedAutoLink');
  }
}

function tokenizeRedactedLink(eat, value, silent) {
  const link = tokenizeLink.call(this, eat, value, silent);
  if (link) {
    if (link.type === 'image') {
      link.children = [{
        type: 'text',
        value: link.alt || ""
      }]
    }
    link.redactionType = 'redacted' + link.type;
    link.type = 'redaction';
  }

  return link;
}

function tokenizeRedactedAutoLink(eat, value, silent) {
  const link = tokenizeAutoLink.call(this, eat, value, silent);
  if (link) {
    link.redactionType = 'redactedlink';
    link.type = 'redaction';
  }

  return link;
}
