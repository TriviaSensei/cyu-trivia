const mongoose = require('mongoose');
const AppError = require('../utils/appError');

const venueSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Venue name is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify a name.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	slug: {
		type: String,
		required: true,
		unique: true,
		trim: true,
	},
	description: {
		type: String,
		required: [true, 'Venue description is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify a name.'],
		maxlength: [500, 'The maximum length is 100 characters'],
	},
	gameTime: {
		type: String,
		required: [true, 'Game time is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify a game time.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	address: {
		type: String,
		required: [true, 'Venue address is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify an address.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	website: {
		type: String,
		maxlength: [200, 'The maximum length is 200 characters'],
	},
	isHidden: {
		type: Boolean,
		default: false,
	},
});

const Venues = mongoose.model('Venues', venueSchema, 'venues');

module.exports = Venues;
