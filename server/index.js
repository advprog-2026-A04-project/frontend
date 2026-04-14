import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distDirectory = path.join(projectRoot, 'dist');

const app = createApp();
const port = Number(process.env.PORT || 3001);

app.use(express.static(distDirectory));

app.use((request, response, next) => {
  if (request.path.startsWith('/api/')) {
    next();
    return;
  }

  response.sendFile(path.join(distDirectory, 'index.html'), (error) => {
    if (error) {
      next();
    }
  });
});

app.listen(port, () => {
  console.log(`frontend-bff listening on ${port}`);
});
