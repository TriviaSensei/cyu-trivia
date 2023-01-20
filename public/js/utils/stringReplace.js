export const replaceAll = (str, toReplace, replaceWith) => {
	if (replaceWith.indexOf(toReplace) >= 0) return str;

	while (str.indexOf(toReplace) >= 0) {
		str = str.replace(toReplace, replaceWith);
	}
	return str;
};
