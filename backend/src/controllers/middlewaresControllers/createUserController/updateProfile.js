const mongoose = require('mongoose');

const updateProfile = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  // Validate language if provided (Admin schema enum: ['zh', 'en']).
  // Use !== undefined (not truthy check) so we explicitly reject null /
  // empty string / 0 — leaving them out preserves "omit = no overwrite"
  // semantics while still rejecting an explicit invalid value.
  if (req.body.language !== undefined && !['zh', 'en'].includes(req.body.language)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid language; must be one of zh, en',
    });
  }

  const updates = {
    email: req.body.email,
    name: req.body.name,
    surname: req.body.surname,
    language: req.body.language,
  };

  // Find document by id and updates with the required fields
  const result = await User.findOneAndUpdate(
    { _id: userProfile._id, removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No profile found by this id: ' + userProfile._id,
    });
  }
  return res.status(200).json({
    success: true,
    result: {
      _id: result?._id,
      enabled: result?.enabled,
      email: result?.email,
      name: result?.name,
      surname: result?.surname,
      photo: result?.photo,
      role: result?.role,
      language: result?.language || 'zh',
    },
    message: 'we update this profile by this id: ' + userProfile._id,
  });
};

module.exports = updateProfile;
