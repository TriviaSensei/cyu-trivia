export const msgTypes = [
	{
		type: 'error',
		color: '#ffffff',
		bgcolor: '#ff0000',
	},
	{
		type: 'info',
		color: '#000000',
		bgcolor: '#d9ffd6',
	},
];

export const msgTimeout = {
	value: null,
};

export const showMessage = (type, msg, duration) => {
	clearTimeout(msgTimeout.value);
	hideMessage();
	let color;
	let bgcolor;
	let msgType = msgTypes.find((el) => {
		return el.type === type;
	});
	if (msgType) {
		color = msgType.color;
		bgcolor = msgType.bgcolor;
	} else {
		color = 'black';
		bgcolor = 'white';
	}
	const msgContainer = document.getElementById('message-container');
	const msgDiv = document.getElementById('game-message');
	msgDiv.innerHTML = msg;
	msgDiv.style = `color:${color};background-color:${bgcolor};opacity:1;`;
	msgDiv.classList.remove('invisible-div');
	msgTimeout.value = setTimeout(hideMessage, duration);
};

export const hideMessage = () => {
	const msgDiv = document.getElementById('game-message');
	msgDiv.classList.add('invisible-div');
	// msgTimeout = setTimeout(() => {
	//   msgDiv.style = 'display:none;';
	// }, 250);
};