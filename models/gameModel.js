const mongoose = require('mongoose');
const Filter = require('bad-words');
const filter = new Filter();
const AppError = require('../utils/appError');

const noBadWords = (val) => !filter.isProfane(val);

const gameSchema = new mongoose.Schema({
	title: {
		type: String,
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
		validate: {
			validator: (val) => {
				return new Date() < val || !val;
			},
			message: 'Game date must be in the future.',
		},
	},
	rounds: [Object],
	ready: Boolean,
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
