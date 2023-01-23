const getOffset = require('../../utils/getOffset');

const validateDate = (val) => {
	if (!val) return true;

	let offset = getOffset();

	const currentDate = new Date(
		Date.parse(new Date()) + offset * 60 * 60 * 1000
	);
	const month = currentDate.getMonth();
	const date = currentDate.getDate();
	const year = currentDate.getFullYear();

	const submittedDate = new Date(Date.parse(val) - offset * 60 * 60 * 1000);

	const sMonth = submittedDate.getMonth();
	const sDate = submittedDate.getDate();
	const sYear = submittedDate.getFullYear();

	return !(
		sYear < year ||
		(sYear === year && sMonth < month) ||
		(sYear === year && sMonth === month && sDate < date)
	);
};

module.exports = validateDate;
