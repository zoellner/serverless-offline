const fs = require('fs');
const path = require('path');

const defaultRequestTemplate = fs.readFileSync(path.join(__dirname, './offline-default.req.vm'), 'utf8');
const defaultResponseTemplate = '';

function loadRequestTemplates(functionDefinition, endpointDefinition) {
  // Determine request template override
  const filename = `${functionDefinition.handlerPath}.req.vm`;
  const templatesConfig = endpointDefinition.request && endpointDefinition.request.template;

  // Check if the template is hard-coded in the serverless.yml file
  if (typeof templatesConfig === 'object') {
    return templatesConfig;
  }
  // Load request template if existant
  else if (fs.existsSync(filename)) {
    return { 'application/json': fs.readFileSync(filename, 'utf8') };
  }

  // Use plugin's default
  return { 'application/json': defaultRequestTemplate };
}

module.exports = {
  loadRequestTemplates,
  loadResponseTemplates: loadRequestTemplates,
};
