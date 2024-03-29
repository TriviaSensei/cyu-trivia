const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: './config.env' });
const port = process.env.PORT || 3000;

const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASSWORD);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(async () => {
		console.log('DB connection successful');
	});

const server = app.listen(port, () => {
	console.log(
		`Application started on port ${port}, running in ${process.env.NODE_ENV}`
	);
});

const http = require('http').Server(app);
const socketManager = require('./utils/socketManager')(http, server);

process.on('unhandledRejection', (err) => {
	console.log(err.name, err.message);
	console.log('Unhandled rejection. Shutting down.');
	console.log(err.stack);
	server.close(() => {
		process.exit(1);
	});
});

process.on('uncaughtException', (err) => {
	console.log(err.name, err.message);
	console.log(err.stack);
	console.log('Unhandled exception. Shutting down.');
	console.log('Bye bye');
	server.close(() => {
		process.exit(1);
	});
});
