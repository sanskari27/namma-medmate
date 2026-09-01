import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import { createApp } from './app.ts';
import { loadPlanGatingEnv } from './config/env.ts';

const env = loadPlanGatingEnv();
listenLocal(createApp(env), env.PLAN_GATING_API_PORT, 'plan-gating-api');
