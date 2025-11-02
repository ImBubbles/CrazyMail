import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS to allow frontend requests
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Common frontend ports
    credentials: true,
  });
  
  await app.listen(process.env.PORT ?? 4000);
  console.log(`Backend is running on: http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
