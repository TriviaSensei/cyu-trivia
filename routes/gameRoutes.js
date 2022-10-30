const express = require('express');
const gameController = require('../controllers/gameController');
const authController = require('../controllers/authController');

const router = express.Router();

//logged in users only for game routes
router.use(authController.protect);

router.route('/:id').get(gameController.getGame);

router.use((req, res, next) => {
	console.log('hi');
	console.log(res.locals.user);
	next();
});
router.use(authController.restrictTo('admin'));

router
	.route('/:id')
	.post(gameController.createGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
