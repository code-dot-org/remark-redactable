const visit = require('unist-util-visit');

/**
 * This method implements a transformer which applies indices to each redaction node.
 */

module.exports = function transformRedactions(tree) {
    let index = 0;
    visit(tree, ['inlineRedaction', 'blockRedaction'], function(node) {
        node.redactionIndex = index++;
    });
};
