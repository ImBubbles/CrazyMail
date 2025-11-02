package scan;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
//Receives the basic scan results and uses them to tell AI what to check the email for.
public class aiScan
{

    public static category main(String sender, String message, category narrowed)
    {
        Client client = new Client();

        GenerateContentResponse response =
        client.models.generateContent(
            "gemini-2.5-flash",
            "Give me the history of Papa John's",
            null);

        return category.UNFILTERED;
    }
}
