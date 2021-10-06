/* eslint-disable no-console */

module.exports = function renderRestorations() {
  if (this.Compiler) {
    const visitors = this.Compiler.prototype.visitors;
    if (visitors) {
      console.log("render restorations function");

      visitors.inlineRestoration = function(node) {
        if (node.redactionType === 'link' || node.redactionType === 'image') {
          this.enterLink();
        }
        console.log("render restorations node: " + JSON.stringify(node));
        return `[${node.content}][${node.redactionIndex}]`;
      };

      visitors.blockRestoration = function(node) {
        const open = `[${node.content}][${node.redactionIndex}]`;
        const close = `[/][${node.redactionIndex}]`;

        const subvalue = this.block(node);

        return [open, subvalue, close].join('\n\n');
      };
    }
  }
};
