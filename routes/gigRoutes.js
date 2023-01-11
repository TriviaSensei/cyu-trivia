const express = require('express');
const authController = require('../controllers/authController');
const gigController = require('../controllers/gigController');

const router = express.Router();

router.get('/:id', gigController.getVenueResults);

router.use(authController.protect);

router.post('/', gigController.createGig);

router.use(authController.restrictTo('owner', 'admin'));
//get all, edit, and delete are restricted to owner and admin
router.get('/', gigController.getAllGigs);
router.patch('/edit/:id', gigController.updateGig);
router.delete('/delete/:id', gigController.deleteGig);

module.exports = router;
