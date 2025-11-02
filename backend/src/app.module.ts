import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // In production (dist folder), __dirname is in dist, so we go up one level
      // In development, __dirname is in src, so we also go up one level
      // This works for both scenarios
      envFilePath: (() => {
        // Try multiple paths to find .env file
        const possiblePaths = [
          join(__dirname, '..', '.env'), // Standard location (backend/.env)
          join(process.cwd(), '.env'), // Current working directory
          join(__dirname, '.env'), // In case .env is in dist folder (unlikely)
        ];
        
        for (const path of possiblePaths) {
          if (existsSync(path)) {
            return path;
          }
        }
        
        // If no .env found, return the standard path (ConfigModule will handle gracefully)
        return join(__dirname, '..', '.env');
      })(),
      // Load environment variables from process.env as fallback
      // This is useful for production deployments (e.g., Docker, cloud platforms)
      load: [],
    }),
    DatabaseModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
