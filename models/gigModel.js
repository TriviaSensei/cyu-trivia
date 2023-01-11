const mongoose = require('mongoose');
const validateDate = require('./validators/validateDate');

const gigSchema = new mongoose.Schema({
	game: {
		type: mongoose.Schema.ObjectId,
		ref: 'Games',
	},
	hosts: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Users',
	},
	venue: {
		type: mongoose.Schema.ObjectId,
		ref: 'Venues',
	},
	date: {
		type: Date,
		validate: {
			validator: validateDate,
			message: 'Game date must be in the future.',
		},
	},
	hour: {
		type: Number,
		required: true,
	},
	minute: {
		type: Number,
		required: true,
	},
	results: [Object],
});

const Gigs = mongoose.model('Gigs', gigSchema, 'gigs');

module.exports = Gigs;
