// This magic file will get executed before any tests are run.
import { transferableAbortController } from 'node:util';

const controller = transferableAbortController();
globalThis.AbortController = controller.constructor;
globalThis.AbortSignal = controller.signal.constructor;
