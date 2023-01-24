const { v4: uuidv4 } = require('uuid');
const Games = require('../../models/gameModel');

module.exports = class Game {
	constructor(gigId, host, joinCode, game) {
		this.id = uuidv4();
		this.players = [];
		this.teams = [];
		this.slides = [];
		this.allowAdvance = true;
		this.joinCode = joinCode;
		this.currentSlide = undefined;
		this.currentRound = 5;
		this.gameData = game;
		this.roundCount = game.rounds.length;
		this.key = [];
		game.rounds.forEach((r, i) => {
			let toPush = {
				round: i + 1,
				answers: [],
				saved: r.format === 'matching',
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
				toPush.answers.push({
					answer: '(Wrong)',
					correct: false,
					value: 0,
					matches: [],
				});
				r.answerList.forEach((a) => {
					toPush.answers.push({
						answer: a,
						correct: true,
						value: r.pointsPerCorrect,
						matches: [],
					});
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
		this.bannedList = [];
		this.active = true;
		this.gigId = gigId;
	}

	addSubmission(rd, submission) {
		if (rd >= this.key.length) return;

		if (rd !== 3 || this.gameData.rounds[rd].format === 'questions') {
			this.key[rd].answers.forEach((a) => {
				if (
					!a.submissions.some((s) => {
						if (a.question >= submission.answers.length) return false;
						return (
							s.answer === submission.answers[a.question - 1].toLowerCase()
						);
					})
				) {
					if (a.question <= submission.answers.length)
						a.submissions.push({
							answer: submission.answers[a.question - 1].toLowerCase(),
							correct: false,
							partial: 0,
						});
				}
			});
		} else if (this.gameData.rounds[rd].format === 'list') {
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
		} else if (this.gameData.rounds[rd].format === 'matching') {
			//we don't need to add submissions for matching rounds -
			//there are a discrete set of possible answers for each one already,
			//so the host just needs to set the correct answers and the system
			//will look for exact matches.
		}

		if (this.getKeyForRound(rd)) {
			this.gradeRound(rd, this.getKeyForRound(rd).answers);
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
				if (resp.final)
					return { name: t.name, id: t.id, answers: resp.answers };
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
	gradeRound(rd, key) {
		let keyMatch;
		let hostMatch;

		const r = this.gameData.rounds[rd - 1];

		if (rd !== 4 || r.format === 'questions' || r.format === 'audio') {
			keyMatch = 'question';
			hostMatch = 'submissions';
		} else if (r.format === 'list') {
			keyMatch = 'answer';
			hostMatch = 'matches';
		} else if (r.format === 'matching') {
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
		this.key.some((k) => {
			if (k.round === rd) {
				k.saved = true;
				return true;
			}
		});

		const roundKey = this.getKeyForRound(rd);

		if (rd !== 4 || r.format === 'questions') {
			//for each team,
			this.teams.forEach((t) => {
				//find their submission for this round
				t.submissions.some((s) => {
					if (s.round === rd) {
						//reset the score
						s.score = 0;
						s.result = [];
						//for each answer...
						s.answers.forEach((ans, q) => {
							//look it up in the key
							const k = roundKey.answers.find((a) => {
								return a.question === q + 1;
							});

							/**
							 * {
							 * 		question: 1,
							 * 		answer: 'Ans',
							 * 		value: 2,
							 * 		submissions: [{
							 * 			{
							 * 				answer: 'ans',
							 * 				correct: true,
							 * 				partial: 0
							 * 			},...
							 * 		}]
							 * }
							 */
							const toPush = k.submissions.find((s2) => {
								return s2.answer.toLowerCase() === ans.toLowerCase();
							}) || {
								answer: ans,
								correct: false,
								partial: 0,
							};
							s.result.push(toPush);
							//calculate the score
							if (toPush.correct) {
								if (q === s.answers.length - 1 && rd % 2 === 1) {
									s.score = s.score + s.wager;
								} else {
									s.score = s.score + (k.value || 0);
								}
							} else if (toPush.partial > 0) {
								s.score = s.score + toPush.partial;
							} else {
								if (q === s.answers.length - 1) {
									s.score = s.score - (s.wager || 0);
								}
							}
						});
						return true;
					}
				});
			});
		} else if (r.format === 'list') {
			this.teams.forEach((t) => {
				t.submissions.some((s) => {
					if (s.round === rd) {
						s.result = [];
						s.score = 0;

						s.answers.forEach((ans) => {
							const match = roundKey.answers.find((k) => {
								return k.matches.some((m) => {
									return m.toLowerCase() === ans.toLowerCase();
								});
							});
							if (!match) {
								s.result.push({
									answer: ans,
									match: '(Wrong)',
									score: 0,
								});
							} else {
								if (
									!s.result.find((r) => {
										return r.match === match.answer;
									})
								) {
									s.result.push({
										answer: ans,
										match: match.answer,
										score: match.value,
									});
									s.score = s.score + match.value;
								} else {
									s.result.push({
										answer: ans,
										match: match.answer,
										score: 0,
									});
								}
							}
						});
						return true;
					}
				});
			});
		} else if (r.format === 'matching') {
			this.teams.forEach((t) => {
				t.submissions.some((s) => {
					if (s.round === rd) {
						s.result = [];
						s.score = 0;

						s.answers.forEach((ans, i) => {
							if (
								!s.result.find((r) => {
									return r.prompt === ans.prompt;
								})
							) {
								const q = roundKey.answers[i];
								if (q.answer === ans) {
									s.result.push({ ...q });
									s.score = s.score + q.value;
								} else {
									s.result.push({
										...q,
										answer: ans,
										value: 0,
									});
								}
							}
						});

						return true;
					}
				});
			});
		}

		return this.getKeyForRound(rd);
	}

	getScoresAfterRound(rd) {
		return this.teams
			.map((t) => {
				return {
					name: t.name,
					id: t.id,
					roomid: t.roomid,
					score: t.submissions.reduce((p, c, i) => {
						if (isNaN(c.score)) {
							c.score = 0;
						}
						if (isNaN(c.adjustment)) {
							c.adjustment = 0;
						}
						if (c.round <= rd)
							return p + (isNaN(c.score) ? 0 : c.score) + c.adjustment;
						else return p;
					}, 0),
				};
			})
			.sort((a, b) => {
				return a.score - b.score;
			});
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

		this.teams.some((t) => {
			if (t.id === id) {
				if (
					!t.members.some((m) => {
						return m.connected;
					})
				) {
					t.active = false;
				}
				return true;
			}
		});

		return toReturn;
	}

	getTeam(id) {
		return this.teams.find((t) => {
			return t.id === id;
		});
	}

	advanceSlide() {
		if (
			this.timer &&
			new Date() < this.timer &&
			this.teams.some((t) => {
				return !t.submissions[this.currentRound || 0].final;
			})
		)
			return {
				status: 'fail',
				message: `You must wait ${Math.floor(
					(this.timer - new Date()) / 1000
				)} seconds or until all teams submit before continuing.`,
				endGame: false,
			};

		if (!this.allowAdvance) {
			return {
				status: 'fail',
				message: 'Please wait for scores to display before continuing',
				endGame: false,
			};
		}

		if (this.currentSlide >= this.slides.length - 1) {
			return {
				status: 'fail',
				message: 'You have reached the end of the deck.',
				endGame: true,
			};
		}

		if (this.slides[this.currentSlide + 1].mode === 'scores') {
			let failure;
			if (
				!this.key.every((k, i) => {
					if (i > this.currentRound || k.saved) return true;
					failure = i;
					return false;
				})
			) {
				return {
					status: 'fail',
					message: `You have not saved grades for round ${failure + 1}`,
					endGame: false,
				};
			} else {
				this.slides[this.currentSlide + 1].scores = this.getScoresAfterRound(
					this.currentRound + 1
				);
			}
		}

		this.currentSlide === undefined
			? (this.currentSlide = 0)
			: this.currentSlide++;

		if (this.slides[this.currentSlide].timer) {
			this.setTimer(this.slides[this.currentSlide].timer);
		} else {
			this.timer = undefined;
		}

		if (this.slides[this.currentSlide].newRound) {
			this.currentRound === undefined
				? (this.currentRound = 0)
				: this.currentRound++;
		}

		return { status: 'OK', slide: this.slides[this.currentSlide] };
	}

	setAllAnswers(rd) {
		if (rd <= 0) return;
		console.log(`Pulling answers for round ${rd}`);
		this.teams.forEach((t) => {
			t.submissions.some((s) => {
				if (s.round === rd) {
					s.final = true;
					return true;
				}
			});
		});
	}

	setAdjustment(teamId, round, adjustment) {
		const team = this.teams.find((t) => {
			return t.id === teamId;
		});
		if (!team)
			return {
				status: 'fail',
				message: 'Team not found',
			};

		if (round > this.roundCount)
			return {
				status: 'fail',
				message: 'Invalid round',
			};

		if (isNaN(adjustment))
			return {
				status: 'fail',
				message: 'Invalid adjustment',
			};

		team.setAdjustment(round - 1, adjustment);
		return {
			status: 'OK',
		};
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

	removeChatMessage(id) {
		this.chat = this.chat.filter((c) => {
			return c.mid !== id;
		});
	}

	setTimer(minutes) {
		this.timer = Date.parse(new Date()) + minutes * 60 * 1000;
	}

	banPlayer(player) {
		this.bannedList.push(player);
	}

	isBanned(player) {
		return this.bannedList.some((p) => {
			return p.id === player.id || p.address === player.address;
		});
	}
};
