const moment = require('moment-timezone');

const getOffset = () => {
	const d = new Date().toISOString();
	const e = moment().tz('America/New_York').format();
	let offset =
		parseInt(e.split('T')[1].split(':')[0]) -
		parseInt(d.split('T')[1].split(':')[0]);

	if (offset > 0) offset = offset - 24;

	return offset;
};

module.exports = getOffset;
