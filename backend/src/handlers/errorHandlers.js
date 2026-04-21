/*
  Catch Errors Handler

  With async/await, you need some way to catch errors
  Instead of using try{} catch(e) {} in each controller, we wrap the function in
  catchErrors(), catch any errors they throw, and pass it along to our express middleware with next()
*/

exports.catchErrors = (fn) => {
  return function (req, res, next) {
    return fn(req, res, next).catch((error) => {
      if (error.name == 'ValidationError') {
        // 从 mongoose ValidationError 提取字段名和具体原因，生成对用户友好的消息
        const fieldIssues = Object.entries(error.errors || {}).map(([field, err]) => {
          // kind: 'required' / 'Number' / 'enum' / ...；err.message 是 mongoose 原文
          const kind = err.kind || err.name || 'invalid';
          return `${field} (${kind})`;
        });
        const message = fieldIssues.length
          ? `Missing or invalid fields: ${fieldIssues.join(', ')}`
          : 'Validation failed';

        return res.status(400).json({
          success: false,
          result: null,
          message,
          controller: fn.name,
          error: error,
        });
      } else {
        // Server Error
        console.log('Server Error in controller:', fn.name);
        console.log('Error details:', error);
        return res.status(500).json({
          success: false,
          result: null,
          message: error.message,
          controller: fn.name,
          error: error,
        });
      }
    });
  };
};

/*
  Not Found Error Handler

  If we hit a route that is not found, we mark it as 404 and pass it along to the next error handler to display
*/
exports.notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: "Api url doesn't exist ",
  });
};

/*
  Development Error Handler

  In development we show good error messages so if we hit a syntax error or any other previously un-handled error, we can show good info on what happened
*/
exports.developmentErrors = (error, req, res, next) => {
  error.stack = error.stack || '';
  const errorDetails = {
    message: error.message,
    status: error.status,
    stackHighlighted: error.stack.replace(/[a-z_-\d]+.js:\d+:\d+/gi, '<mark>$&</mark>'),
  };

  return res.status(500).json({
    success: false,
    message: error.message,
    error: error,
  });
};

/*
  Production Error Handler

  No stacktraces are leaked to admin
*/
exports.productionErrors = (error, req, res, next) => {
  return res.status(500).json({
    success: false,
    message: error.message,
    error: error,
  });
};
