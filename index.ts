import { Hono } from 'hono';
import { cors } from 'hono/cors';
import questionsData from './data/questions.json';

const app = new Hono();


app.use('/*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
}));

app.get('/', (c) => c.text('IoT Quiz API is running on Cloudflare Workers!'));

app.get('/api/questions', (c) => {

    return c.json(questionsData);
});

export default app;