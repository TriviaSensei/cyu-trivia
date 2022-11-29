const { questions, pictures, wildcard } = require('./questions');
const Game = require('../models/gameModel');
const User = require('../models/userModel');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const UserManager = require('./managers/userManager');
const GameManager = require('./managers/gameManager');
const { v4: uuidv4 } = require('uuid');
const Filter = require('bad-words');
const filter = new Filter();

const randomCode = (len) => {
	let code = '';

	for (var i = 0; i < len; i++) {
		code = `${code}${Math.floor(Math.random() * 10)}`;
	}
	return code;
};

const createSlides = (data) => {
	const toReturn = [
		{
			new: true,
			clear: true,
			header: 'Welcome',
			body: `${data.description}\nhttps://www.cyutrivia.com/play\nJoin code: ${data.joinCode}`,
		},
		{
			new: true,
			clear: true,
			header: 'Rules',
			body: "1. Don't cheat\n2. Don't cheat\n3. Keep answers out of the public chat\n4. Challenges welcome\n5. Host decisions are final.",
		},
	];
	data.rounds.forEach((r, i) => {
		toReturn.push({
			new: true,
			clear: true,
			header: `Round ${i + 1}`,
			body: r.description,
		});
		if (i % 2 === 0) {
			r.questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: true,
					header: `Round ${i + 1}, ${
						j === r.questions.length - 1 ? 'Bonus' : `Question ${j + 1}`
					}\n${j === r.questions.length - 1 ? 'Wager 0-' : ''}${q.value} ${
						q.value === 1 ? 'point' : 'points'
					}`,
					body: q.text,
				});
			});
			toReturn.push({
				new: false,
				clear: false,
				timer: 2,
			});
		} else if (i === 1) {
			const toPush = [];

			r.questions.forEach((q, j) => {
				toPush.push({
					new: true,
					clear: false,
					header: `Round 2, Picture ${j + 1}`,
					picture: q.link,
				});
			});

			toReturn.push(toPush);

			toReturn.push({
				new: false,
				clear: false,
				timer: 1,
			});
		} else if (i === 3) {
			if (r.format === 'questions') {
				const toPush = [];

				r.questions.forEach((q, j) => {
					toPush.push({
						new: true,
						clear: false,
						header: `Round 3, Question ${j + 1}`,
						body: q.text,
					});
				});

				toReturn.push(toPush);
			}

			toReturn.push({
				new: false,
				clear: false,
				timer: 10,
			});
		} else if (i === 5) {
			toReturn.push({
				new: true,
				clear: false,
				header: 'Round 6 - Audio',
				videoLink: r.videoLink,
			});
			toReturn.push({
				new: false,
				clear: false,
				timer: 10,
			});
		}

		if (r.video) {
			toReturn.push({
				new: true,
				clear: true,
				header: 'Stand by',
				videoLink: r.video,
				videoStart: r.videoStart || 0,
			});
		}

		//answers for rounds 1, 3, 5
		if (i % 2 === 1) {
			toReturn.push({
				new: true,
				clear: true,
				header: `Round ${i} answers`,
				mode: 'answers',
				round: i - 1,
			});

			data.rounds[i - 1].questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round ${i}, ${
						j === data.rounds[i - 1].questions.length - 1
							? 'Bonus'
							: `Question ${j + 1}`
					}\n${
						j === data.rounds[i - 1].questions.length - 1 ? 'Wager 0-' : ''
					}${q.value} ${q.value === 1 ? 'point' : 'points'}`,
					body: q.text,
				});
				toReturn.push({
					new: false,
					clear: false,
					footer: q.answer,
				});
			});
		} else if (i === 6) {
			toReturn.push({
				new: true,
				clear: true,
				header: `Round 7 answers`,
				mode: 'answers',
				round: 6,
			});

			data.rounds[6].questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 7, ${
						j === data.rounds[6].questions.length - 1
							? 'Bonus'
							: `Question ${j + 1}`
					}\n${j === data.rounds[i].questions.length - 1 ? 'Wager 0-' : ''}${
						q.value
					} ${q.value === 1 ? 'point' : 'points'}`,
					body: q.text,
				});
				toReturn.push({
					new: false,
					clear: false,
					footer: q.answer,
				});
			});
		}

		if (i === 1) {
			//answers for round 2
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 2 answers',
				mode: 'answers',
				round: 1,
			});

			r.questions.forEach((q, j) => {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 2, Picture ${j + 1}`,
					picture: q.link,
					footer: q.answer,
				});
			});

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 3) {
			//answers for rounds 4
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 4 answers',
				mode: 'answers',
				round: 3,
			});

			if (r.format === 'questions') {
				r.questions.forEach((q, j) => {
					toReturn.push({
						new: true,
						clear: false,
						header: `Round 4, Question ${j + 1}`,
						body: q.text,
					});
					toReturn.push({
						new: false,
						clear: false,
						footer: q.answer,
					});
				});
			} else if (r.format === 'list') {
				let str = '';
				r.answerList.forEach((a, j) => {
					let isNew = false;
					if (j % 5 === 0) {
						str = '';
						isNew = true;
					}
					str = `${str}${a}\n`;
					toReturn.push({
						new: isNew,
						clear: false,
						header: `Round 4: List Answers`,
						body: str,
					});
				});
			} else if (r.format === 'matching') {
				r.matchingPairs.forEach((q, j) => {
					toReturn.push({
						new: true,
						clear: false,
						header: `Round 4: Matching Answers`,
						body: q.prompt,
					});
					toReturn.push({
						new: false,
						clear: false,
						footer: q.answer,
					});
				});
			}

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 5) {
			//answers for round 6
			toReturn.push({
				new: true,
				clear: true,
				header: 'Round 6 Answers',
				mode: 'answers',
				round: 5,
			});

			let str = '';
			r.questions.forEach((a, j) => {
				let isNew = false;
				if (j % 5 === 0) {
					str = '';
					isNew = true;
				}
				str = `${str}${j + 1}. ${a}\n`;
				toReturn.push({
					new: isNew,
					clear: false,
					header: `Round 6: Audio Answers`,
					body: str,
				});
			});

			if (r.theme) {
				toReturn.push({
					new: true,
					clear: false,
					header: `Round 6: Theme`,
					body: r.theme,
				});
			}

			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		} else if (i === 6) {
			toReturn.push({
				new: true,
				clear: true,
				type: 'scores',
			});
		}
	});

	return toReturn;
};

const socket = (http, server) => {
	const io = require('socket.io')(http, {
		pingInterval: 100,
		pingTimeout: 500,
	});

	io.listen(server);

	const userManager = new UserManager('id');
	const gameManager = new GameManager('id');

	io.on('connection', async (socket) => {
		const getCookie = (name) => {
			let cookies;
			if (socket.handshake.headers.cookie) {
				cookies = socket.handshake.headers.cookie.split(';');
				for (var j = 0; j < cookies.length; j++) {
					const tokens = cookies[j].trim().split('=');
					if (tokens[0] === name) {
						return tokens.length > 1 ? tokens[1] : null;
					}
				}
			}
			return null;
		};

		const uid = getCookie('id');
		const token = getCookie('jwt');
		let loggedInUser;
		let decoded;
		if (token) {
			decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
			if (decoded) {
				loggedInUser = await User.findById(decoded.id);
			}
		}
		console.log(`A user has connected from ${socket.handshake.address}`);
		if (loggedInUser) {
			console.log(`\tName: ${loggedInUser.displayName}`);
		}

		const user = userManager.addUser(
			{
				name: loggedInUser ? loggedInUser.displayName : '',
				socketid: socket.id,
			},
			uid
		);
		console.log(`\tID: ${user.id}`);

		io.to(socket.id).emit('set-user-cookie', { id: user.id });

		//rejoin the team and game chat if they were part of one already
		if (user.gameid) {
			socket.join(user.gameid);
		}
		if (user.teamid) {
			socket.join(user.teamid);
		}

		socket.on('request-questions', (data) => {
			io.to(socket.id).emit('questions', { questions, pictures, wildcard });
		});

		socket.on('start-game', async (data) => {
			if (!jwt || !user) {
				return io
					.to(socket.id)
					.emit('error', { message: 'You are not logged in.' });
			}

			const game = await Game.findById(data._id);
			if (!game || game.deleteAfter) {
				return io.to(socket.id).emit('error', { message: 'Game not found.' });
			}
			if (game.assignedHosts.includes(decoded.id)) {
				if (new Date() <= game.date && process.env.LOCAL !== 'true') {
					return io
						.to(socket.id)
						.emit('error', { message: 'This game may not be started yet.' });
				}
				const joinCode = process.env.LOCAL === 'true' ? '1111' : randomCode(4);
				game.joinCode = joinCode;

				const slides = createSlides(game);
				const newGame = gameManager.startNewGame(slides, joinCode, user.id);
				const updatedUser = userManager.setAttribute(
					user.id,
					'gameid',
					newGame.id
				);
				socket.join(newGame.id);
				if (updatedUser) {
					console.log(`${user.name} has started game ${newGame.id}`);
				}
				io.to(socket.id).emit('game-started', { slides, newGame });
				io.emit('live-now', {
					live: true,
				});
			} else {
				return io
					.to(socket.id)
					.emit('error', { message: 'You are not a host of this game.' });
			}
		});

		socket.on('join-game', (data) => {
			if (filter.isProfane(data.name)) {
				return io
					.to(socket.id)
					.emit('error', { message: 'Watch your language.' });
			}

			const game = gameManager.getGame(data.joinCode);

			if (!game) {
				return io.to(socket.id).emit('error', { message: 'Game not found.' });
			}
			const updatedUser = userManager.setAttribute(user.id, 'game', game.id);
			if (updatedUser) {
				console.log(`${data.name} joining game ${game.id}`);
			}
			socket.join(game.id);
			io.to(socket.id).emit('game-joined', game);
		});

		socket.on('disconnect', (reason) => {
			const user = userManager.getUser(socket.id);
			console.log(`${user ? user.name || user.id : 'A user'} has disconnected`);
			userManager.handleDisconnect(socket.id);
		});
	});
};

module.exports = socket;
