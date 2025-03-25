const mongoose = require('mongoose');
const Model = mongoose.model('Setting');

const listAll = async (req, res) => {
  try {
    console.log('Attempting to fetch all settings...');
    const sort = parseInt(req.query.sort) || 'desc';

    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning empty settings');
      return res.status(200).json({
        success: true,
        result: [],
        message: 'Database connection not ready, returning default empty settings',
      });
    }

    //  Query the database for a list of all results
    const result = await Model.find({
      removed: false,
      isPrivate: false,
    }).sort({ created: sort });

    if (result.length > 0) {
      return res.status(200).json({
        success: true,
        result,
        message: 'Successfully found all documents',
      });
    } else {
      return res.status(203).json({
        success: false,
        result: [],
        message: 'Collection is Empty',
      });
    }
  } catch (error) {
    console.error("Error in listAll:", error.message);
    return res.status(500).json({
      success: false,
      result: [],
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

module.exports = listAll;
