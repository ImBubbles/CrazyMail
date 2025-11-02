package scripts;

import java.util.Scanner;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

//This is used to narrow down the amount of information the LLM needs to check for.
public class basicScan
{
    // Entry point when called from command line with JSON input
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
            
            // Extract email fields
            String sender = emailData.get("sender").getAsString();
            String message = emailData.get("message").getAsString();
            
            // School Email Checker, determines if the email is a school email.
            category result = scanEmail(sender, message);
            
            // Output the result so TypeScript can parse it
            System.out.println("CATEGORY: " + result.name());
            
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
            System.exit(1);
        }
    }
    
    // Scan email based on sender and message
    public static category scanEmail(String sender, String message)
    {
        // TODO: Implement school email checking logic
        // Example: if (sender.endsWith("@school.edu")) return category.SCHOOL;
        
        return category.UNFILTERED;
    }
}