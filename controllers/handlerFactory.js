const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const moment = require('moment-timezone');
const User = require('../models/userModel');
//this will delete one of any document, depending on what gets passed to it.
exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		if (loc === 'users') {
			const userToDelete = await Model.findById(req.params.id);
			if (!userToDelete) {
				return res.status(404).json({
					status: 'fail',
					message: 'User not found.',
				});
			} else {
				if (userToDelete.role === 'owner') {
					return res.status(400).json({
						status: 'fail',
						message: 'Cannot delete owner.',
					});
				}
			}
		}

		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc) {
			return res.status(404).json({
				status: 'fail',
				message: 'No document found with that ID.',
			});
		}

		res.status(204).json({
			status: 'success',
			data: null,
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		// console.log(req.body);
		// console.log(req.params.id);
		if (loc.toLowerCase() === 'users') {
			const user = await Model.findById(req.params.id);
			if (!user) {
				return res.status(200).json({
					status: 'fail',
					message: 'User not found.',
				});
			}
			if (user.role === 'owner') {
				req.body.role = 'owner';
			}
		} else if (loc.toLowerCase() === 'games') {
			const arr = req.originalUrl.trim().split('/');
			const loc = arr.length > 3 ? arr[3] : '';

			const d = new Date().toISOString();
			const e = moment().tz('America/New_York').format();
			let offset =
				parseInt(e.split('T')[1].split(':')[0]) -
				parseInt(d.split('T')[1].split(':')[0]);

			if (offset > 0) offset = offset - 24;

			const newDate = new Date(req.body.date - offset * 1000 * 60 * 60);

			req.body.date = newDate;

			if (req.body.assignedHosts) {
				//find any host with this game already assigned
				const hosts = await User.find({
					assignedGames: req.params.id,
				});

				//remove this game from their list if they're not in the assigned hosts list for this request
				hosts.forEach(async (h) => {
					if (!req.body.assignedHosts.includes(h._id)) {
						console.log(h.assignedGames);
						h.assignedGames = h.assignedGames.filter((g) => {
							if (!g) return false;
							console.log(g.toString(), req.params.id);
							return g.toString() === req.params.id;
						});
						await h.save({ validateBeforeSave: false });
					}
				});

				//for every host, add it to their list if it's not already there
				req.body.assignedHosts.forEach(async (h) => {
					const host = await User.findById(h);
					if (host) {
						host.assignedGames = host.assignedGames.filter((g) => {
							return g;
						});
						if (
							!host.assignedGames.some((g) => {
								if (!g) return false;
								return g._id.toString() === req.params.id;
							})
						) {
							host.assignedGames.push(req.params.id);
							await host.save({ validateBeforeSave: false });
						}
					}
				});
			}

			req.body.lastModified = new Date();
		}

		let toReturn = null;

		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!doc) {
			return next(new AppError('No document found with that ID.', 404));
		}

		res.status(200).json({
			status: 'success',
			data: toReturn || doc,
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		if (loc === 'games') {
			const d = new Date().toISOString();
			const e = moment().tz('America/New_York').format();
			let offset =
				parseInt(e.split('T')[1].split(':')[0]) -
				parseInt(d.split('T')[1].split(':')[0]);

			if (offset > 0) offset = offset - 24;

			const newDate = new Date(req.body.date - offset * 1000 * 60 * 60);

			req.body.date = newDate;
		}
		req.body.lastModified = new Date();

		const doc = await Model.create(req.body);
		res.status(201).json({
			status: 'success',
			//envelope the new object
			data: doc,
		});
	});

exports.getOne = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';
		let filter = { _id: req.params.id };

		if (loc === 'games' || loc === 'rounds' || loc === 'questions') {
			filter = { ...filter, owner: req.user._id };
		}

		query = Model.find(filter);

		if (popOptions) query = query.populate(popOptions);
		const doc = await query;

		if (!doc) {
			return next(new AppError('No document found with that ID.', 404));
		}

		res.status(200).json({
			status: 'success',
			// data: {
			//   data: doc,
			// },
			data: doc,
		});
	});

exports.getAll = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		let filter = {};
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		if (loc === 'users') {
			req.query.sort = 'lastName';
		} else if (loc === 'games') {
			req.query.sort = '-lastModified';
		}

		let features;
		if (popOptions) {
			features = new APIFeatures(
				Model.find(filter).populate(popOptions),
				req.query
			)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		} else {
			features = new APIFeatures(Model.find(filter), req.query)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		}
		let doc = await features.query;
		// const tours = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

		res.status(200).json({
			status: 'success',
			results: doc.length,
			data: doc,
		});
	});
