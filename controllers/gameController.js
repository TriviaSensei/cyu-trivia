const Game = require('../models/gameModel');
const User = require('../models/userModel');
const factory = require('../controllers/handlerFactory');
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');
const { ImgurClient } = require('imgur');
const S3 = require('aws-sdk/clients/s3');
const client = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });
const { v4: uuidV4 } = require('uuid');
const { resolve } = require('path');
const AppError = require('../utils/appError');
const { default: mongoose } = require('mongoose');
const deleteTimeout = 5 * 60 * 1000;

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
	limits: { fileSize: 1024 * 1024 },
});

exports.uploadImages = upload.fields([{ name: 'pictures', maxCount: 1 }]);

exports.AWSUpload = catchAsync(async (req, res, next) => {
	const fileExtension = req.files.pictures[0].mimetype.split('/')[1];
	const filename = `${uuidV4()}.${fileExtension}`;

	const params = {
		Bucket: process.env.AWS_BUCKET,
		Key: filename,
		Body: req.files.pictures[0].buffer,
	};

	const data = await s3.upload(params).promise();

	res.status(200).json({
		status: 'success',
		data,
	});
});

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

exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
exports.getAll = factory.getAll(Game);
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
