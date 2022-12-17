const { v4: uuidv4 } = require('uuid');
const Games = require('../../models/gameModel');

module.exports = class Game {
	constructor(host, joinCode, game) {
		this.id = uuidv4();
		this.players = [];
		this.teams = [];
		this.slides = [];
		this.joinCode = joinCode;
		this.currentSlide = undefined;
		this.currentRound = undefined;
		this.gameData = game;
		this.roundCount = game.rounds.length;
		this.key = [];
		game.rounds.forEach((r, i) => {
			let toPush = {
				round: i + 1,
				answers: [],
				format: 'questions',
			};
			if (i !== 3 || r.format === 'questions') {
				toPush.answers = r.questions.map((q, j) => {
					return {
						question: j + 1,
						answer: i === 5 ? q : q.answer,
						value: i % 2 === 1 ? r.pointsPerCorrect : q.value,
						submissions: [],
					};
				});
				if (i === 5 && r.theme && r.themePoints) {
					toPush.answers.push({
						question: r.questions.length + 1,
						answer: r.theme,
						value: r.themePoints,
						submissions: [],
					});
					toPush.format = 'audio';
				}
			} else if (r.format === 'list') {
				toPush.format = 'list';
				toPush.answers = r.answerList.map((a) => {
					return {
						answer: a,
						correct: true,
						value: r.pointsPerCorrect,
						matches: [],
					};
				});
				toPush.answers.push({
					answer: '(Wrong)',
					correct: false,
					value: 0,
					matches: [],
				});
			} else if (r.format === 'matching') {
				toPush.format = 'matching';
				toPush.answers = r.matchingPairs.map((m, j) => {
					return {
						...m,
						question: j + 1,
						value: r.pointsPerCorrect,
					};
				});
				r.extraAnswers.forEach((e) => {
					toPush.answers.push({
						prompt: '',
						answer: e,
						question: null,
						value: 0,
					});
				});
			}
			this.key.push(toPush);
		});
		this.chat = [];
		this.host = host;
		this.timer = undefined;
	}

	addSubmission(rd, submission) {
		console.log(rd);
		console.log(submission);
		if (rd >= this.key.length) return;

		console.log(this.key[rd]);

		if (rd !== 3 || game.rounds[rd].format === 'questions') {
			this.key[rd].answers.forEach((a) => {
				if (
					!a.submissions.some((s) => {
						return (
							s.answer === submission.answers[a.question - 1].toLowerCase()
						);
					})
				) {
					a.submissions.push({
						answer: submission.answers[a.question - 1].toLowerCase(),
						correct: false,
						partial: 0,
					});
				}
				console.log(a);
			});
		} else if (game.rounds[rd].format === 'list') {
			submission.answers.forEach((s) => {
				this.key[rd].answers.some((a) => {
					if (s.toLowerCase() === a.answer.toLowerCase() || !a.correct) {
						if (!a.matches.includes(s.toLowerCase())) {
							a.matches.push(s.toLowerCase());
						}
						return true;
					}
				});
			});
		} else if (game.rounds[rd].format === 'matching') {
			//we don't need to add submissions for matching rounds -
			//there are a discrete set of possible answers for each one already,
			//so the host just needs to set the correct answers and the system
			//will look for exact matches.
		}
	}

	/*
	[
		{
			name: 'team name 1',
			answers: [
				'ans1',
				'ans2',...
			]
		}, ...
	]
	*/
	getSubmissionsForRound(rd) {
		return this.teams
			.map((t) => {
				const resp = t.getResponse(rd);
				if (resp.final) return { name: t.name, answers: resp.answers };
				else return null;
			})
			.filter((r) => {
				return r !== null;
			});
	}

	getKeyForRound(rd) {
		return this.key.find((r) => {
			return r.round === rd;
		});
	}

	gradeRound(rd, key) {
		/*
		Standard rounds:
		Key: 
		{
			round: 1,
			answers: [
				{
					question: 1,
					answer: 'ans',
					value: 2,
					submissions: [
						{
							answer: 'ans',
							correct: true,
							partial: 0
						},
						{
							answer: ans2',
							correct: false,
							partial: 1
						},...
					]
				}, ...
			]
		}

		Host sends: 
		[
			{
				question: 1,
				submissions: [
					{
						answer: 'ans',
						correct: true,
						partial: 0
					}, ...
				]
			}
		]
		*/
		let keyMatch;
		let hostMatch;
		if (rd !== 3 || r.format === 'questions') {
			keyMatch = 'question';
			hostMatch = 'submissions';
		} else if (r.format === 'list') {
			/*
		List rounds:
		Key: 
		{
			round: 3,
			answers: [
				{
					answer: 'item1',
					value: 4,
					matches: [
						'item1','itm1','itemone'
					]
				},
				{
					answer: 'item2',
					value: 4,
					matches: [
						'item2','itm2','itemtwo'
					]
				}...
			]
		}
		Host sends: 
		[
			{
				answer: 'item1',
				matches: [
					'item1','itm1','itemone'
				]
			},
			{
				answer: 'item2',
				matches: [
					'item2','itm2','itemtwo'
				]
			}...
		]
		 */
			keyMatch = 'answer';
			hostMatch = 'matches';
		} else if (r.format === 'matching') {
			/*
		Matching round:
		Key: [
			{
				question: 1,
				value: 4,
				prompt: 'Austin',
				answer: 'Texas',
			}...
		]
		Host sends:
		[
			{
				prompt: 'Austin',
				answer: 'Texas',
			}, ...
		]
		*/
			keyMatch = 'prompt';
			hostMatch = 'answer';
		}
		if (!(keyMatch && hostMatch)) return null;
		this.key[rd - 1].answers.forEach((a) => {
			const k = key.find((el) => {
				return el[keyMatch] === a[keyMatch];
			});
			if (!k) return;
			a[hostMatch] = k[hostMatch];
		});
		return this.getKeyForRound(rd);
	}

	containsPlayer(id) {
		return this.players.some((m) => {
			m.id === id;
		});
	}

	removePlayer(id) {
		this.players = this.players.filter((m) => {
			return m.id !== id;
		});
	}

	addPlayer(player) {
		if (
			!this.players.some((m) => {
				return m.id === player.id;
			})
		)
			this.players.push(player);
	}

	addTeam(team) {
		if (
			this.teams.find((t) => {
				return t.name === team.name;
			})
		) {
			return null;
		}
		this.teams.push(team);
		return team;
	}

	removeTeam(id) {
		let toReturn = false;

		this.teams = this.teams.filter((t) => {
			if (t.id === id) {
				if (
					!t.members.some((m) => {
						return m.connected;
					})
				) {
					toReturn = true;
					return false;
				}
				return true;
			}
			return true;
		});

		return toReturn;
	}

	getTeam(id) {
		return this.teams.find((t) => {
			return t.id === id;
		});
	}

	advanceSlide() {
		if (this.timer && new Date() < this.timer && process.env.LOCAL !== 'true')
			return false;

		this.currentSlide === undefined
			? (this.currentSlide = 0)
			: this.currentSlide++;

		if (this.slides[this.currentSlide].timer) {
			this.setTimer(this.slides[this.currentSlide].timer);
		}

		if (this.slides[this.currentSlide].newRound) {
			this.currentRound === undefined
				? (this.currentRound = 0)
				: this.currentRound++;
		}

		return true;
	}

	getTeamForPlayer(id) {
		return this.teams.find((t) => {
			return t.containsPlayer(id);
		});
	}

	addChatMessage(user, text) {
		let toReturn = {
			mid: uuidv4(),
			user,
			isHost: user.id === this.host.id,
			text,
		};
		this.chat.push(toReturn);
		return toReturn;
	}

	setTimer(minutes) {
		this.timer = Date.parse(new Date()) + minutes * 60 * 1000;
	}
};
