package com.example.backend.util;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption utility for sensitive field encryption at rest.
 *
 * Each encrypted value includes a random 12-byte IV prepended to the ciphertext,
 * so identical plaintext values produce different ciphertexts every time.
 *
 * Format: Base64( IV[12] || ciphertext || GCM-tag[16] )
 */
public class EncryptionUtil {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH = 128; // bits
    private static final int IV_LENGTH = 12;       // bytes (recommended for GCM)

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private EncryptionUtil() {
        // utility class
    }

    /**
     * Encrypt a plaintext string using AES-256-GCM.
     *
     * @param plaintext the value to encrypt
     * @param hexKey    the 256-bit key as a 64-character hex string
     * @return Base64-encoded ciphertext (IV prepended)
     */
    public static String encrypt(String plaintext, String hexKey) {
        if (plaintext == null) return null;
        try {
            byte[] key = hexToBytes(hexKey);
            SecretKeySpec keySpec = new SecretKeySpec(key, "AES");

            byte[] iv = new byte[IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(java.nio.charset.StandardCharsets.UTF_8));

            // Prepend IV to ciphertext: IV || ciphertext+tag
            ByteBuffer buffer = ByteBuffer.allocate(IV_LENGTH + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);

            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    /**
     * Decrypt a Base64-encoded AES-256-GCM ciphertext.
     *
     * @param encryptedBase64 the Base64 string (IV + ciphertext)
     * @param hexKey          the 256-bit key as a 64-character hex string
     * @return the original plaintext
     */
    public static String decrypt(String encryptedBase64, String hexKey) {
        if (encryptedBase64 == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(encryptedBase64);
            byte[] key = hexToBytes(hexKey);
            SecretKeySpec keySpec = new SecretKeySpec(key, "AES");

            // Extract IV from the first 12 bytes
            ByteBuffer buffer = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] plainBytes = cipher.doFinal(ciphertext);
            return new String(plainBytes, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed", e);
        }
    }

    /**
     * Check if a value looks like it was already encrypted (valid Base64 + minimum size).
     */
    public static boolean isEncrypted(String value) {
        if (value == null || value.isEmpty()) return false;
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            // Minimum size: 12 (IV) + 16 (GCM tag) + 1 (at least 1 byte plaintext) = 29
            return decoded.length >= 29;
        } catch (IllegalArgumentException e) {
            return false; // not valid Base64
        }
    }

    private static byte[] hexToBytes(String hex) {
        if (hex.length() != 64) {
            throw new IllegalArgumentException("AES-256 key must be exactly 64 hex characters (32 bytes)");
        }
        byte[] bytes = new byte[32];
        for (int i = 0; i < 32; i++) {
            bytes[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }
}
