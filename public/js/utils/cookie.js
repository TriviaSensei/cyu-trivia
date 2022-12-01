export const setUserCookie = (data) => {
	const d = new Date();
	d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
	let expires = `expires=${d.toUTCString()}`;
	document.cookie = `id=${data.id};${expires};path=/`;
};

export const getCookie = (key) => {
	let cookies;
	if (document.cookie) {
		cookies = document.cookie.split(';');
		for (var j = 0; j < cookies.length; j++) {
			const tokens = cookies[j].trim().split('=');
			if (tokens[0] === key) {
				return tokens.length > 1 ? tokens[1] : null;
			}
		}
	}
	return null;
};
