const mongoose = require('mongoose');

const Model = mongoose.model('PurchaseOrder');

const read = async (req, res) => {
  try {
    // Find document by id
    const result = await Model.findOne({
      _id: req.params.id,
      removed: false,
    }).populate('createdBy', 'name').exec();  // No need for explicit populate due to autopopulate


    if (!result) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'No document found',
      });
    }
    // @yuandong, you should change the factory schema later !
    const transformedResult = {
      ...result.toObject(),
      client:{
        name: result.factory.factory_name,
        address: result.factory.location,
        email: result.factory.contact,
        phone: result.factory.tel1
      }
    }
    transformedResult.factory = result.factory;
    return res.status(200).json({
      success: true,
      result: transformedResult,
      message: 'Document found successfully',
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message
    });
  }
};

module.exports = read;
