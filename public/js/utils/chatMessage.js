export const createChatMessage = (id, message, name, ...from) => {
	const n = document.createElement('div');
	n.classList.add('chat-message-container');
	let isSystem = false;
	if (from.length === 0) {
		n.classList.add('from-other');
	} else {
		from.forEach((f) => {
			if (f) n.classList.add(`from-${f}`);
			if (f === 'host' && name !== 'Me') name = `${name} (Host)`;
			if (f === 'system') isSystem = true;
		});
	}

	if (!isSystem) {
		const label = document.createElement('div');
		label.classList.add('chat-label');
		label.innerHTML = name;
		n.appendChild(label);
	}

	const msg = document.createElement('div');
	msg.classList.add('chat-message');
	msg.innerHTML = message;

	n.appendChild(msg);

	n.setAttribute('id', `msg-${id}`);

	return n;
};
