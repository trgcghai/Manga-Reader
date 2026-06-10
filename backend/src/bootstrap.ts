export function getRequiredPort(env: NodeJS.ProcessEnv): number {
  const rawPort = env.PORT;

  if (!rawPort) {
    throw new Error('PORT environment variable is required');
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number');
  }

  return port;
}
