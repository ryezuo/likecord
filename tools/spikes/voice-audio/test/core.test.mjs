import test from 'node:test';
import { cases } from './scenarios.mjs';
for (const [name, run] of cases) test(name, run);
