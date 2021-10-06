const visit = require('unist-util-visit');
const visitParents = require('unist-util-visit-parents');

/**
 * Given some valid MDAST representing source content parsed in redact mode,
 * and a MDAST representing redacted content with restoration points found
 * using parseRestorations, this method transforms the tree with *Restoration
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
 *     parseRestorations, // find Restoration nodes
 *     restore(sourceTree, restorationMethods), // use with a tree of the source content and the defined restoration methods
 *     stringify            // output back to markdown
 *   ]).processSync(redacted);
 *
 * @see https://github.com/remarkjs/remark/tree/remark-parse%405.0.0/packages/remark-parse#extending-the-parser
 * @see render
 */
 /* eslint-disable no-console */

module.exports = function restoreRedactions(sourceTree, restorationMethods) {
  // First, walk the source tree and find all redacted nodes.
  const redactions = {};
  visit(sourceTree, ['inlineRedaction', 'blockRedaction'], function(node) {
    console.log("VISIT node: " + JSON.stringify(node));
    console.log("VISIT sourceTree: " + JSON.stringify(sourceTree));
    redactions[node.redactionIndex] = node;
  });

  function blockVisitor(node, index, parent) {
    console.log(redactions);
    const redactedData = redactions[node.redactionIndex];
    if (redactedData && redactedData.type === 'blockRedaction') {
      const restorationMethod = restorationMethods[redactedData.redactionType];
      if (restorationMethod) {
        let n = restorationMethod(redactedData, node.content, node.children);
        if (!n.length) {
          n = [n];
        }
        parent.children.splice(index, 1, ...n);
        return index;
      }
    }
  }
  // eslint-disable-next-line no-unused-vars
  let grandparent;
  function inlineVisitor(node, index, parent) {
    const redactedData = redactions[node.redactionIndex];
    console.log("INLINEVISITOR node: " + JSON.stringify(node));
    console.log("INLINEVISITOR index: " + index);
    console.log("INLINEVISITOR parent: " + JSON.stringify(parent));
    console.log("INLINEVISITOR redactions: " + JSON.stringify(redactions));

    console.log("INLINEVISITOR redactedData: " + JSON.stringify(redactedData));
    if (redactedData && redactedData.type === 'inlineRedaction') {
      const restorationMethod = restorationMethods[redactedData.redactionType];

      if (restorationMethod) {
        const restored = restorationMethod(redactedData, node.content);
        console.log("INLINEVISITOR restored: " + JSON.stringify(restored));
        if (node.redactionIndex === 3) {
          grandparent = parent;
        }
        parent.children.splice(index, 1, restored);
        return true;
      }
    }
  }

  function transform(tree) {
    visit(tree, 'blockRestoration', blockVisitor);
    visit(tree, 'inlineRestoration', inlineVisitor);
  }
  return transform;
};
