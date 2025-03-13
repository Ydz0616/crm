const mongoose = require('mongoose');

const Model = mongoose.model('Comparison');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  try {
    // Extract data from request body
    const { items = [], taxRate = 0, exchangeRate = 6.5 } = req.body;

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Items cannot be empty',
      });
    }

    // Calculate totals
    let subTotal = 0;
    let taxTotal = 0;
    let total = 0;

    // Process each item
    items.map((item) => {
      // Calculate item total
      const itemTotal = calculate.multiply(item['quantity'], item['price']);
      subTotal = calculate.add(subTotal, itemTotal);
      item['total'] = itemTotal;
      
      // Calculate gross profit if both price and purchase price are provided
      if (item.price && item.purchasePrice && item.price > 0) {
        // Retrieve VAT and ETR from item if provided
        const VAT = item.VAT || 1.13;
        const ETR = item.ETR || 0.13;
        
        // Calculate USD expense
        const usdExpense = calculate.multiply(
          item.purchasePrice,
          calculate.divide(
            calculate.subtract(VAT, ETR),
            VAT
          )
        );
        
        const usdExpenseConverted = calculate.divide(usdExpense, exchangeRate);
        
        // Calculate gross profit percentage
        if (item.price > usdExpenseConverted) {
          const grossProfit = calculate.divide(
            calculate.subtract(item.price, usdExpenseConverted),
            item.price
          );
          
          // Round to 3 decimal places
          item.grossProfit = Math.round(grossProfit * 1000) / 1000;
        } else {
          item.grossProfit = 0;
        }
      }
    });

    // Calculate tax and total
    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    // Prepare the body with calculated values
    const body = req.body;
    body['subTotal'] = subTotal;
    body['taxTotal'] = taxTotal;
    body['total'] = total;
    body['items'] = items;
    body['pdf'] = 'comparison-' + req.params.id + '.pdf';

    // Update the document
    const result = await Model.findOneAndUpdate(
      { _id: req.params.id, removed: false },
      body,
      { new: true }
    ).exec();

    // Return success response
    return res.status(200).json({
      success: true,
      result,
      message: 'Comparison updated successfully',
    });
  } catch (error) {
    console.error('Error updating comparison:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = update; 