package scan;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
//Receives the basic scan results and uses them to tell AI what to check the email for.
public class aiScan
{

    private static final String CLASSIFICATION_PROMPT_TEMPLATE = 
        "You are an expert email classifier. Classify the following email into one single category from this list: [%s].\n" +
        "Email Sender: %s.\n" +
        "Email Content: %s.\n" +
        "Respond with only the category name, exactly as it appears in the list.";

public static void main(String[] args) {
    // Call your main classification logic with test values
    category result = main("test@sender.com", "This is a test email message.", category.UNFILTERED);
    System.out.println("Returned Category: " + result);
}

    public static category main(String sender, String message, category narrowed)
    {

        String temporarySender = "ryan.d.miller@okstate.edu";
        String temporaryMessage = "Ryan D Miller just made a new comment on the submission for Isaac Garven for CEAT Scholar Event 6";

        try {

        Client client = new Client();

        String categoriesString = category.convertEnumToString();

        String prompt = String.format(
        CLASSIFICATION_PROMPT_TEMPLATE,
        categoriesString, // %s for the list of categories
        temporarySender,           // %s for the sender
        temporaryMessage           // %s for the message content
    );
    
        GenerateContentResponse response =
        client.models.generateContent(
            "gemini-2.5-flash",
            "You are an expert email classifier. Classify the following email into one single category from this list: [" + categoriesString + "]." + temporarySender + "\n" + temporaryMessage,
            null);

            // 2. This line ONLY runs if the call succeeds
            String output = response.text();
            System.out.println(output);

        } catch (Exception e) {
            // 3. THIS IS CRUCIAL: It prints the hidden error
            System.err.println("FATAL ERROR: Gemini API call failed or client initialization error.");
            e.printStackTrace(); // Print the detailed stack trace to find the root cause
            return category.UNFILTERED;
        }

            

        return category.UNFILTERED;
    }
}