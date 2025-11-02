# Java JSON Integration Setup Summary

## What Was Done

I've set up a complete integration to allow your Java scripts to receive JSON data from your PostgreSQL database.

## Architecture

**No, you don't need to rewrite your Java code in JavaScript/TypeScript!** 

The solution works by:
1. NestJS backend fetches data from PostgreSQL as `Mail` entities
2. Converts the `Mail` entity to JSON
3. Spawns a Java process and pipes the JSON via stdin
4. Java script parses the JSON using Gson library
5. Java returns the result via stdout
6. TypeScript parses the output

## Files Created/Modified

### New Files Created:
1. `backend/src/mail/java-scan.service.ts` - Service to execute Java scripts from NestJS
2. `backend/src/scripts/category.ts` - TypeScript enum matching Java category enum
3. `scripts/build.gradle` - Build configuration for Java dependencies
4. `scripts/README.md` - Detailed documentation
5. `scripts/QUICK_START.md` - Quick setup guide
6. `SETUP_SUMMARY.md` - This file

### Modified Files:
1. `scripts/aiScan.java` - Now receives JSON from stdin and outputs category
2. `scripts/basicScan.java` - Now receives JSON from stdin and outputs category
3. `scripts/allScan.java` - Now receives JSON from stdin and outputs category

## Next Steps to Get It Working

### 1. Download Gson Library

```bash
cd scripts
wget https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar
```

### 2. Compile Java Files

```bash
cd scripts
javac -cp gson-2.10.1.jar *.java
```

### 3. Test Manually

```bash
echo '{"sender":"test@example.com","message":"Hello World","recipient":"user@example.com","uid":"123-456","headers":{"Subject":"Test Email"},"createdAt":"2024-01-01T00:00:00Z"}' | java -cp ".:gson-2.10.1.jar" scripts.aiScan
```

You should see output like:
```
Processing email from: test@example.com
Subject: Test Email
CATEGORY: UNFILTERED
```

### 4. Register JavaScanService in Your Mail Module

Edit `backend/src/mail/mail.module.ts`:

```typescript
import { JavaScanService } from './java-scan.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mail])],
  controllers: [MailController],
  providers: [MailService, JavaScanService], // Add JavaScanService here
  exports: [MailService],
})
export class MailModule {}
```

### 5. Use the Service

In your `MailService` or controller:

```typescript
import { JavaScanService } from './java-scan.service';

constructor(
  @InjectRepository(Mail)
  private mailRepository: Repository<Mail>,
  private javaScanService: JavaScanService, // Inject it
) {}

async scanEmail(uid: string) {
  const email = await this.mailRepository.findOne({ where: { uid } });
  
  // Run the scan
  const category = await this.javaScanService.runAllScan(email);
  
  console.log(`Email ${uid} categorized as: ${category}`);
  
  return category;
}
```

## How It Works

### JSON Format

Your Java scripts receive this JSON structure:

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

### Java Code Pattern

All Java scripts follow this pattern:

```java
public static void main(String[] args) {
    // Read JSON from stdin
    Scanner scanner = new Scanner(System.in);
    StringBuilder jsonInput = new StringBuilder();
    while (scanner.hasNextLine()) {
        jsonInput.append(scanner.nextLine());
    }
    scanner.close();
    
    // Parse JSON
    JsonObject email = JsonParser.parseString(jsonInput.toString()).getAsJsonObject();
    
    // Extract fields
    String sender = email.get("sender").getAsString();
    String message = email.get("message").getAsString();
    
    // Do processing
    category result = processEmail(sender, message);
    
    // Output result
    System.out.println("CATEGORY: " + result.name());
}
```

### TypeScript Service

The `JavaScanService`:
- Spawns a Java process
- Writes JSON to stdin
- Reads stdout/stderr
- Parses the "CATEGORY: XXX" output
- Returns the category enum

## Answer to Your Question

**"Does this have to be done in js/ts in backend?"**

**No!** You can absolutely keep it in Java. The architecture:

```
PostgreSQL → NestJS (fetches data) → Java (processes) → NestJS (returns result)
```

This is a common pattern for:
- ML/AI processing (Java has great ML libraries)
- Performance-critical operations
- Existing Java codebases
- Separation of concerns

The only "backend" work is:
- Fetching data from PostgreSQL (in TypeScript)
- Calling Java (via spawn)
- Returning results (in TypeScript)

The heavy processing logic stays in Java!

## Troubleshooting

### Java not found
```bash
java -version  # Should show Java 21+
```

### Class not found
Make sure you compiled:
```bash
cd scripts
javac -cp gson-2.10.1.jar *.java
```

### Path issues in TypeScript
Check `javaClassPath` in `JavaScanService`. It should resolve from the backend's compiled location.

### Windows compatibility
The code uses `:` as classpath separator (Unix). For Windows, you may need to update the separator to `;` in `java-scan.service.ts`.

## Where to Go From Here

1. **Implement your scanning logic** in `basicScan.java` and `aiScan.java`
2. **Add AI API calls** in `aiScan.java` (OpenAI, Anthropic, etc.)
3. **Add caching** if scanning is expensive
4. **Add error handling** for database queries
5. **Test end-to-end** with real emails from your database

## Documentation

See:
- `scripts/README.md` - Full documentation
- `scripts/QUICK_START.md` - Quick setup guide  
- `backend/src/mail/java-scan.service.ts` - TypeScript integration code
- `scripts/*.java` - Java implementation examples

