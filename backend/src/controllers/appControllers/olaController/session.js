const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ChatSession = mongoose.model('ChatSession');
const ChatMessage = mongoose.model('ChatMessage');

const sessionCreate = async (req, res) => {
  const userId = req.admin._id.toString();
  const nanobotSessionId = `user:${userId}:conv:${uuidv4()}`;

  const session = await ChatSession.create({
    userId: req.admin._id,
    nanobotSessionId,
    createdBy: req.admin._id,
  });

  return res.status(200).json({
    success: true,
    result: session,
    message: 'Session created',
  });
};

const sessionList = async (req, res) => {
  const userId = req.admin._id;

  const sessions = await ChatSession.aggregate([
    { $match: { userId, removed: false } },
    {
      $lookup: {
        from: 'chatmessages',
        localField: '_id',
        foreignField: 'sessionId',
        pipeline: [
          { $match: { removed: false } },
          { $sort: { created: -1 } },
          { $limit: 1 },
          { $project: { created: 1 } },
        ],
        as: '_lastMessage',
      },
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: '_id',
        foreignField: 'sessionId',
        pipeline: [
          { $match: { removed: false } },
          { $count: 'count' },
        ],
        as: '_messageCount',
      },
    },
    {
      $addFields: {
        lastMessageAt: {
          $ifNull: [{ $arrayElemAt: ['$_lastMessage.created', 0] }, '$created'],
        },
        messageCount: {
          $ifNull: [{ $arrayElemAt: ['$_messageCount.count', 0] }, 0],
        },
      },
    },
    { $project: { _lastMessage: 0, _messageCount: 0 } },
    { $sort: { lastMessageAt: -1 } },
  ]);

  return res.status(200).json({
    success: true,
    result: sessions,
    message: 'Sessions listed',
  });
};

const sessionDelete = async (req, res) => {
  const { id } = req.params;
  const userId = req.admin._id;

  const session = await ChatSession.findOneAndUpdate(
    { _id: id, userId, removed: false },
    { removed: true, updated: Date.now() },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Session not found',
    });
  }

  // Soft-delete all messages in this session
  await ChatMessage.updateMany(
    { sessionId: id, removed: false },
    { removed: true, updated: Date.now() }
  );

  return res.status(200).json({
    success: true,
    result: session,
    message: 'Session deleted',
  });
};

const sessionRename = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const userId = req.admin._id;

  if (!title || typeof title !== 'string' || title.trim() === '' || title.trim().length > 200) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'title is required',
    });
  }

  const session = await ChatSession.findOneAndUpdate(
    { _id: id, userId, removed: false },
    { title: title.trim(), updated: Date.now() },
    { new: true }
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Session not found',
    });
  }

  return res.status(200).json({
    success: true,
    result: session,
    message: 'Session renamed',
  });
};

const sessionMessages = async (req, res) => {
  const { id } = req.params;
  const userId = req.admin._id;

  // Verify session belongs to user
  const session = await ChatSession.findOne({ _id: id, userId, removed: false });
  if (!session) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Session not found',
    });
  }

  const messages = await ChatMessage.find({ sessionId: id, removed: false })
    .sort({ created: 1 })
    .lean();

  return res.status(200).json({
    success: true,
    result: messages,
    message: 'Messages loaded',
  });
};

module.exports = { sessionCreate, sessionList, sessionDelete, sessionRename, sessionMessages };
