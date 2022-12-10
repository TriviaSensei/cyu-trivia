export const createElement = (selector) => {
	var pattern = /^(.*?)(?:#(.*?))?(?:\.(.*?))?(?:@(.*?)(?:=(.*?))?)?$/;
	var matches = selector.match(pattern);
	var element = document.createElement(matches[1] || 'div');
	if (matches[2]) element.id = matches[2];
	if (matches[3]) element.className = matches[3];
	if (matches[4]) element.setAttribute(matches[4], matches[5] || '');
	return element;
};
