import { bundleAgentRuntime } from '../src/agent-bundler.js';

bundleAgentRuntime()
  .then((result) => {
    console.log(
      `[SnapPrint Agent] Standalone runtime bundle ready: ${result.outputPath} (${result.sizeBytes} bytes)`
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error(`[SnapPrint Agent] Bundle failed:`, err);
    process.exit(1);
  });
