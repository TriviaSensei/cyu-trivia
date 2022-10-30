const Game = require('../models/gameModel');
const factory = require('../controllers/handlerFactory');

exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
exports.updateGame = factory.updateOne(Game);
exports.deleteGame = factory.deleteOne(Game);
