const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Venue = require('../models/venueModel');
const S3 = require('aws-sdk/clients/s3');
const { v4: uuidV4 } = require('uuid');
const multer = require('multer');
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

exports.uploadImages = upload.fields([{ name: 'venue-photo', maxCount: 1 }]);

exports.AWSUpload = catchAsync(async (req, res, next) => {
	const fileExtension = req.files['venue-photo'][0].mimetype.split('/')[1];
	const filename = `${uuidV4()}.${fileExtension}`;

	const metadata = await sharp(req.files['venue-photo'][0].buffer).metadata();

	const resizedBuffer =
		metadata.height > maxImageHeight
			? await sharp(req.files['venue-photo'][0].buffer)
					.resize({ height: maxImageHeight })
					.toBuffer()
			: undefined;

	const params = {
		Bucket: process.env.AWS_BUCKET,
		Key: filename,
		Body: resizedBuffer || req.files['venue-photo'][0].buffer,
	};

	const data = await s3.upload(params).promise();

	req.body.photo = data.Location;
	next();
});

exports.createVenue = factory.createOne(Venue);
exports.getVenue = factory.getOne(Venue);
exports.getAllVenues = factory.getAll(Venue);
exports.updateVenue = factory.updateOne(Venue);
exports.deleteVenue = factory.deleteOne(Venue);
