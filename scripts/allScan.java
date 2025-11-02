package scripts;
import scripts.basicScan;
import scripts.aiScan;
import scripts.category;

//Combines basic and AI scans
public class allScan {

    public static category main(/*Someone (Hayden and/or Daniel) find a way to put the email AND email address in here*/ String sender, String message)
    {
        //Basic scan (currently just gives UNFILTERED)
        category type = scripts.basicScan.main(sender, message);
        
        //AI Scan (currently just gives UNFILTERED)
        scripts.aiScan.main(sender, message, category.SPAM);

        //Return
        return type;
    }
}
