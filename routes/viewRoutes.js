const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.isLoggedIn);
router.use(viewsController.httpsRedirect);

router.get('/', viewsController.getHomepage);
router.get('/play', viewsController.play);
router.get('/login', viewsController.getLogin);
router.get('/profile', viewsController.getProfile);
router.get('/activate/:token', viewsController.getActivation);
module.exports = router;
