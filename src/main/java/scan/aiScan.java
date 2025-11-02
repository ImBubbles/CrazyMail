package scan;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
//Receives the basic scan results and uses them to tell AI what to check the email for.
public class aiScan
{

    private static final String CLASSIFICATION_PROMPT_TEMPLATE = """
        You are an expert email classifier. Classify the following email into one single category from this list: [%s].
        Email Sender: %s.
        Email Content: %s.
        Respond with only the category name, exactly as it appears in the list.
        """; // Use three double quotes at the start and end

public static void main(String[] args) {
    // Call your main classification logic with test values
    category result = main("test@sender.com", "This is a test email message.", category.UNFILTERED);
    System.out.println("Returned Category: " + result);
}

    public static category main(String sender, String message, category narrowed)
    {

        //String temporarySender = "ryan.d.miller@okstate.edu";
        //String temporaryMessage = """""";

        try {

        Client client = new Client();

        String categoriesString = category.convertEnumToString();

        String prompt = String.format(
        CLASSIFICATION_PROMPT_TEMPLATE,
        categoriesString, // %s for the list of categories
        sender,           // %s for the sender
        message           // %s for the message content
    );
    
        GenerateContentResponse response =
        client.models.generateContent(
            "gemini-2.5-flash",
            prompt,
            null);

            // 2. This line ONLY runs if the call succeeds
            String output = response.text();
            System.out.println(output);

        } catch (Exception e) {
            // 3. THIS IS CRUCIAL: It prints the hidden error
            System.err.println("FATAL ERROR: Gemini API call failed or client initialization error.");
            e.printStackTrace(); // Print the detailed stack trace to find the root cause
            return category.GEMINIFAIL;
        }

        return category.UNFILTERED;
    }
}