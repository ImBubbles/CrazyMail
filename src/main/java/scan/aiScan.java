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
        """;

public static void main(String[] args)
{
    category result = main("spam@spam.com", "abcdefghijklmnopqrstuvwxyz", category.UNFILTERED);
    System.out.println("Returned Category: " + result);
}

    public static category main(String sender, String message, category narrowed)
    {

        //String temporarySender = "ryan.d.miller@okstate.edu";
        //String temporaryMessage = """""";

        String classificationText = "";

        try {

        Client client = new Client();

        String categoriesString = category.convertEnumToString(category.UNFILTERED, category.SPAM, category.PHISHING);

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

            classificationText = response.text();
            return category.valueOf(classificationText.toUpperCase());

        } catch (IllegalArgumentException e) {
            // This catches the specific error if AI returns a string that is NOT a valid enum constant.
            System.err.println("Classification Error: AI returned unparseable category: " + classificationText);
            // Return a specific error code, or the UNFILTERED default.
            return category.UNFILTERED;
        } catch (Exception e) {
            // Catch all other errors (API, network, etc.)
            System.err.println("FATAL ERROR: Gemini API call failed or client initialization error.");
            e.printStackTrace(); 
            return category.UNFILTERED;
        }
    }
}