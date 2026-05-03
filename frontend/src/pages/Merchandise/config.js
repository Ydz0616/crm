export const fields = {
  serialNumber: {
    type: 'string',
    required: true,
    label: 'Serial Number',
  },
  serialNumberLong: {
    type: 'string',
    label: 'Serial Number (Long)',
  },
  description_en: {
    type: 'string',
    required: true,
    label: 'Description (EN)',
  },
  description_cn: {
    type: 'string',
    label: 'Description (CN)',
  },
  weight: {
    type: 'number',
    label: 'Weight (kg)',
  },
  VAT: {
    type: 'number',
    label: 'VAT (%)',
  },
  ETR: {
    type: 'number',
    label: 'ETR (%)',
  },
  unit_en: {
    type: 'string',
    required: true,
    label: 'Unit (EN)',
  },
  unit_cn: {
    type: 'string',
    label: 'Unit (CN)',
  },
};
