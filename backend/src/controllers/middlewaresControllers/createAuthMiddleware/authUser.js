const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authUser = async (req, res, { user, databasePassword, password, UserPasswordModel }) => {
  const isMatch = await bcrypt.compare(databasePassword.salt + password, databasePassword.password);

  if (!isMatch)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });

  if (isMatch === true) {
    const token = jwt.sign(
      {
        id: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: req.body.remember ? 365 * 24 + 'h' : '24h' }
    );

    await UserPasswordModel.findOneAndUpdate(
      { user: user._id },
      { $push: { loggedSessions: token } },
      {
        new: true,
      }
    ).exec();

    res
      .status(200)
      .cookie('token', token, {
        maxAge: req.body.remember ? 365 * 24 * 60 * 60 * 1000 : null,
        sameSite: 'Lax',
        httpOnly: true,
        secure: false,  // CF Flexible：CF→origin 是 HTTP，必须 false
        path: '/',
        // 不设 domain —— 浏览器走 host-only cookie，自动 scope 到当前域
        //   设 domain 反而会踩坑：domain=app.olatech.ai 登录后切到 app.olajob.cn
        //   浏览器不会带这个 cookie（预期行为），但更重要的是 req.hostname
        //   在 CF 反代后未必可靠
        // 不设 Partitioned —— 新 CHIPS attribute 要求配 secure=true + SameSite=None，
        //   我们是 secure=false + SameSite=Lax，Partitioned 会让 Chrome 直接丢弃
        //   整个 cookie —— 登录后下次请求没 cookie → 401 "No authentication token"
      })
      .json({
        success: true,
        result: {
          _id: user._id,
          name: user.name,
          surname: user.surname,
          role: user.role,
          email: user.email,
          photo: user.photo,
          onboarded: user.onboarded,
        },
        message: 'Successfully login user',
      });
  } else {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid credentials.',
    });
  }
};

module.exports = authUser;
