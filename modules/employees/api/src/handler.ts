import type { Handler } from 'aws-lambda';
import { createLambdaHandler } from '@namma-medmate/lambda-bootstrap';
import { createApp } from './app.ts';

export const handler: Handler = createLambdaHandler(createApp());
