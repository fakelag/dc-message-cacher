// import moment from 'moment';
import fs from 'fs';
import * as discord from 'discord.js';

const bot = new discord.Client();

const config = {
	cacheChannels: ['general', 'shitpost'],
};

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

process.on('unhandledRejection', console.log);

['SIGINT', 'SIGTERM'].forEach((sig) => {
	process.on(sig, () => {
		process.exit();
	});
});

const fetchMessages = (chan, mList, done) => {
	chan.fetchMessages({ limit: 100, before: mList.length ? mList[mList.length - 1].id : undefined }).then((messages) => {
		if (messages.size)
			fetchMessages(chan, mList.concat(messages.array()), done);
		else
			done(null, chan, mList.reverse());
	}).catch((err) => {
		done(err, chan, mList.reverse());
	});
};

bot.on('ready', async () => {
	console.log('Discord API ready. Caching messages...');
	bot.user.setPresence({ game: { name: 'Caching...' },
		status: 'online' });

	let messageList = [];
	const messagePromises = [];

	for (const channel of bot.channels) {
		const chan = channel[1];

		if (chan.type !== 'text')
			continue;

		if (!config.cacheChannels.includes(chan.name))
			continue;

		console.log(`Caching messages from channel ${chan.name}.`);

		messagePromises.push(new Promise((resolve, reject) => {
			fetchMessages(chan, [], (err, chan, msgList) => {
				if (err) {
					console.error(err);
					resolve(true);
					return;
				}

				messageList = messageList
					.concat(msgList
						.filter((msg) => msg.content.indexOf('http') === -1)
						.map((msg) => ({
							authorName: msg.author.username,
							authorId: msg.author.id,
							text: msg.content,
							createdAt: (new Date(msg.createdAt)).getTime(),
						}))
					);

				resolve(true);
			});
		}));
	}

	await Promise.all(messagePromises);

	fs.writeFile('./messages.json', JSON.stringify(messageList), (err) => {
		if (err)
			console.error(err);
		else
			console.log('Messages written');
	});
});

bot.login(process.env.DISCORD_TOKEN);
