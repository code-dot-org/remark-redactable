const visit = require("unist-util-visit");

/**
 * Given some valid MDAST representing source content parsed in redact mode,
 * and a MDAST representing redacted content with restoration points found
 * using findRestorations, this method transforms the tree with *Restoration
 * nodes to produce a tree that can be rendered.
 *
 * @example
 *
 *   const parse = require('remark-parse');
 *   const stringify = require('remark-stringify');
 *   const unified = require('unified');
 *
 *   const { link } = require('@code-dot-org/remark-plugins');
 *   const redact = require('./redact');
 *
 *   const source = "Markdown containing [a link](http://example.com) to be redacted"
 *   const sourceTree = unified().use([
 *     parse,  // use the standard parser
 *     redact, // use redaction plugin
 *     link,   // add the ability to redact links
 *   ]).parse(source);
 *
 *   const redacted = "Markdown containing [a modified link][0] that has been redacted"
 *   // returns "Markdown containing [a modified link](http://example.com) that has been redacted"
 *   unified().use([
 *     parse,               // use the standard parser
 *     findRestorations, // find Restoration nodes
 *     restore(sourceTree, restorationMethods), // use with a tree of the source content and the defined restoration methods
 *     stringify            // output back to markdown
 *   ]).processSync(redacted);
 *
 * @see https://github.com/remarkjs/remark/tree/remark-parse%405.0.0/packages/remark-parse#extending-the-parser
 * @see render
 */
module.exports = function restoreRedactions(sourceTree, restorationMethods) {
  // First, walk the source tree and find all redacted nodes.
  const redactions = [];
  visit(sourceTree, ["inlineRedaction", "blockRedaction"], function(node) {
    redactions.push(node);
  });

  function blockVisitor(node, index, parent) {
    const redactedData = redactions[node.redactionIndex];
    if (!redactedData || redactedData.type !== "blockRedaction") {
      const nodes = [
        {type: "rawtext", value: "[][" + node.redactionIndex + "]"},
        ...node.children,
        {type: "rawtext", value: "[/][" + node.redactionIndex + "]"}
      ];
      parent.children.splice(index, 1, ...nodes);
      return true;
    }
    const restorationMethod =
      restorationMethods[redactedData.redactionType];
    if (restorationMethod) {
      let n = restorationMethod(redactedData, node.content, node.children);
      if (!n.length) {
        n = [n];
      }
      parent.children.splice(index, 1, ...n);
      return index;
    }
  }

  function inlineVisitor(node, index, parent) {
    const redactedData = redactions[node.redactionIndex];
    if (!redactedData || redactedData.type !== "inlineRedaction") {
      Object.assign(node, {
        value: "[" + node.content + "][" + node.redactionIndex + "]",
        type: "rawtext"
      });
      return true;
    }
    const restorationMethod = restorationMethods[redactedData.redactionType];
    if (restorationMethod) {
      const restored = restorationMethod(redactedData, node.content);
      parent.children.splice(index, 1, restored);
      return true;
    }
  }

  function transform(tree) {
    visit(tree, "blockRestoration", blockVisitor);
    visit(tree, "inlineRestoration", inlineVisitor);
  }
  return transform;
};
