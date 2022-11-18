const mongoose = require('mongoose');
const Filter = require('bad-words');
const filter = new Filter();
const moment = require('moment-timezone');

const AppError = require('../utils/appError');

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
		validate: {
			validator: (val) => {
				if (!val) return true;

				const d = new Date().toISOString();
				const e = moment().tz('America/New_York').format();
				let offset =
					parseInt(e.split('T')[1].split(':')[0]) -
					parseInt(d.split('T')[1].split(':')[0]);

				if (offset > 0) offset = offset - 24;

				const currentDate = new Date(
					Date.parse(new Date()) + offset * 60 * 60 * 1000
				);
				const month = currentDate.getMonth();
				const date = currentDate.getDate();
				const year = currentDate.getFullYear();

				const submittedDate = new Date(
					Date.parse(val) - offset * 60 * 60 * 1000
				);

				const sMonth = submittedDate.getMonth();
				const sDate = submittedDate.getDate();
				const sYear = submittedDate.getFullYear();

				// console.log(offset);
				// console.log(year, month + 1, date);
				// console.log(sYear, sMonth + 1, sDate);

				return !(
					sYear < year ||
					(sYear === year && sMonth < month) ||
					(sYear === year && sMonth === month && sDate < date)
				);
			},
			message: 'Game date must be in the future.',
		},
	},
	rounds: [Object],
	assignedHosts: {
		type: [mongoose.Schema.ObjectId],
		ref: 'user',
	},
	ready: Boolean,
	lastModified: Date,
	deleteAfter: Date,
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
