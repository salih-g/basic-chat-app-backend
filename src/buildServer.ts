import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import Redis from 'ioredis';
import closeWithGrace from 'close-with-grace';

import config from '../config';
import constants from '../config/constants';

if (!config.UPSTASH_REDIS_REST_URL) {
	console.error('missing UPSTASH_REDIS_REST_URL');
	process.exit(1);
}

const publisher = new Redis(config.UPSTASH_REDIS_REST_URL);
const subscriber = new Redis(config.UPSTASH_REDIS_REST_URL);

let connectedClients = 0;

export async function buildServer() {
	const app = fastify();

	await app.register(fastifyCors, {
		origin: config.CORS_ORIGIN,
	});

	await app.register(fastifyIO);

	const currentCount = await publisher.get(constants.CONNECTION_COUNT_KEY);

	if (!currentCount) {
		await publisher.set(constants.CONNECTION_COUNT_KEY, 0);
	}

	app.io.on('connection', async (io) => {
		console.log('Client connected');
		connectedClients++;

		const incResult = await publisher.incr(constants.CONNECTION_COUNT_KEY);

		await publisher.publish(constants.CONNECTION_COUNT_UPDATED_CHANNEL, String(incResult));

		io.on('disconnect', async () => {
			console.log('Client disconnected');
			connectedClients--;
			const decrResult = await publisher.decr(constants.CONNECTION_COUNT_KEY);
			await publisher.publish(constants.CONNECTION_COUNT_UPDATED_CHANNEL, String(decrResult));
		});
	});

	subscriber.subscribe(constants.CONNECTION_COUNT_UPDATED_CHANNEL, (err, count) => {
		if (err) {
			console.error(`Error subscribing to ${constants.CONNECTION_COUNT_UPDATED_CHANNEL}`);
			return;
		}

		console.log(`${count} clients connected to ${constants.CONNECTION_COUNT_UPDATED_CHANNEL} channel`);
	});

	subscriber.on('message', (channel, text) => {
		if (channel === constants.CONNECTION_COUNT_UPDATED_CHANNEL) {
			app.io.emit(constants.CONNECTION_COUNT_UPDATED_CHANNEL, {
				count: text,
			});
			return;
		}
	});

	app.get('/healthcheck', () => {
		return { status: 'ok', port: config.PORT };
	});

	return app;
}

export async function shutDown(app: any) {
	closeWithGrace({ delay: 2000 }, async () => {
		console.log('shutting down!');

		if (connectedClients > 0) {
			console.log(`Removing ${connectedClients} from count`);
			const currentCount = parseInt((await publisher.get(constants.CONNECTION_COUNT_KEY)) || '0', 10);
			const newCount = Math.max(currentCount - connectedClients, 0);

			await publisher.set(constants.CONNECTION_COUNT_KEY, newCount);
		}

		await app.close();
		console.log("Shutdown complate, Bye '_' ");
	});
}
