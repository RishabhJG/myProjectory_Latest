import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

// cPanel Passenger passes a Unix domain socket path or a dynamic port as a string.
// We must not cast it to a Number, otherwise it resolves to NaN and forces 3000, breaking routing.
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  logger.info({ port }, `Server listening`);
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
