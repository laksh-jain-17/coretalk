function hostOnly(req, res, next) {
  // defensive check
  if (!req.user || req.user.role !== 'host') {
    return res.status(403).json({ msg: 'Access denied. Host only' });
  }
  next();
}

module.exports = hostOnly;
