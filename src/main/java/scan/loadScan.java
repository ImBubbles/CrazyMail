package scan;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.time.Duration;
import org.json.JSONArray;
import org.json.JSONObject;
//Receives the basic scan results and uses them to tell AI what to check the email for.
public class loadScan
{
    private static final String API_BASE_URL = System.getenv("API_BASE_URL") != null 
        ? System.getenv("API_BASE_URL") 
        : "http://localhost:3001";

    public static category main(String sender, String message, category narrowed)
    {
        try (Client client = new Client()) {
            // Fetch subject and body from email API or extract from message
            String subject = "";
            String emailBody = message;
            
            // Try to fetch from email API first
            try {
                String[] emailData = fetchEmailFromAPI(sender, message);
                if (emailData != null && emailData.length >= 2) {
                    subject = emailData[0];
                    emailBody = emailData[1];
                } else {
                    // Fallback to extraction from message
                    subject = extractSubject(sender, message);
                    emailBody = extractBody(message);
                }
            } catch (Exception e) {
                // If API fetch fails, extract from message
                subject = extractSubject(sender, message);
                emailBody = extractBody(message);
            }
            
            String emailText = "Subject: " + (subject != null && !subject.isEmpty() ? subject : "(No Subject)") + "\n\n" + emailBody;
            
            GenerateContentResponse response =
            client.models.generateContent(
                "gemini-2.5-flash",
                "## INSTRUCTIONS\n\n" +
                "1.  Analyze the provided EMAIL_TEXT.\n" +
                "2.  Use the provided METRICS as objective data points in your analysis.\n" +
                "3.  Calculate the final Cognitive Load Score (CLS) on a scale of 1.0 (Lowest Effort) to 5.0 (Highest Effort).\n" +
                "4.  The CLS is calculated as: **Linguistic Load** (40% Weight) + **Action/Dependency Load** (60% Weight).\n" +
                "    * **Linguistic Load:** How difficult is the email to merely read and understand? Factor in the Flesch-Kincaid and Lexical Diversity scores.\n" +
                "    * **Action/Dependency Load:** How complex is the required response? Factor in the action items, decision complexity, and external link/attachment count.\n" +
                "5.  Provide your step-by-step reasoning in the JSON's `reasoning` field.\n" +
                "6.  The final output MUST be a single JSON object.\n\n" +
                "## OBJECTIVE METRICS\n\n" +
                "- **Flesch_Kincaid_Grade:** [Insert Pre-calculated FK Grade Level Here, e.g., 12.5]\n" +
                "- **Lexical_Diversity_Ratio:** [Insert Pre-calculated TTR/Lexical Diversity Ratio Here, e.g., 0.58]\n" +
                "- **External_Links_Count:** [Insert Count of Links/Attachments Here, e.g., 3]\n\n" +
                "## EMAIL TEXT\n\n" +
                emailText + "\n\n" +
                "## REQUIRED OUTPUT FORMAT (JSON)\n" +
                "{\n" +
                "  \"reasoning\": {\n" +
                "    \"linguistic_load_analysis\": \"Based on FK score [FK_SCORE], the text is rated as [RATING] (e.g., highly academic/simple and casual).\",\n" +
                "    \"action_load_analysis\": \"The email primarily requires [MAIN_ACTION] and involves [NUMBER] external dependencies, which increases the cognitive overhead.\",\n" +
                "    \"final_justification\": \"Combining the moderate linguistic load with the high-complexity, multi-step action requirement results in the final CLS.\"\n" +
                "  },\n" +
                "  \"Action_Intent\": \"[e.g., Scheduling a Meeting, Requires Budget Approval, Simple Information Share]\",\n" +
                "  \"CLS_Score\": [Final CLS number from 1.0 to 5.0, e.g., 4.2]\n" +
                "}",
                null);

            return category.UNFILTERED;
        }
    }
    
    // Helper method to fetch email subject and body from the email API
    private static String[] fetchEmailFromAPI(String sender, String message) throws Exception {
        try {
            HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
            
            // Fetch emails from API endpoint
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_BASE_URL + "/api/emails"))
                .GET()
                .timeout(Duration.ofSeconds(5))
                .build();
            
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                JSONArray emails = new JSONArray(response.body());
                
                // Find matching email by sender and message content
                for (int i = 0; i < emails.length(); i++) {
                    JSONObject email = emails.getJSONObject(i);
                    String emailSender = email.optString("from", email.optString("sender", ""));
                    String emailBody = email.optString("body", email.optString("message", ""));
                    
                    // Match by sender and check if message content matches
                    if (sender != null && emailSender.contains(sender)) {
                        // Check if the email body matches or contains the message
                        if (message != null && (emailBody.contains(message) || message.contains(emailBody))) {
                            String subject = email.optString("subject", "");
                            // Try to get subject from headers if not directly available
                            if (subject.isEmpty() && email.has("headers")) {
                                JSONObject headers = email.optJSONObject("headers");
                                if (headers != null) {
                                    subject = headers.optString("Subject", headers.optString("subject", ""));
                                }
                            }
                            return new String[]{subject.isEmpty() ? "(No Subject)" : subject, emailBody};
                        }
                    }
                }
            }
        } catch (Exception e) {
            // If JSON parsing fails or other errors, return null to fall back to extraction
            throw e;
        }
        return null;
    }
    
    // Helper method to extract subject from email message
    private static String extractSubject(String sender, String message) {
        // Try to extract subject from message if it contains email headers
        if (message != null && message.contains("Subject:")) {
            int subjectStart = message.indexOf("Subject:");
            int subjectEnd = message.indexOf("\n", subjectStart);
            if (subjectEnd > subjectStart) {
                String subjectLine = message.substring(subjectStart + 8, subjectEnd).trim();
                return subjectLine;
            }
        }
        // Also check for lowercase "subject:"
        if (message != null && message.contains("subject:")) {
            int subjectStart = message.indexOf("subject:");
            int subjectEnd = message.indexOf("\n", subjectStart);
            if (subjectEnd > subjectStart) {
                String subjectLine = message.substring(subjectStart + 8, subjectEnd).trim();
                return subjectLine;
            }
        }
        return "";
    }
    
    // Helper method to extract body from email message
    private static String extractBody(String message) {
        // If message contains headers, extract body after the first empty line
        if (message != null && message.contains("\n\n")) {
            int bodyStart = message.indexOf("\n\n");
            return message.substring(bodyStart + 2).trim();
        }
        // Otherwise, assume the entire message is the body
        return message != null ? message : "";
    }
    
}
