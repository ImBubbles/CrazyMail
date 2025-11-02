package scan;

//This is used to narrow down the amount of information the LLM needs to check for. (Currently returns UNFILTERED every time)
public class basicScan
{
    
    //School Email Checker, determines if the email is a school email.
    public static category main(String sender, String message)
    {
        //save my gemini tokens
        if (message.length() > 1500)
        {
            return category.LONG;
        }

        return category.UNFILTERED;
    }
}