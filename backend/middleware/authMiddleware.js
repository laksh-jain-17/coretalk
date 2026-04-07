const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // First try cookie (new secure method)
  const tokenFromCookie = req.cookies?.token;

  // Fallback to Authorization header (for backward compatibility)
  const authHeader = req.header('Authorization') || req.header('authorization');
  const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  const token = tokenFromCookie || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ msg: 'Authorization failed' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}

module.exports = authMiddleware;
