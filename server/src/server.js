// const env = require('./config/env');
// const { sequelize } = require('./models');
// const { createApp } = require('./app');

// async function main() {
//   await sequelize.authenticate();
//   const app = createApp();
//   app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port} (${env.nodeEnv})`));
// }

// main().catch((err) => {
//   // console.error(`Failed to start: ${err.message}`);
  
//   console.error("FAILED TO START - FULL ERROR:");
//   console.error(error);
//   console.error(error?.stack);
//   process.exit(1);

//   process.exit(1);
// });


const env = require('./config/env');
const { sequelize } = require('./models');
const { createApp } = require('./app');

async function main() {
  await sequelize.authenticate();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(
      `API listening on http://localhost:${env.port} (${env.nodeEnv})`
    );
  });
}

main().catch((err) => {
  console.error('FAILED TO START - FULL ERROR:');
  console.error(err);
  console.error(err?.stack);
  process.exit(1);
});
