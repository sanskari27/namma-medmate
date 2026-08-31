import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import { createApp } from './app.ts';
import { loadAuthEnv } from './config/env.ts';

const env = loadAuthEnv();
listenLocal(createApp(env), env.AUTH_API_PORT, 'auth-api');
