const { decimal_separator } = require('@/locale/translation/en_us');
const mongoose = require('mongoose');


const schema = new mongoose.Schema({
    removed: {
        type: Boolean,
        default: false
    },
    currency_name: {
        type: String,
        required: true
    },
    currency_code: {
        type: String,
        required: true
    },
    currency_symbol: {
        type: String,
        required: true
    },
    currency_position: {
        type: String,
        default: 'before',
        enum: ['before', 'after']
    },
    decimal_separator: {
        type: String,
        required: true
    },
    thousand_separator: {
        type: String,
        required: true
    },
    cent_precision: {
        type: Number,
        required: true
    },
    zero_format: {
        type: Boolean,
        required: true
    },
    is_default: {
        type: Boolean,
        default: false
    },
    enabled: {
        type: Boolean,
        default: true
    }
    
});


schema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Currencies', schema);


