const mongoose = require('mongoose');
const Model = mongoose.model('Comparison');

const summary = async (req, res) => {
  try {
    // Calculate counts
    const totalCount = await Model.countDocuments({ removed: false });
    const draftCount = await Model.countDocuments({ removed: false, status: 'draft' });
    const pendingCount = await Model.countDocuments({ removed: false, status: 'pending' });
    const approvedCount = await Model.countDocuments({ removed: false, status: 'approved' });
    const rejectedCount = await Model.countDocuments({ removed: false, status: 'rejected' });

    // Calculate average gross profit
    const profitPipeline = [
      { $match: { removed: false } },
      { $unwind: '$items' },
      { $match: { 'items.grossProfit': { $gt: 0 } } },
      { $group: {
        _id: null,
        avgProfit: { $avg: '$items.grossProfit' }
      }}
    ];
    
    const profitResult = await Model.aggregate(profitPipeline);
    const averageProfit = profitResult.length > 0 ? profitResult[0].avgProfit : 0;

    // Return summary
    return res.status(200).json({
      success: true,
      result: {
        total: totalCount,
        draft: draftCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        averageProfit: Math.round(averageProfit * 1000) / 1000
      },
      message: 'Comparison summary fetched successfully',
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
};

module.exports = summary; 