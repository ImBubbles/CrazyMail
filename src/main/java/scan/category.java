package scan;

import java.util.Arrays;
import java.util.stream.Collectors;

public enum category
{
        SPAM, UNFILTERED, PHISHING, 
        GUIDE, NEWSLETTER, SUPPORT, SYSTEM, WELCOME;

        public static String convertEnumToString()
        {
            return Arrays.stream(category.values())
                .map(e -> e.name().charAt(0) + e.name().substring(1).toLowerCase())
                .collect(Collectors.joining(", "));
        }

        //Categories to give Gemini
        public static String convertEnumToString(category... toExclude) 
        {
        
            // Convert the input categories to a list for easy checking
            final java.util.List<category> exclusionList = Arrays.asList(toExclude);
            
            return Arrays.stream(category.values())
                // Filter: Keep only the categories NOT in the exclusion list
                .filter(e -> !exclusionList.contains(e))
                .map(e -> e.name().charAt(0) + e.name().substring(1).toLowerCase())
                .collect(Collectors.joining(", "));
        }
    }