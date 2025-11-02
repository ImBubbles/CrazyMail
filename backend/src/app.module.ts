import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TranscriptController } from './transcript.controller';

@Module({
  imports: [],
  controllers: [AppController, TranscriptController],
  providers: [AppService],
})
export class AppModule {}
