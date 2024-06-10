const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    requiredQuantity: { type: Number, required: true },
    freeProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    freeQuantity: { type: Number, required: true }
});

module.exports = mongoose.model('Discount', discountSchema);
