package model;

import java.util.Date;

public class Email {
    private String from;
    private String to;
    private String cc;
    private String bcc;
    private String subject;
    private String body;
    private Date receivedDate;

    // Constructor with no parameters
    public Email() {
    }

    // Constructor with all fields
    public Email(String from, String to, String cc, String bcc, String subject, String body, Date receivedDate) {
        this.from = from;
        this.to = to;
        this.cc = cc;
        this.bcc = bcc;
        this.subject = subject;
        this.body = body;
        this.receivedDate = receivedDate;
    }

    // Getters
    public String getFrom() {
        return from;
    }

    public String getTo() {
        return to;
    }

    public String getCc() {
        return cc;
    }

    public String getBcc() {
        return bcc;
    }

    public String getSubject() {
        return subject;
    }

    public String getBody() {
        return body;
    }

    public Date getReceivedDate() {
        return receivedDate;
    }

    // Setters
    public void setFrom(String from) {
        this.from = from;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public void setCc(String cc) {
        this.cc = cc;
    }

    public void setBcc(String bcc) {
        this.bcc = bcc;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public void setReceivedDate(Date receivedDate) {
        this.receivedDate = receivedDate;
    }
}

