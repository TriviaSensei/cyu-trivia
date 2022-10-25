const questions = require('./questions');

const socket = (http, server) => {
	const io = require('socket.io')(http, {
		pingInterval: 100,
		pingTimeout: 500,
	});

	io.listen(server);

	io.on('connection', (socket) => {
		console.log(`A user has connected from ${socket.handshake.address}`);

		socket.on('request-questions', (data) => {
			io.to(socket.id).emit('questions', questions);
		});
	});
};

module.exports = socket;
