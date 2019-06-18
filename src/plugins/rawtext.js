/**
 * Stringify text without escaping special characters; useful for rendering
 * custom syntaxes which include control characters back to markdown.
 *
 * @see https://github.com/remarkjs/remark/blob/remark-stringify%405.0.0/packages/remark-stringify/lib/visitors/text.js
 * @see divclass
 */
module.exports = function rawtext() {
  if (this.Compiler) {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;

    visitors.rawtext = function (node) {
      return this.encode(node.value, node);
    }
  }
}
