const jsonPathPlus = require('jsonpath-plus');
const debugLog = require('./debugLog');

// Just a wrapper around an external dependency for debugging purposes
function jsonPath(json, path) {

  debugLog('Calling jsonPath:', path);
  const result = jsonPathPlus({ json, path, wrap: true })[0];
  debugLog('jsonPath resolved:', result);

  return result;
}

module.exports = jsonPath;
