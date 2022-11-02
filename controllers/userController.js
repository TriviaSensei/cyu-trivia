const User = require('../models/userModel');
const slugify = require('slugify');
const APIFeatures = require('../utils/apiFeatures');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach((el) => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

//middleware for aliasing
//make the default sort by last name
exports.sortByName = (req, res, next) => {
	req.query.sort = 'lName';
	next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
	//error if user tries to POST password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(
			new AppError(
				'This route is not for password updates. Please use the changePassword route',
				400
			)
		);
	}

	//update the user's information
	const updatedInfo = filterObj(
		req.body,
		'firstName',
		'lastName',
		'displayName',
		'email'
	);
	//make sure the slug isn't taken, and update if it is for whatever reason
	let slug = slugify(`${updatedInfo.fName} ${updatedInfo.lName}`);
	let userCheck;
	let i = 1;
	do {
		let userCheck = await User.find({ slug });
		i++;
		if (userCheck[0]) {
			slug = slugify(`${updatedInfo.fName} ${updatedInfo.lName} ${i}`);
		}
	} while (userCheck);
	updatedInfo['slug'] = slug;
	const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedInfo, {
		new: true,
		runValidators: true,
	});
	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser,
		},
	});
});

exports.getUser = catchAsync(async (req, res, next) => {
	let user = await User.find({ slug: req.params.id }).select([
		'-email',
		'-password',
		'-passwordConfirm',
		'-passwordChangedAt',
	]);

	if (!user[0]) {
		user = await User.findById(req.params.id).select([
			'-email',
			'-password',
			'-passwordConfirm',
			'-passwordChangedAt',
		]);
		if (!user) {
			return res.status(404).json({
				stauts: 'error',
				message: 'User not found',
			});
		}
	}
	res.status(200).json({
		status: 'success',
		data: {
			user: user[0],
		},
	});
});

//standard routes
exports.getAllUsers = catchAsync(async (req, res, next) => {
	let users = await User.find().sort({
		active: 1,
		lastName: 1,
		firstName: 1,
	});

	if (!users) {
		return res.status(404).json({
			status: 'fail',
			message: 'Users not found',
		});
	}

	res.status(200).json({
		status: 'success',
		data: users,
	});
});

exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
