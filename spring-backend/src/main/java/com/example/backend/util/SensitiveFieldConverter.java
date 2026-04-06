package com.example.backend.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter that transparently encrypts sensitive String fields
 * when writing to the database and decrypts them when reading.
 *
 * Usage: annotate entity fields with @Convert(converter = SensitiveFieldConverter.class)
 *
 * The AES-256-GCM key is read from application.properties:
 *   encryption.aes.key=<64-hex-char-key>
 */
@Converter
@Component
public class SensitiveFieldConverter implements AttributeConverter<String, String> {

    private static String aesKey;

    @Value("${encryption.aes.key}")
    public void setAesKey(String key) {
        SensitiveFieldConverter.aesKey = key;
    }

    @Override
    public String convertToDatabaseColumn(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) {
            return plaintext;
        }
        return EncryptionUtil.encrypt(plaintext, aesKey);
    }

    @Override
    public String convertToEntityAttribute(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) {
            return ciphertext;
        }
        try {
            return EncryptionUtil.decrypt(ciphertext, aesKey);
        } catch (RuntimeException e) {
            // If decryption fails, the value may still be unencrypted (pre-migration)
            // Return as-is to avoid breaking reads of legacy data
            return ciphertext;
        }
    }
}
