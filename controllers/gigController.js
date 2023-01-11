const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Gig = require('../models/gigModel');

exports.getVenueResults = catchAsync(async (req, res, next) => {
	const data = [];

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.createGig = catchAsync(async (req, res, next) => {
	console.log(req.body);

	const data = await Gig.create({ ...req.body, results: [] });

	res.status(200).json({
		status: 'success',
		data,
	});
});
exports.getGig = factory.getOne(Gig);
exports.getAllGigs = factory.getAll(Gig);
exports.updateGig = factory.updateOne(Gig);
exports.deleteGig = factory.deleteOne(Gig);
