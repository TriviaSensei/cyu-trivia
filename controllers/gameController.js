const Game = require('../models/gameModel');
const User = require('../models/userModel');
const factory = require('../controllers/handlerFactory');
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');
// const { ImgurClient } = require('imgur');
const S3 = require('aws-sdk/clients/s3');
// const client = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });
const { v4: uuidV4 } = require('uuid');
const AppError = require('../utils/appError');
const { default: mongoose } = require('mongoose');
const deleteTimeout = 5 * 60 * 1000;
const sharp = require('sharp');
const maxImageHeight = 200;

const s3 = new S3({
	accessKeyId: process.env.AWS_KEY,
	secretAccessKey: process.env.AWS_SECRET,
});

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError('Only images are accepted.', 400), false);
	}
};
const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter,
	limits: { fileSize: 10 * 1024 * 1024 },
});

exports.uploadImages = upload.fields([{ name: 'pictures', maxCount: 1 }]);

exports.AWSUpload = catchAsync(async (req, res, next) => {
	const fileExtension = req.files.pictures[0].mimetype.split('/')[1];
	const filename = `${uuidV4()}.${fileExtension}`;

	const metadata = await sharp(req.files['pictures'][0].buffer).metadata();

	const resizedBuffer =
		metadata.height > maxImageHeight
			? await sharp(req.files['pictures'][0].buffer)
					.resize({ height: maxImageHeight })
					.toBuffer()
			: undefined;

	const params = {
		Bucket: process.env.AWS_BUCKET,
		Key: filename,
		Body: resizedBuffer || req.files['pictures'][0].buffer,
	};

	const data = await s3.upload(params).promise();

	res.status(200).json({
		status: 'success',
		data,
	});
});

// exports.AWSGet = catchAsync(async (req, res, next) => {
// 	const params = {
// 		Bucket: process.env.AWS_BUCKET,
// 		MaxKeys: 10000,
// 	};

// 	const data = await s3.listObjects(params).promise();

// 	res.status(200).json({
// 		status: 'success',
// 		data,
// 	});
// });

exports.assignHost = catchAsync(async (req, res, next) => {
	const game = await Game.findById(req.params.id);
	const user = await User.findById(req.params.uid);

	if (!game || !user) {
		return next(new AppError('User or game not found', 404));
	}

	if (
		game.hosts.some((h) => {
			return h.toString() === req.params.uid;
		})
	) {
		return next(new AppError('Host is already assigned to this game.', 400));
	}

	game.hosts.push(new mongoose.Types.ObjectId(req.params.uid));
	user.assignedGames.push(new mongoose.Types.ObjectId(req.params.id));

	await game.save();
	await user.save();

	res.status(200).json({
		status: 'success',
		data: game,
	});
});

exports.getHostedGames = catchAsync(async (req, res, next) => {
	const games = await Game.find({
		assignedHosts: res.locals.user._id,
	});

	res.status(200).json({
		status: 'success',
		data: games,
	});
});

exports.verifyGame = catchAsync(async (req, res, next) => {
	req.body.ready = req.body.rounds.every((r, i) => {
		if (!r.description) {
			res.locals.message = `Round ${i + 1} is missing a description`;
			return false;
		}
		if (i % 2 === 0 || (i === 3 && r.format === 'questions')) {
			return r.questions.every((q, j) => {
				if (!q.text) {
					res.locals.message = `Round ${i + 1} Question ${
						j + 1
					} is missing text.`;
					return false;
				} else if (!q.answer) {
					res.locals.message = `Round ${i + 1} Question ${
						j + 1
					} is missing an answer.`;
					return false;
				} else if (!q.value && i !== 3) {
					res.locals.message = `Round ${i + 1} Question ${
						j + 1
					} is missing a value.`;
					return false;
				}
				return true;
			});
		} else {
			if (!r.pointsPerCorrect) {
				res.locals.message = `Round ${
					i + 1
				} is missing a point value for correct answers.`;
				return false;
			}
			if (i === 1) {
				return r.questions.every((q, j) => {
					if (!q.link) {
						res.locals.message = `Round ${i + 1} Question ${
							j + 1
						} is missing a link.`;
						return false;
					} else if (!q.answer) {
						res.locals.message = `Round ${i + 1} Question ${
							j + 1
						} is missing an answer.`;
						return false;
					}
					return true;
				});
			} else if (i === 3) {
				if (r.format === 'list') {
					if (r.answerCount > r.answerList.length) {
						res.locals.message = `Round ${
							i + 1
						} (list round) does not have a sufficiently long answer list.`;
						return false;
					}
				} else if (r.format === 'matching') {
					if (r.matchingPairs.length < 8) {
						res.locals.message = `Round ${
							i + 1
						} (matching) does not have a sufficiently long answer list.`;
						return false;
					}
				}
				return true;
			} else if (i === 5) {
				if (!r.videoLink) {
					res.locals.message = `Round ${
						i + 1
					} (Audio) does not have a video link.`;
					return false;
				} else if (r.theme && !r.themePoints) {
					res.locals.message = `Round ${
						i + 1
					} (Audio) has a theme but no value assigned to it.`;
					return false;
				} else if (!r.theme && r.themePoints) {
					res.locals.message = `Round ${
						i + 1
					} (Audio) has no theme specified but has a value assigned to the theme.`;
					return false;
				} else if (r.questions.length < 8) {
					res.locals.message = `Round ${
						i + 1
					} (Audio) does not have a sufficiently long answer list.`;
					return false;
				}
				return true;
			}
		}
	});
	next();
});

exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
exports.getAll = catchAsync(async (req, res, next) => {
	const data = await Game.find().sort({ date: -1 }).limit(10);
	res.status(200).json({
		status: 'success',
		data,
	});
});
exports.updateGame = factory.updateOne(Game);
// exports.deleteGame = factory.deleteOne(Game);

exports.deleteGame = catchAsync(async (req, res, next) => {
	const gameToDelete = await Game.findById(req.params.id);
	//make sure game is found
	if (!gameToDelete) {
		return res.status(404).json({
			status: 'fail',
			message: 'Game not found.',
		});
	}

	let action;
	if (!gameToDelete.deleteAfter) {
		gameToDelete.deleteAfter = Date.now() + deleteTimeout;
		setTimeout(
			async (id) => {
				const u = await Game.findById(id);
				if (!u.deleteAfter) {
					console.log(`Did not delete game ${id}`);
					return;
				} else if (u.deleteAfter > new Date()) {
					console.log(`Not yet time to delete game ${id}`);
					return;
				} else {
					console.log(`Deleting game ${id}`);
					await u.delete();
				}
			},
			deleteTimeout + 10,
			req.params.id
		);

		action = 'delete';
	} else {
		gameToDelete.deleteAfter = null;
		action = 'restore';
	}

	const data = await gameToDelete.save({ validateBeforeSave: false });

	res.status(200).json({
		status: 'success',
		action,
		data,
	});
});

// exports.uploadToImgur = catchAsync(async (req, res, next) => {
// 	if (!req.files || !req.files.pictures) {
// 		if ((typeof req.body.questions).toLowerCase() === 'string') {
// 			req.body.questions = JSON.parse(req.body.questions);
// 			req.body.questions = req.body.questions.map((q) => {
// 				return {
// 					image: q.image,
// 					answer: q.answer,
// 				};
// 			});
// 		}
// 		return next();
// 	}

// 	const responses = await Promise.all(
// 		req.files.pictures.map((p, i) => {
// 			console.log(p);

// 			return client.upload({
// 				image: p.buffer,
// 				title: p.originalname,
// 			});
// 		})
// 	);

// 	let code;
// 	if (
// 		responses.some((r) => {
// 			if (!r.success) {
// 				code = r.status;
// 				return true;
// 			}
// 		})
// 	) {
// 		return next(new AppError('Something went wrong', code));
// 	}

// 	res.status(200).json({
// 		status: 'success',
// 		data: responses.map((r) => {
// 			return r.data.link;
// 		}),
// 	});
// });
