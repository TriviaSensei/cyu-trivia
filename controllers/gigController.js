const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Gig = require('../models/gigModel');
const Host = require('../models/userModel');
const moment = require('moment-timezone');
const oneDay = 24 * 60 * 60 * 1000;

exports.getVenueResults = catchAsync(async (req, res, next) => {
	const data = [];

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.getUpcoming = catchAsync(async (req, res, next) => {
	const d = new Date().toISOString();
	const e = moment().tz('America/New_York').format();
	let offset =
		parseInt(e.split('T')[1].split(':')[0]) -
		parseInt(d.split('T')[1].split(':')[0]);

	if (offset > 0) offset = offset - 24;

	const today = new Date();
	today.setHours(offset);
	today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);

	const data = await Gig.find({
		date: { $gte: today },
	})
		.sort({
			date: 1,
			hour: 1,
			minute: 1,
		})
		.populate([
			{
				path: 'venue',
				select: ['name'],
			},
		]);

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.preventDuplicate = catchAsync(async (req, res, next) => {
	const allHosts = await Host.find();
	// const allHosts = hTemp.toJSON();

	const minTime = Date.parse(req.body.date) - oneDay;
	const maxTime = Date.parse(req.body.date) + oneDay;
	//find all gigs within 3 hours of the specified time
	const gTemp = await Gig.find({
		date: {
			$gte: minTime,
			$lte: maxTime,
		},
	}).populate([
		{
			path: 'hosts',
			select: ['firstName', 'lastName'],
		},
		{
			path: 'venue',
			select: 'name',
		},
	]);

	let message;
	const nearGigs = gTemp.filter((g) => {
		const t1 =
			Date.parse(g.date) + (g.hour - 3) * 60 * 60 * 1000 + g.minute * 60 * 1000;
		const t2 =
			Date.parse(g.date) + (g.hour + 3) * 60 * 60 * 1000 + g.minute * 60 * 1000;
		const t =
			Date.parse(req.body.date) +
			req.body.hour * 60 * 60 * 1000 +
			req.body.minute * 60 * 1000;
		return t > t1 && t < t2;
	});

	nearGigs.some((g) => {
		//skip the one being edited, if we're editing something
		if (req.params.id === g._id.toString()) return false;
		//make sure the venue isn't booked close to the booking we're trying to make
		if (g.venue._id.toString() === req.body.venue) {
			message = `Venue "${g.venue.name}" is booked within 3 hours of this booking.`;
			return true;
		} else {
			//make sure none of the hosts are booked close to the booking we're trying to make
			if (
				g.hosts.some((h1) => {
					return allHosts.some((h2) => {
						if (h1._id.toString() === h2._id.toString()) {
							message = `Host ${h2.firstName} ${h2.lastName} is booked within 3 hours of this booking.`;
							return true;
						}
					});
				})
			) {
				return true;
			}
		}
	});
	if (message) return next(new AppError(message));

	const venueGigs = await Gig.find({
		$and: [{ _id: { $ne: req.body.id } }, { _id: { $ne: req.params.id } }],
		venue: req.body.venue,
		game: req.body.game,
	}).populate({
		path: 'venue',
		select: 'name',
	});

	if (venueGigs.length > 0) {
		return next(
			new AppError(
				`That game has already been booked at ${venueGigs[0].venue.name}.`
			)
		);
	}

	next();
});

exports.createGig = catchAsync(async (req, res, next) => {
	if (!req.body.hosts || req.body.hosts.length === 0) {
		return next(new AppError('You must specify a host'));
	}

	const data = await Gig.create({ ...req.body, results: [] });

	res.status(200).json({
		status: 'success',
		data,
	});
});
exports.getGig = factory.getOne(Gig);
exports.getAllGigs = factory.getAll(Gig);
exports.updateGig = catchAsync(async (req, res, next) => {
	if (!req.body.hosts || req.body.hosts.length === 0) {
		return next(new AppError('You must specify a host'));
	}

	const data = await Gig.findById(req.params.id);
	data.venue = req.body.venue;
	data.date = req.body.date;
	data.game = req.body.game;
	data.hour = req.body.hour;
	data.minute = req.body.minute;
	data.hosts = req.body.hosts;
	data.markModified('hosts');
	await data.save({
		new: true,
		runValidators: true,
	});

	res.status(200).json({
		status: 'success',
		data,
	});
});
exports.deleteGig = factory.deleteOne(Gig);
