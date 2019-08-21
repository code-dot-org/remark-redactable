module.exports = function renderRestorations() {
  if (this.Compiler) {
    const visitors = this.Compiler.prototype.visitors;
    if (visitors) {
      visitors.inlineRestoration = function(node) {
        let exit;
        if (node.redactionType === 'link' || node.redactionType === 'image') {
          exit = this.enterLink();
        }

        if (exit) {
          exit();
        }

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
