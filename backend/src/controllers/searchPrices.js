const { parseSearchPricesParams } = require('../validators/searchPrices');
const { pricesByDay } = require('../services/searchPrices');

async function searchPrices(req, res, next) {
  try {
    const params = parseSearchPricesParams(req.query);
    res.json({ prices: await pricesByDay(params) });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchPrices };
