package com.example.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendTemporaryPassword(String email, String tempPassword) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Password Reset Approved");
        message.setText(
            "Hello,\n\n" +
            "Your password reset request has been approved.\n\n" +
            "Temporary Password: " + tempPassword + "\n\n" +
            "Please login and change your password immediately."
        );

        mailSender.send(message);
    }

    public void sendAccountActivationEmail(String email, String firstName, String accountNumber) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Your Credit Account Has Been Activated");
        message.setText(
            "Dear " + (firstName != null ? firstName : "Valued Customer") + ",\n\n" +
            "Your credit account (Account No: " + accountNumber + ") has been successfully activated.\n\n" +
            "You may now proceed to use your account and request a credit card.\n\n" +
            "If you did not request this, please contact our support team immediately.\n\n" +
            "Thank you for choosing our services."
        );

        mailSender.send(message);
    }

    public void sendCardIssuedEmail(String email, String cardHolderName, String maskedCardNumber) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setTo(email);
        message.setSubject("Your Credit Card Has Been Issued");
        message.setText(
            "Dear " + (cardHolderName != null ? cardHolderName : "Valued Customer") + ",\n\n" +
            "We are pleased to inform you that your credit card has been successfully issued.\n\n" +
            "Card Number: " + maskedCardNumber + "\n\n" +
            "Your card is now ready for use. Please keep your card details secure at all times.\n\n" +
            "If you did not request this, please contact our support team immediately.\n\n" +
            "Thank you for choosing our services."
        );

        mailSender.send(message);
    }

}
