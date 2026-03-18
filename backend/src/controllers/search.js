const { parseSearchParams } = require('../validators/search');
const SearchService = require('../services/search');

async function search(req, res, next) {
  try {
    const params = parseSearchParams(req.query);
    const data = await SearchService.search(params);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
