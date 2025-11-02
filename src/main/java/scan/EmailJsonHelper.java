package scan;

import org.json.JSONObject;

import java.util.Date;

/**
 * Helper class for serializing and deserializing Email objects to/from JSON.
 */
public class EmailJsonHelper {

    /**
     * Serializes an Email object to a JSON string.
     *
     * @param email The Email object to serialize
     * @return JSON string representation of the Email object
     */
    public static String toJson(Email email) {
        if (email == null) {
            return null;
        }

        JSONObject jsonObject = new JSONObject();
        jsonObject.put("from", email.getFrom());
        jsonObject.put("to", email.getTo());
        jsonObject.put("cc", email.getCc());
        jsonObject.put("bcc", email.getBcc());
        jsonObject.put("subject", email.getSubject());
        jsonObject.put("body", email.getBody());
        
        // Serialize Date as timestamp (milliseconds since epoch)
        if (email.getReceivedDate() != null) {
            jsonObject.put("receivedDate", email.getReceivedDate().getTime());
        } else {
            jsonObject.put("receivedDate", JSONObject.NULL);
        }

        return jsonObject.toString();
    }

    /**
     * Serializes an Email object to a JSONObject.
     *
     * @param email The Email object to serialize
     * @return JSONObject representation of the Email object
     */
    public static JSONObject toJsonObject(Email email) {
        if (email == null) {
            return null;
        }

        JSONObject jsonObject = new JSONObject();
        jsonObject.put("from", email.getFrom());
        jsonObject.put("to", email.getTo());
        jsonObject.put("cc", email.getCc());
        jsonObject.put("bcc", email.getBcc());
        jsonObject.put("subject", email.getSubject());
        jsonObject.put("body", email.getBody());
        
        // Serialize Date as timestamp (milliseconds since epoch)
        if (email.getReceivedDate() != null) {
            jsonObject.put("receivedDate", email.getReceivedDate().getTime());
        } else {
            jsonObject.put("receivedDate", JSONObject.NULL);
        }

        return jsonObject;
    }

    /**
     * Deserializes a JSON string to an Email object.
     *
     * @param jsonString The JSON string to deserialize
     * @return Email object created from the JSON string, or null if jsonString is null or invalid
     */
    public static Email fromJson(String jsonString) {
        if (jsonString == null || jsonString.trim().isEmpty()) {
            return null;
        }

        try {
            JSONObject jsonObject = new JSONObject(jsonString);
            return fromJsonObject(jsonObject);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid JSON string: " + jsonString, e);
        }
    }

    /**
     * Deserializes a JSONObject to an Email object.
     *
     * @param jsonObject The JSONObject to deserialize
     * @return Email object created from the JSONObject, or null if jsonObject is null
     */
    public static Email fromJsonObject(JSONObject jsonObject) {
        if (jsonObject == null) {
            return null;
        }

        Email email = new Email();

        // Deserialize each field, handling null values
        email.setFrom(jsonObject.optString("from", null));
        email.setTo(jsonObject.optString("to", null));
        email.setCc(jsonObject.optString("cc", null));
        email.setBcc(jsonObject.optString("bcc", null));
        email.setSubject(jsonObject.optString("subject", null));
        email.setBody(jsonObject.optString("body", null));

        // Deserialize Date from timestamp
        if (!jsonObject.isNull("receivedDate") && jsonObject.has("receivedDate")) {
            long timestamp = jsonObject.getLong("receivedDate");
            email.setCrazyCategory(new Date(timestamp));
        }

        return email;
    }
}