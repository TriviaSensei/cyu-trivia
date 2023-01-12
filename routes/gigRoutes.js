const express = require('express');
const authController = require('../controllers/authController');
const gigController = require('../controllers/gigController');

const router = express.Router();

router.get('/results/:id', gigController.getVenueResults);

router.use(authController.protect);

router.post('/', gigController.preventDuplicate, gigController.createGig);

router.use(authController.restrictTo('owner', 'admin'));
//get all, edit, and delete are restricted to owner and admin
router.get('/', gigController.getAllGigs);
router.patch(
	'/edit/:id',
	gigController.preventDuplicate,
	gigController.updateGig
);
router.get('/upcoming', gigController.getUpcoming);
router.delete('/:id', gigController.deleteGig);

module.exports = router;
