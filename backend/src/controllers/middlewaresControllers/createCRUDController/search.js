const search = async (Model, req, res) => {
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['name'];

  const fields = { $or: [] };

  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(req.query.q, 'i') } });
  }

  // Allow caller override via ?limit=N, clamped to [1, 500].
  // Default 50 (was 20) — 20 caused issue #89: AutoComplete 下拉选不中第 21 个客户/商品。
  // 500 是个不过分的天花板，避免个别租户有上千记录时一次性返回拖慢前端。
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 500)
    : 50;

  let results = await Model.find({
    ...fields,
  })

    .where('removed', false)
    .where('createdBy', req.admin._id)
    .limit(limit)
    .exec();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
