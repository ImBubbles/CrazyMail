import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { join } from 'path';
import { Mail } from '../entities/mail.entity';
import { category } from '../scripts/category';

@Injectable()
export class JavaScanService {
  private readonly logger = new Logger(JavaScanService.name);
  private readonly javaClassPath: string;

  constructor() {
    // Resolve path to Java classes and gson JAR
    // From backend/src/mail/java-scan.service.ts (compiled to backend/dist/mail/java-scan.service.js)
    // __dirname in compiled code: backend/dist/mail
    // Go up 3 levels: backend/dist/mail -> backend/dist -> backend -> CrazyMail
    // Then: scripts/
    const scriptsDir = join(__dirname, '..', '..', '..', 'scripts');
    const gsonJar = join(scriptsDir, 'gson-2.10.1.jar');
    
    // Build classpath: scripts directory + gson JAR
    this.javaClassPath = `${scriptsDir}:${gsonJar}`;
    this.logger.log(`Java classpath: ${this.javaClassPath}`);
  }

  /**
   * Run basic scan on an email
   * @param email - The email to scan
   * @returns The detected category
   */
  async runBasicScan(email: Mail): Promise<category> {
    const jsonData = this.emailToJson(email);
    return this.executeJava('scripts.basicScan', jsonData, 'basicScan');
  }

  /**
   * Run AI scan on an email
   * @param email - The email to scan
   * @param narrowedCategory - The category from basic scan
   * @returns The final category
   */
  async runAiScan(email: Mail, narrowedCategory: category): Promise<category> {
    this.logger.log('Running aiScan on email with category: ' + narrowedCategory);
    const jsonData = this.emailToJson(email);
    return this.executeJava('scripts.aiScan', jsonData, 'aiScan');
  }

  /**
   * Run full scan (basic + AI)
   * @param email - The email to scan
   * @returns The final category
   */
  async runAllScan(email: Mail): Promise<category> {
    const jsonData = this.emailToJson(email);
    return this.executeJava('scripts.allScan', jsonData, 'allScan');
  }

  /**
   * Execute a Java class with JSON input via stdin
   */
  private async executeJava(className: string, jsonData: string, scanName: string): Promise<category> {
    return new Promise((resolve, reject) => {
      const javaArgs = ['-cp', this.javaClassPath, className];
      const javaProcess = spawn('java', javaArgs);

      let stdout = '';
      let stderr = '';

      javaProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      javaProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      javaProcess.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`${scanName} exited with code ${code}: ${stderr}`);
          reject(new Error(`${scanName} failed with exit code ${code}`));
          return;
        }

        if (stderr) {
          this.logger.warn(`${scanName} stderr: ${stderr}`);
        }

        this.logger.log(`${scanName} stdout: ${stdout}`);
        resolve(this.parseCategoryOutput(stdout));
      });

      javaProcess.on('error', (error) => {
        this.logger.error(`Failed to start ${scanName}: ${error.message}`);
        reject(error);
      });

      // Write JSON data to stdin
      javaProcess.stdin.write(jsonData);
      javaProcess.stdin.end();
    });
  }

  /**
   * Convert Mail entity to JSON string
   */
  private emailToJson(email: Mail): string {
    return JSON.stringify({
      uid: email.uid,
      sender: email.sender,
      recipient: email.recipient,
      headers: email.headers,
      message: email.message,
      createdAt: email.createdAt?.toISOString(),
    });
  }

  /**
   * Parse category from Java output
   * Adjust this based on how your Java code outputs the result
   */
  private parseCategoryOutput(output: string): category {
    // Example: Java outputs "CATEGORY: SPAM"
    const match = output.match(/CATEGORY:\s*(\w+)/i);
    if (match) {
      const catStr = match[1].toUpperCase();
      switch (catStr) {
        case 'SPAM':
          return category.SPAM;
        case 'SCHOOL':
          return category.SCHOOL;
        case 'UNFILTERED':
          return category.UNFILTERED;
      }
    }
    
    // Default fallback
    return category.UNFILTERED;
  }
}

