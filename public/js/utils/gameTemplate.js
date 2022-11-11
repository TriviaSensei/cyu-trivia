const blankQuestion = {
	text: '',
	answer: '',
	value: undefined,
};

const blankPicture = {
	link: '',
	answer: '',
};

let game = {
	title: '',
	description: '',
	date: undefined,
	rounds: [
		{
			round: 1,
			format: 'std',
			title: 'Round 1 - General',
			description:
				'General knowledge. 8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager up to 10',
			questions: [],
		},
		{
			round: 2,
			format: 'pic',
			title: 'Round 2 - Pictures',
			description: '',
			pointsPerCorrect: 4,
			questions: [],
		},
		{
			round: 3,
			format: 'std',
			title: 'Round 3 - General',
			description:
				'General knowledge. 8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager up to 10',
			questions: [],
		},
		{
			round: 4,
			format: 'list',
			title: 'Round 4 - Halftime',
			description: '',
			pointsPerCorrect: 4,
			questions: [],
			answerCount: 10,
			answerBank: [],
		},
		{
			round: 5,
			format: 'std',
			title: 'Round 5 - General',
			description:
				'General knowledge. 8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager up to 10',
			questions: [],
		},
		{
			round: 6,
			format: 'audio',
			title: 'Round 6 - Audio',
			description: 'Name the title and artist, and the theme for 5 points.',
			link: '',
			questions: [],
		},
		{
			round: 7,
			format: 'std',
			title: 'Round 7 - General',
			description:
				'General knowledge. 8 questions\n2, 2, 4, 4, 6, 6, 8, 8 points\nBonus: wager up to 20',
			questions: [],
		},
	],
};

for (var i = 0; i <= 6; i += 2) {
	for (var j = 1; j <= 9; j++) {
		game.rounds[i].questions.push({
			...blankQuestion,
		});
	}
}

const picRound = game.rounds.findIndex((r) => {
	return r.format === 'pic';
});

if (picRound >= 0) {
	for (var i = 1; i <= 10; i++) {
		game.rounds[picRound].questions.push({
			...blankPicture,
		});
	}
}

export const blankGame = {
	...game,
};
