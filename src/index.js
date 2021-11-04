const redact = require('./redact');
const restore = require('./restore');
const parseRestorations = require('./parseRestorations');
const renderRestorations = require('./renderRestorations');
const transformRedactions = require('./transformRedactions');

module.exports = {
  redact,
  restore,
  parseRestorations,
  renderRestorations,
  transformRedactions
}
