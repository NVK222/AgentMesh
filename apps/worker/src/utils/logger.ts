const colors = {
    reset: "\x1b[0m",
    cyan: "\x1b[36m", // Orchestrator
    magenta: "\x1b[35m", // Worker
    green: "\x1b[32m", // Success
    yellow: "\x1b[33m", // System/Poll
    red: "\x1b[31m", // Errors
    gray: "\x1b[90m", // Context/Debug
};

export const logger = {
    poll: (msg: string) =>
        console.log(`${colors.yellow}[POLL]${colors.reset} ${msg}`),
    orchestrator: (msg: string) =>
        console.log(`${colors.cyan}[ORCHESTRATOR]${colors.reset} ${msg}`),
    worker: (msg: string) =>
        console.log(`${colors.magenta}[WORKER]${colors.reset} ${msg}`),
    success: (msg: string) =>
        console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
    error: (msg: string, err?: unknown) => {
        console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`);
        if (err) console.error(err);
    },
    debug: (msg: string) => console.log(`${colors.gray}${msg}${colors.reset}`),
};
