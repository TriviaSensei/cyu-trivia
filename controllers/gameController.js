const Game = require('../models/gameModel');
const factory = require('../controllers/handlerFactory');
const catchAsync = require('../utils/catchAsync');
const multer = require('multer');

const { ImgurClient } = require('imgur');
const client = new ImgurClient({ clientId: process.env.IMGUR_CLIENT_ID });
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

exports.uploadToImgur = catchAsync(async (req, res, next) => {
	if (!req.files || !req.files.pictures) {
		if ((typeof req.body.questions).toLowerCase() === 'string') {
			req.body.questions = JSON.parse(req.body.questions);
			req.body.questions = req.body.questions.map((q) => {
				return {
					image: q.image,
					answer: q.answer,
				};
			});
		}
		return next();
	}

	const responses = await Promise.all(
		req.files.pictures.map((p, i) => {
			return client.upload({
				image: p.buffer,
				title: p.originalname,
			});
		})
	);

	let code;
	if (
		responses.some((r) => {
			if (!r.success) {
				code = r.status;
				return true;
			}
		})
	) {
		return next(new AppError('Something went wrong', code));
	}

	res.status(200).json({
		status: 'success',
		data: responses.map((r) => {
			return r.data.link;
		}),
	});
});

exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
exports.updateGame = factory.updateOne(Game);
exports.deleteGame = factory.deleteOne(Game);
