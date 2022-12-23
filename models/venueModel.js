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
	description: {
		type: String,
		required: [true, 'Venue description is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify a name.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	gameTime: {
		type: String,
		required: [true, 'Game time is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify a game time.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	public: {
		type: Boolean,
		required: [true, 'You must specify if the venue is public'],
		default: true,
	},
	address: {
		type: String,
		required: [true, 'Venue address is required'],
		unique: true,
		trim: true,
		minlength: [1, 'You must specify an address.'],
		maxlength: [100, 'The maximum length is 100 characters'],
	},
	photo: {
		type: String,
		trim: true,
	},
});

const Venues = mongoose.model('Venues', venueSchema, 'venues');

module.exports = Venues;
