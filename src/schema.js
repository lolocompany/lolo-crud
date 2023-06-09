const Ajv = require('ajv');

const readOnly = true;
const type = 'string';

const crudProps = {
  id:        { readOnly, type },
  accountId: { readOnly, type },
  version:   { readOnly, type: 'integer' },
  createdAt: { readOnly, type, format: 'date-time' },
  updatedAt: { readOnly, type, format: 'date-time' },
  createdBy: { readOnly, type },
  updatedBy: { readOnly, type }
};

const withCrudProps = schema => ({
  ...schema,
  properties: {
    ...schema.properties,
    ...crudProps
  }
});

const buildValidate = schema => {
  const ajv = new Ajv({
    allErrors: false,
    removeAdditional: true
    useDefaults: true
  });

  const validate = ajv.compile(schema);

  return item => {
    const isValid = validate(item);
    if (isValid) return;

    const { dataPath, message } = validate.errors[0];
    const msg = dataPath ? dataPath + ' ' + message : message;

    throw new ValidationError(msg);
  };
};

class ValidationError extends Error {
  constructor(msg) {
    super(msg || 'Validation error');
    this.status = 422;
  }
}

module.exports = {
  withCrudProps,
  buildValidate,
  crudFields: Object.keys(crudProps),
  ValidationError
};
