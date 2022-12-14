const mongoose = require('mongoose');
const Filter = require('bad-words');
const filter = new Filter();
const moment = require('moment-timezone');
const validateDate = require('./validators/validateDate');

const noBadWords = (val) => !filter.isProfane(val);

const gameSchema = new mongoose.Schema({
	title: {
		type: String,
		unique: true,
		trim: true,
		maxlength: [100, 'The maximum length of a game name is 100 characters'],
		minlength: [1, 'You must specify a title.'],
		validate: {
			validator: noBadWords,
			message: 'Watch your language.',
		},
	},
	description: {
		type: String,
		maxlength: [
			1000,
			'The maximum length of the description is 1000 characters',
		],
		validate: {
			validator: noBadWords,
			message: 'Watch your language.',
		},
	},
	date: {
		type: Date,
		required: [true, 'You must specify a date'],
	},
	rounds: [Object],
	ready: Boolean,
	lastModified: Date,
	deleteAfter: Date,
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
