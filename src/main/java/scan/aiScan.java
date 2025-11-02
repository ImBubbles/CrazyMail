package scan;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
//Receives the basic scan results and uses them to tell AI what to check the email for.
public class aiScan
{

    public static category main(String sender, String message, category narrowed)
    {
        Client client = new Client();

        String categoriesString = category.convertEnumToString();

        GenerateContentResponse response =
        client.models.generateContent(
            "gemini-2.5-flash",
            "You are an expert email classifier. Classify the following email into one single category from this list: [" + categoriesString + "].",
            null);

            System.out.println(response.text());

        return category.UNFILTERED;
    }
}