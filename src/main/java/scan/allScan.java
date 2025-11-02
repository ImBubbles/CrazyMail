package scan;

//Combines basic and AI scans
public class allScan {

    public static category main(/*Someone (Hayden and/or Daniel) find a way to put the email AND email address in here*/ String sender, String message)
    {
        //Basic scan (currently just gives UNFILTERED)
        category type = basicScan.main(sender, message);
        
        //AI Scan (currently just gives UNFILTERED)
        aiScan.main(sender, message, category.SPAM);

        //Return
        return type;
    }
}