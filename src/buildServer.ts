import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import Redis from 'ioredis';
import config from '../config';
import constants from '../config/constants';

if (!config.UPSTASH_REDIS_REST_URL) {
	console.error('missing UPSTASH_REDIS_REST_URL');
	process.exit(1);
}

const publisher = new Redis(config.UPSTASH_REDIS_REST_URL);
const subscriber = new Redis(config.UPSTASH_REDIS_REST_URL);

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

		const incResult = await publisher.incr(constants.CONNECTION_COUNT_KEY);

		await publisher.publish(constants.CONNECTION_COUNT_UPDATED_CHANNEL, String(incResult));

		io.on('disconnect', async () => {
			console.log('Client disconnected');
			const decrResult = await publisher.decr(constants.CONNECTION_COUNT_KEY);
			await publisher.publish(constants.CONNECTION_COUNT_UPDATED_CHANNEL, String(decrResult));
		});
	});

	app.get('/healthcheck', () => {
		return { status: 'ok', port: config.PORT };
	});
	return app;
}
