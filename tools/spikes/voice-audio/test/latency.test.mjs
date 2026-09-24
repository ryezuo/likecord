import test from 'node:test';
import { latencyCases } from './latency-scenarios.mjs';
for (const [name, run] of latencyCases) test(name, run);
