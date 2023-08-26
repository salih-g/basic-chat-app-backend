import config from '../config';
import { buildServer, shutDown } from './buildServer';

async function main() {
	const app = await buildServer();

	try {
		await app.listen({
			port: config.PORT,
			host: config.HOST,
		});

		shutDown(app);

		console.log(`Server started at http://${config.HOST}:${config.PORT}`);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

main();
