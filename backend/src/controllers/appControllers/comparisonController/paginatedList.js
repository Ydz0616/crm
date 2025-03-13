const mongoose = require('mongoose');
const Model = mongoose.model('Comparison');
const custom = require('@/controllers/pdfController');

const paginatedList = async (req, res) => {
  const page = req.query.page || 1;
  const limit = parseInt(req.query.items) || 10;
  const skip = page * limit - limit;

  try {
    // Find documents with pagination
    const resultsPromise = Model.find({ removed: false })
      .skip(skip)
      .limit(limit)
      .sort({ created: 'desc' })
      .populate('client', 'name');

    // Count all records
    const countPromise = Model.countDocuments({ removed: false });

    // Execute promises concurrently
    const [result, count] = await Promise.all([resultsPromise, countPromise]);

    // Return success response with pagination
    return res.status(200).json({
      success: true,
      result,
      count,
      pagination: {
        page,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Error in paginated list:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = paginatedList; 