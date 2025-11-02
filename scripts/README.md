# Java Email Scanning Scripts

These Java scripts are used to process and scan emails stored in the PostgreSQL database.

## Setup

### Prerequisites
- Java 21 or later (matching your Dockerfile)
- Gradle (for dependency management)

### Installing Dependencies

Run from the `scripts` directory:

```bash
gradle build
```

Or if you prefer using plain `javac` with Gson:

1. Download Gson JAR:
   ```bash
   wget https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar
   ```

2. Compile manually:
   ```bash
   javac -cp gson-2.10.1.jar *.java
   ```

## Usage

### Example 1: Calling from Node.js/TypeScript

From your NestJS backend, you can call the Java scripts and pass database data as JSON:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function scanEmail(uid: string) {
  // Fetch email from database
  const email = await mailRepository.findOne({ where: { uid } });
  
  // Convert to JSON and pass to Java
  const jsonData = JSON.stringify(email);
  
  const { stdout, stderr } = await execAsync(
    `java -cp ".:gson-2.10.1.jar" scripts.aiScan`,
    { input: jsonData }
  );
  
  console.log(stdout);
}
```

### Example 2: Calling from Go

From your postsmtp server in Go:

```go
import (
    "os/exec"
    "encoding/json"
)

func scanEmail(emailData map[string]interface{}) error {
    // Marshal email to JSON
    jsonData, err := json.Marshal(emailData)
    if err != nil {
        return err
    }
    
    // Create command
    cmd := exec.Command("java", "-cp", ".:gson-2.10.1.jar", "scripts.aiScan")
    cmd.Stdin = bytes.NewReader(jsonData)
    
    output, err := cmd.Output()
    if err != nil {
        return err
    }
    
    fmt.Println(string(output))
    return nil
}
```

### Example 3: Testing with Manual Input

You can test the scripts manually by piping JSON:

```bash
echo '{"sender":"test@example.com","message":"Hello","recipient":"user@example.com","uid":"123-456"}' | java -cp ".:gson-2.10.1.jar" scripts.aiScan
```

## JSON Input Format

The scripts expect JSON with the following structure (based on your `Mail` entity):

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

## Architecture

- `basicScan.java` - Performs basic checks (e.g., school email detection)
- `aiScan.java` - Uses AI/LLM to analyze emails with category context
- `allScan.java` - Orchestrates basic and AI scans
- `category.java` - Enum defining email categories (SPAM, SCHOOL, UNFILTERED)

## Integration with Backend

The Java scripts are designed to be called from:
- **NestJS backend** (TypeScript) - Can execute Java and pass JSON via stdin
- **Go SMTP server** - Can execute Java as subprocess
- **Direct terminal** - For testing and debugging

You do NOT need to rewrite these in JavaScript/TypeScript. The Java approach works well for:
1. AI processing scripts
2. Performance-sensitive operations
3. Reusing Java-based ML libraries
4. Keeping scanning logic separate from backend

