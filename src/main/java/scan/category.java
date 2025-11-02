package scan;

import java.util.Arrays;
import java.util.stream.Collectors;

public enum category
{
        SPAM, UNFILTERED, LONG, STUFFFROMRYANMILLER, GEMINIFAIL, PHISHING, GUIDE, NEWSLETTER, SUPPORT, SYSTEM, WELCOME;

        public static String convertEnumToString()
        {
            return Arrays.stream(category.values())
                .map(e -> e.name().charAt(0) + e.name().substring(1).toLowerCase())
                .collect(Collectors.joining(", "));
        }
    }