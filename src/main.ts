import config from '../config';
import { buildServer } from './buildServer';

async function main() {
  const app = await buildServer();

  try {
    await app.listen({
      port: config.PORT,
      host: config.HOST,
    });

    console.log(`Server started at http://${config.HOST}:${config.PORT}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
