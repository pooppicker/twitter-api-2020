const Ajv = require('ajv')
const addFormats = require('ajv-formats')

const ajvInstance = new Ajv({ allErrors: true, $data: true })

addFormats(ajvInstance)
require('ajv-errors')(ajvInstance)

module.exports = ajvInstance