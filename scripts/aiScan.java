package scripts;

import java.util.Scanner;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

//Receives the basic scan results and uses them to tell AI what to check the email for.
public class aiScan
{
    // Example: Receive JSON from stdin (when called from Node.js/Go/etc.)
    // The JSON should contain email data from the database
    public static void main(String[] args)
    {
        // Read JSON from stdin
        Scanner scanner = new Scanner(System.in);
        StringBuilder jsonInput = new StringBuilder();
        
        while (scanner.hasNextLine()) {
            jsonInput.append(scanner.nextLine());
        }
        scanner.close();
        
        try {
            // Parse JSON input
            JsonObject emailData = JsonParser.parseString(jsonInput.toString()).getAsJsonObject();
            
            // Extract email fields (adjust based on your database structure)
            String sender = emailData.get("sender").getAsString();
            String message = emailData.get("message").getAsString();
            String recipient = emailData.get("recipient").getAsString();
            String uid = emailData.get("uid").getAsString();
            
            // You can also access nested objects like headers
            JsonObject headers = emailData.getAsJsonObject("headers");
            String subject = headers != null && headers.has("Subject") 
                ? headers.get("Subject").getAsString() 
                : "";
            
            // Process the email data here
            System.out.println("Processing email from: " + sender);
            System.out.println("Subject: " + subject);
            
            // For now, return a default category
            // In the future, you'll call AI API here
            category result = processEmail(sender, message, category.UNFILTERED);
            
            // Output the result so TypeScript can parse it
            System.out.println("CATEGORY: " + result.name());
            
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
            System.exit(1);
        }
    }
    
    // Alternative: Method that accepts individual parameters
    public static category processEmail(String sender, String message, scripts.basicScan.category narrowed)
    {
        // Your AI processing logic here
        
        return category.UNFILTERED;
    }
}