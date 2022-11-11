const express = require('express');
const gameController = require('../controllers/gameController');
const authController = require('../controllers/authController');

const router = express.Router();

//logged in users only for game routes
router.use(authController.protect);

router.route('/:id').get(gameController.getGame);

router.use(authController.restrictTo('admin', 'owner'));

router
	.route('/picture')
	.post(gameController.uploadImages, gameController.uploadToImgur);

router
	.route('/:id')
	.post(gameController.createGame)
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

module.exports = router;
