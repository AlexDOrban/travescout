const { validateConnectionSearchParams } = require('../validators/connectionSearch');
const { searchConnections } = require('../services/connectionSearch');

async function search(req, res, next) {
  try {
    const params = validateConnectionSearchParams(req.query);
    const result = await searchConnections(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
