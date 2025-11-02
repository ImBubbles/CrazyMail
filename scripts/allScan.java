package scripts;

import java.util.Scanner;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import scripts.basicScan;
import scripts.aiScan;

//Combines basic and AI scans
public class allScan {

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
            
            // Run full scan
            category result = scanAll(sender, message);
            
            // Output the result so TypeScript can parse it
            System.out.println("CATEGORY: " + result.name());
            
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
            System.exit(1);
        }
    }
    
    // Combines basic and AI scans
    public static category scanAll(String sender, String message)
    {
        // Run basic scan first
        category basicResult = basicScan.scanEmail(sender, message);
        
        // Then run AI scan with the narrowed category
        category finalResult = aiScan.processEmail(sender, message, basicResult);
        
        return finalResult;
    }
}
