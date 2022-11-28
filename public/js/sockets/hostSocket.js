export const Host = (socket) => {
	socket.on('game-started', (data) => {
		console.log(data);
	});
};
