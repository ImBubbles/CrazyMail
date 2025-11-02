//Code adapted from https://github.com/seanoliver/cloudflare-whisper-nestjs
//MIT License

//Copyright 2023 Sean Oliver

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import {
  Controller,
  Post,
  BadRequestException,
  InternalServerErrorException,
  Req,
  Body,
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

  @Post('rewrite')
  async rewriteText(
    @Body() body: { text: string; style: 'formal' | 'polite' },
  ): Promise<{ text: string }> {
    const { text, style } = body;

    if (!text || !text.trim()) {
      throw new BadRequestException('Text is required');
    }

    if (!style || (style !== 'formal' && style !== 'polite')) {
      throw new BadRequestException('Style must be either "formal" or "polite"');
    }

    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!cloudflareApiToken) {
      throw new InternalServerErrorException(
        'Cloudflare API token not configured. Please set CLOUDFLARE_API_TOKEN environment variable.',
      );
    }

    const cloudflareAccountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      '023e105f4ecef8ad9ca31a8372d0c353';

    // Use Cloudflare's LLM model for text rewriting
    const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

    const prompt =
      style === 'formal'
        ? `Rewrite the following email body text to be more formal and professional. Maintain the original meaning and key information. Return ONLY the rewritten email body text - do not include a subject line or any other metadata:\n\n${text}`
        : `Rewrite the following email body text to be more polite and courteous. Maintain the original meaning and key information. Return ONLY the rewritten email body text - do not include a subject line or any other metadata:\n\n${text}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudflare API error:', response.status, response.statusText);
        console.error('Cloudflare error response:', errorText);
        throw new InternalServerErrorException(
          `Cloudflare API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
        );
      }

      const result: any = await response.json();

      // Cloudflare LLM response format - typically returns { response: string } or { result: { response: string } }
      // For Workers AI REST API, response is usually in result.response
      let rewrittenText: string;
      if (result.result?.response) {
        rewrittenText = result.result.response;
      } else if (result.response) {
        rewrittenText = result.response;
      } else if (result.result && typeof result.result === 'string') {
        rewrittenText = result.result;
      } else if (typeof result === 'string') {
        rewrittenText = result;
      } else if (result.text) {
        rewrittenText = result.text;
      } else {
        console.error('Unexpected response format:', JSON.stringify(result, null, 2));
        throw new InternalServerErrorException(
          `Unexpected response format from Cloudflare API. Response: ${JSON.stringify(result)}`,
        );
      }

      return { text: rewrittenText.trim() };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error calling Cloudflare API:', error);
      throw new InternalServerErrorException(
        'Failed to rewrite text: ' + (error as Error).message,
      );
    }
  }

  @Post('summarize')
  async summarizeEmail(
    @Body() body: { text: string },
  ): Promise<{ summary: string }> {
    const { text } = body;

    if (!text || !text.trim()) {
      throw new BadRequestException('Email text is required');
    }

    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!cloudflareApiToken) {
      throw new InternalServerErrorException(
        'Cloudflare API token not configured. Please set CLOUDFLARE_API_TOKEN environment variable.',
      );
    }

    const cloudflareAccountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      '023e105f4ecef8ad9ca31a8372d0c353';

    // Use Cloudflare's LLM model for email summarization
    const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

    const prompt = `Please provide a concise summary of the following email. Focus on the main points, key information, and any action items. Keep the summary brief and to the point (2-4 sentences maximum).\n\nEmail:\n${text}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudflare API error:', response.status, response.statusText);
        console.error('Cloudflare error response:', errorText);
        throw new InternalServerErrorException(
          `Cloudflare API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
        );
      }

      const result: any = await response.json();

      // Cloudflare LLM response format - typically returns { response: string } or { result: { response: string } }
      let summary: string;
      if (result.result?.response) {
        summary = result.result.response;
      } else if (result.response) {
        summary = result.response;
      } else if (result.result && typeof result.result === 'string') {
        summary = result.result;
      } else if (typeof result === 'string') {
        summary = result;
      } else if (result.text) {
        summary = result.text;
      } else {
        console.error('Unexpected response format:', JSON.stringify(result, null, 2));
        throw new InternalServerErrorException(
          `Unexpected response format from Cloudflare API. Response: ${JSON.stringify(result)}`,
        );
      }

      return { summary: summary.trim() };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error calling Cloudflare API:', error);
      throw new InternalServerErrorException(
        'Failed to summarize email: ' + (error as Error).message,
      );
    }
  }

  @Post('translate')
  async translateEmail(
    @Body() body: { text: string; targetLanguage: string },
  ): Promise<{ translatedText: string }> {
    const { text, targetLanguage } = body;

    if (!text || !text.trim()) {
      throw new BadRequestException('Email text is required');
    }

    if (!targetLanguage || !targetLanguage.trim()) {
      throw new BadRequestException('Target language is required');
    }

    const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!cloudflareApiToken) {
      throw new InternalServerErrorException(
        'Cloudflare API token not configured. Please set CLOUDFLARE_API_TOKEN environment variable.',
      );
    }

    const cloudflareAccountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      '023e105f4ecef8ad9ca31a8372d0c353';

    // Use Cloudflare's LLM model for translation
    const url = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;

    const prompt = `Translate the following email text to ${targetLanguage}. Preserve the original formatting, tone, and meaning. Return ONLY the translated text without any additional explanations or labels:\n\n${text}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudflare API error:', response.status, response.statusText);
        console.error('Cloudflare error response:', errorText);
        throw new InternalServerErrorException(
          `Cloudflare API error: ${response.status} ${response.statusText}. Details: ${errorText}`,
        );
      }

      const result: any = await response.json();

      // Cloudflare LLM response format - typically returns { response: string } or { result: { response: string } }
      let translatedText: string;
      if (result.result?.response) {
        translatedText = result.result.response;
      } else if (result.response) {
        translatedText = result.response;
      } else if (result.result && typeof result.result === 'string') {
        translatedText = result.result;
      } else if (typeof result === 'string') {
        translatedText = result;
      } else if (result.text) {
        translatedText = result.text;
      } else {
        console.error('Unexpected response format:', JSON.stringify(result, null, 2));
        throw new InternalServerErrorException(
          `Unexpected response format from Cloudflare API. Response: ${JSON.stringify(result)}`,
        );
      }

      return { translatedText: translatedText.trim() };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      console.error('Error calling Cloudflare API:', error);
      throw new InternalServerErrorException(
        'Failed to translate email: ' + (error as Error).message,
      );
    }
  }
}

