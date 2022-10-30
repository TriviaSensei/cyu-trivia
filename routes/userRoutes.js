const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.get('/getUser', authController.isLoggedIn, authController.getUser);

router.patch('/activate', authController.activateAccount);

router.use(authController.protect);

router.patch('/changePassword', authController.updatePassword);
router.patch('/updateMe', userController.updateMe);

router.post(
	'/signup',
	// (req, res, next) => {
	// 	console.log('hi');
	// 	console.log(res.locals.user);
	// 	next();
	// },
	authController.restrictTo('admin'),
	authController.signup
);
module.exports = router;
