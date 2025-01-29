const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  try {
    console.log('Incoming request body:', JSON.stringify(req.body, null, 2)); // Log the entire request body

    const { items = [], taxRate = 0, discount = 0, factory, date, expiredDate, number, year } = req.body;

    // Validate required fields and log their presence
    console.log('Validation check:', {
      factory: !!factory,
      date: !!date,
      expiredDate: !!expiredDate,
      number: !!number,
      year: !!year,
      items: items && items.length > 0,
      admin: !!req.admin?._id
    });

    if (!factory) return res.status(400).json({ success: false, message: 'Factory is required' });
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });
    if (!expiredDate) return res.status(400).json({ success: false, message: 'Expired date is required' });
    if (!number) return res.status(400).json({ success: false, message: 'Number is required' });
    if (!year) return res.status(400).json({ success: false, message: 'Year is required' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Items are required' });
    if (!req.admin?._id) return res.status(400).json({ success: false, message: 'Admin ID is required' });

    // Convert dates if they're dayjs objects
    const parsedDate = new Date(date);
    const parsedExpiredDate = new Date(expiredDate);

    let body = {
      ...req.body,
      date: parsedDate,
      expiredDate: parsedExpiredDate,
      createdBy: req.admin._id
    };

    // Calculate totals
    let subTotal = 0;
    let taxTotal = 0;
    let total = 0;

    items.forEach((item) => {
      item.total = calculate.multiply(item.quantity, item.price);
      subTotal = calculate.add(subTotal, item.total);
    });
    
    taxTotal = calculate.multiply(subTotal, taxRate / 100);
    total = calculate.add(subTotal, taxTotal);

    body.subTotal = subTotal;
    body.taxTotal = taxTotal;
    body.total = total;

    console.log('Final body before save:', JSON.stringify(body, null, 2)); // Log the final body

    const result = await new Model(body).save();
    console.log('Save result:', result); // Log the saved result

    const fileId = 'po-' + result._id + '.pdf';
    const updateResult = await Model.findOneAndUpdate(
      { _id: result._id },
      { pdf: fileId },
      { new: true }
    ).exec();

    increaseBySettingKey({
      settingKey: 'last_purchase_order_number',
    });

    return res.status(200).json({
      success: true,
      result: updateResult,
      message: 'Purchase Order created successfully',
    });
  } catch (error) {
    console.error('Error creating PO:', error); // Log any errors
    return res.status(400).json({
      success: false,
      message: error.message || 'Error creating purchase order',
      error: error.toString()
    });
  }
};

module.exports = create;
