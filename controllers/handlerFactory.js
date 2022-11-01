const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

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

		let toReturn = null;

		if (loc === 'questions') {
			const q = await Model.findById(req.params.id);

			if (!q) {
				return next(new AppError('Question not found.', 404));
			} else if (q.owner.toString() !== res.locals.user._id.toString()) {
				return next(new AppError('Question not found.', 404));
			}

			for (const [key, value] of Object.entries(req.body)) {
				if (!['answer', 'text', 'category'].includes(key)) {
					delete req.body[key];
				}
			}
		}

		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!doc) {
			return next(new AppError('No document found with that ID.', 404));
		}
		if (loc === 'rounds' && doc.type === 'std') {
			try {
				const values = doc.questions.map((q) => {
					return q.value;
				});
				let questionList = await Promise.all(
					doc.questions.map(async (q) => {
						const qq = await Question.findById(q._id);
						return qq;
					})
				);
				questionList = questionList.map((q, i) => {
					return {
						_id: q._id,
						results: q.results,
						category: q.category,
						text: q.text,
						answer: q.answer,
						owner: q.owner,
						value: values[i],
					};
				});
				doc.questions = questionList;
			} catch (err) {
				console.log(err);
				return next(new AppError(err.message));
			}
		} else if (loc === 'games') {
			try {
				const rounds = await Promise.all(
					doc.rounds.map(async (r) => {
						const toReturn = await Round.findById(r);
						return toReturn;
					})
				);

				for (var i = 0; i < rounds.length; i++) {
					if (rounds[i].type === 'std') {
						const questions = await Promise.all(
							rounds[i].questions.map(async (q) => {
								const toReturn = await Question.findById(q._id);
								return toReturn;
							})
						);
						rounds[i].questions = questions;
					}
				}

				toReturn = {
					...doc._doc,
					rounds,
				};
			} catch (err) {
				console.log(err);
				return next(new AppError(err.message));
			}
		}
		res.status(200).json({
			status: 'success',
			data: toReturn || doc,
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
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
		if (loc === 'games' || loc === 'rounds' || loc === 'questions') {
			filter = { owner: req.user._id };
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
		const doc = await features.query;
		// const tours = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

		res.status(200).json({
			status: 'success',
			results: doc.length,
			data: doc,
		});
	});
