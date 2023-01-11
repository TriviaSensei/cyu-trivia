const express = require('express');
const authController = require('../controllers/authController');
const venueController = require('../controllers/venueController');

const router = express.Router();

router
	.route('/')
	.post(
		authController.protect,
		authController.restrictTo('owner'),
		venueController.createVenue
	)
	.get(venueController.getAllVenues);
router
	.route('/:id')
	.get(venueController.getVenue)
	.patch(
		authController.protect,
		authController.restrictTo('owner'),
		venueController.updateVenue
	)
	.delete(
		authController.protect,
		authController.restrictTo('owner'),
		venueController.deleteVenue
	);

module.exports = router;
