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
	.post(gameController.uploadImages, gameController.AWSUpload);

router
	.route('/:id')
	.patch(gameController.updateGame)
	.delete(gameController.deleteGame);

router.post('/', gameController.createGame);
module.exports = router;
