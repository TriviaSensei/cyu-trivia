const questions = [
	{
		value: 2,
		text: '"Computer", "Amazon", and "Echo" were the original alternative "wake words" that could replace @@what default word@@?',
		answer: 'ALEXA',
	},
	{
		value: 2,
		text: 'The Isla Grande de Tierra del Fuego is split between what two countries?',
		answer: 'ARGENTINA, CHILE',
	},
	{
		value: 4,
		text: `With various explanations, including the shape of a serrano pepper, its similarity in appearance to bird feed, and the way it was originally eaten, the name of what condiment translates into English as "rooster's beak"?`,
		answer: 'PICO DE GALLO',
	},
	{
		value: 4,
		text: 'ALF, the title character of the 1980s sitcom, most notably eats what animal, as they were the equivalent of cattle on his home planet?',
		answer: 'CATS',
	},
	{
		value: 6,
		text: 'Part of his "Celebration" series, **what artist** is possibly best-known for his series of stainless steel sculptures titled "Balloon Dog", five sculptures of the title object, in blue, magenta, orange, red, and yellow?',
		answer: 'JEFF KOONS',
	},
	{
		value: 6,
		text: 'Also known as a bar or scaffolding piercing, **what adjective** is used to name an ear piercing consisting of two holes in the cartilage, connected by a single piece of jewelry, normally a "barbell"?',
		answer: 'INDUSTRIAL (PIERCING)',
	},
	{
		value: 8,
		text: '**Name the K-Pop group** who, with their recent release of "Between 1&2", achieved a top three album in the U.S. for the second time (becoming the first female K-Pop act to do so), and, in 2020, charted on the Billboard 200 for the second time with "Eyes Wide Open".',
		answer: 'TWICE',
	},
	{
		value: 8,
		text: 'What term, from the Greek for a female slave, was first used in 1969, in an anthropological study by Dana Raphael, where she claimed that it was common practice for a female of the same species to be a part of childbirth?',
		answer: 'DOULA',
	},
];

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
