const express = require('express');
const authController = require('../controllers/authController');
const venueController = require('../controllers/venueController');

const router = express.Router();

router.use(authController.protect);

router.use(authController.restrictTo('owner'));

router
	.route('/')
	.post(
		venueController.uploadImages,
		venueController.AWSUpload,
		venueController.createVenue
	)
	.get(venueController.getAllVenues);
router
	.route('/:id')
	.get(venueController.getVenue)
	.patch(venueController.updateVenue)
	.delete(venueController.deleteVenue);

module.exports = router;
