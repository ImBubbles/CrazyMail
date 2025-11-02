# Quick Start: Java JSON Integration

## Overview

Your Java scripts can receive JSON data from your PostgreSQL database via stdin. This is called from your NestJS/TypeScript backend.

## Architecture Flow

```
Database (PostgreSQL)
    ↓
NestJS Backend (TypeScript)
    ↓ (fetches email as Mail entity)
    ↓ (converts to JSON)
    ↓ (spawns Java process)
Java Scripts (aiScan, basicScan, allScan)
    ↓ (returns category)
NestJS Backend
    ↓
Frontend or Response
```

## Setup Steps

### 1. Install Gson Library

Download the Gson JAR for JSON parsing:

```bash
cd scripts
wget https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar
```

Or use Gradle:
```bash
cd scripts
gradle build
```

### 2. Compile Your Java Files

```bash
cd scripts
javac -cp gson-2.10.1.jar *.java
```

### 3. Test the Integration

Test your Java script manually:

```bash
echo '{"sender":"test@example.com","message":"Hello World","recipient":"user@example.com","uid":"123-456","headers":{"Subject":"Test Email"},"createdAt":"2024-01-01T00:00:00Z"}' | java -cp ".:gson-2.10.1.jar" scripts.aiScan
```

### 4. Integrate in NestJS Backend

The `JavaScanService` is already set up in `backend/src/mail/java-scan.service.ts`. To use it:

1. Inject it in your mail module:
```typescript
// backend/src/mail/mail.module.ts
import { JavaScanService } from './java-scan.service';

@Module({
  providers: [MailService, JavaScanService], // Add JavaScanService
  ...
})
```

2. Use it in your mail service:
```typescript
// In backend/src/mail/mail.service.ts
constructor(
  private javaScanService: JavaScanService,
  ...
) {}

async scanEmail(uid: string) {
  const email = await this.mailRepository.findOne({ where: { uid } });
  const category = await this.javaScanService.runAllScan(email);
  
  console.log(`Email category: ${category}`);
  
  // Store or use the category as needed
  return category;
}
```

## JSON Format Expected by Java

Your Java scripts will receive this JSON structure (from your `Mail` entity):

```json
{
  "uid": "uuid-string",
  "sender": "sender@example.com",
  "recipient": "recipient@example.com",
  "headers": {
    "Subject": "Email Subject",
    "From": "sender@example.com",
    "To": "recipient@example.com",
    "Date": "2024-01-01T00:00:00Z"
  },
  "message": "Email body content",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Example: Complete Java Scan Implementation

Here's how to modify `basicScan.java` to use JSON:

```java
package scripts;

import java.util.Scanner;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class basicScan {
    public static void main(String[] args) {
        // Read JSON from stdin
        Scanner scanner = new Scanner(System.in);
        StringBuilder jsonInput = new StringBuilder();
        
        while (scanner.hasNextLine()) {
            jsonInput.append(scanner.nextLine());
        }
        scanner.close();
        
        try {
            // Parse JSON
            JsonObject email = JsonParser.parseString(jsonInput.toString()).getAsJsonObject();
            
            String sender = email.get("sender").getAsString();
            String message = email.get("message").getAsString();
            
            // Your scanning logic here
            category result = determineCategory(sender, message);
            
            // Output the result (TypeScript will parse this)
            System.out.println("CATEGORY: " + result.name());
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
    
    private static category determineCategory(String sender, String message) {
        // Check if sender is a school email
        if (sender.endsWith("@school.edu")) {
            return category.SCHOOL;
        }
        
        // Check for spam keywords
        String lowerMessage = message.toLowerCase();
        if (lowerMessage.contains("viagra") || lowerMessage.contains("lottery")) {
            return category.SPAM;
        }
        
        return category.UNFILTERED;
    }
}
```

## Cross-Platform Note

- **Linux/Mac**: Use `:` as classpath separator: `java -cp ".:gson-2.10.1.jar"`
- **Windows**: Use `;` as classpath separator: `java -cp ".;gson-2.10.1.jar"`

The TypeScript service currently uses `:`. For Windows compatibility, you may need to adjust the `javaClassPath` in `java-scan.service.ts` to detect the OS and use the appropriate separator.

## Next Steps

1. Implement your actual scanning logic in each Java class
2. Add AI API calls in `aiScan.java`
3. Test the integration end-to-end
4. Add error handling for database connection issues

## FAQs

**Q: Do I need to rewrite the Java code in TypeScript?**  
A: No! You can keep it in Java. The spawn approach works well.

**Q: Can I pass command-line arguments instead of stdin?**  
A: Yes, but stdin is cleaner for passing complex JSON data.

**Q: How do I handle binary data in Java?**  
A: Use Base64 encoding in TypeScript before sending to Java.

**Q: What about Windows compatibility?**  
A: The current code uses Unix-style paths. Adjust paths/separators for Windows if needed.

