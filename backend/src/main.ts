import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing for audio blob
    bodyParser: false, // Disable default body parser so we can configure it
  });
  
  // Configure raw body parser for specific content types
  app.use('/api/transcript', express.raw({ 
    type: ['audio/webm', 'application/octet-stream'],
    limit: '10mb' 
  }));
  
  // Enable JSON parser for other routes
  app.use(express.json());
  
  // Enable CORS for frontend requests
  app.enableCors({
    origin: true, // Allow all origins in development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Use port 3001 for backend (3000 is used by Nuxt frontend)
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
  
  // Log available routes on startup
  console.log('Backend server starting on port', port);
  console.log('Available routes:');
  console.log('  GET  /');
  console.log('  POST /api/transcript');
  console.log('  POST /api/rewrite');

  // Note: Not setting global prefix since controllers already use 'api' prefix

  await app.listen(port);
}
bootstrap();
