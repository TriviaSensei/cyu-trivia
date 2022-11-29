export const setUserCookie = (data) => {
	const d = new Date();
	d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
	let expires = `expires=${d.toUTCString()}`;
	document.cookie = `id=${data.id};${expires};path=/`;
};
