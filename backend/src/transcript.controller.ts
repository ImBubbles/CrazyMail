import {
  Controller,
  Post,
  BadRequestException,
  InternalServerErrorException,
  Req,
} from '@nestjs/common';
import * as express from 'express';

interface CloudflareWhisperResponse {
  result?: {
    text?: string;
  };
  success?: boolean;
  errors?: Array<{ message: string }>;
}

@Controller('api')
export class TranscriptController {
  @Post('transcript')
  async transcribeAudio(@Req() req: express.Request): Promise<{ text: string }> {
    console.log('Transcript endpoint called');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    
    // Get raw body buffer from request (Express raw middleware puts it in req.body as Buffer)
    const audioBuffer = req.body as Buffer;
    console.log('Audio buffer received, size:', audioBuffer ? audioBuffer.length : 0);
    console.log('Body type:', typeof req.body);
    console.log('Body is Buffer:', Buffer.isBuffer(req.body));

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestException('No audio data provided');
    }

    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!cloudflareApiToken) {
      throw new InternalServerErrorException(
        'Cloudflare API token not configured. Please set CLOUDFLARE_API_TOKEN environment variable.',
      );
    }

    // Cloudflare account ID - should be in environment variables
    const cloudflareAccountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      '023e105f4ecef8ad9ca31a8372d0c353';

    // Cloudflare Workers AI endpoint format
    // The endpoint format is: /ai/run/{model} (without @cf/ prefix in the URL)
    const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/openai/whisper`;
    
    // Alternative format if the above doesn't work:
    // const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/inference/models/openai/whisper`;

    try {
      // Try FormData approach first (most common for file uploads)
      const formData = new FormData();
      
      // Create a Blob from the buffer (Node.js 18+ supports Blob)
      const audioBlob = new Blob([audioBuffer as any], { type: 'audio/webm' });
      
      // Append as File (Node.js 18+ supports File)
      // If File is not available, we'll use Blob directly
      if (typeof File !== 'undefined') {
        const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
        formData.append('file', audioFile);
      } else {
        // Fallback: append Blob directly
        formData.append('file', audioBlob, 'audio.webm');
      }
      
      console.log('Sending to Cloudflare:', {
        url,
        method: 'POST',
        audioSize: audioBuffer.length,
        contentType: 'multipart/form-data',
      });
      
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          // Don't set Content-Type - FormData will set it with boundary automatically
        },
        body: formData as any, // Cast for TypeScript compatibility
      });
      
      // If FormData doesn't work (400 error), try raw binary
      if (!response.ok && response.status === 400) {
        console.log('FormData failed, trying raw binary upload...');
        const audioArray = audioBuffer instanceof Buffer 
          ? new Uint8Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength)
          : new Uint8Array(audioBuffer);
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            'Content-Type': 'application/octet-stream',
          },
          body: audioArray as BodyInit,
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudflare API error:', response.status, response.statusText);
        console.error('Cloudflare error response:', errorText);
        console.error('Request URL:', url);
        console.error('Request headers:', {
          'Authorization': 'Bearer ***',
          'Content-Type': 'multipart/form-data (with boundary)',
          'Content-Length': audioBlob.size,
        });
        throw new InternalServerErrorException(
          `Cloudflare API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
        );
      }

      const result: CloudflareWhisperResponse = await response.json();

      if (!result.success || !result.result?.text) {
        const errorMessage =
          result.errors?.[0]?.message || 'Transcription failed';
        throw new InternalServerErrorException(errorMessage);
      }

      return { text: result.result.text };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error calling Cloudflare API:', error);
      throw new InternalServerErrorException(
        'Failed to transcribe audio: ' + (error as Error).message,
      );
    }
  }
}

