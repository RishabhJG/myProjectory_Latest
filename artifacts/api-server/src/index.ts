import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"]) || 3000;

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
