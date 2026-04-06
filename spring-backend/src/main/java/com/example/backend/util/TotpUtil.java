package com.example.backend.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * TOTP (Time-based One-Time Password) utility – RFC 6238 compliant.
 * Uses HMAC-SHA1 with a 30-second time step and 6-digit codes.
 * No external library required – pure JDK implementation.
 */
public class TotpUtil {

    private static final int SECRET_BYTES = 20;        // 160-bit secret
    private static final int CODE_DIGITS  = 6;
    private static final int TIME_STEP    = 30;         // seconds
    private static final int WINDOW       = 1;          // allow ±1 time step
    private static final String ISSUER    = "IssuerBackOffice";

    // ─── Base32 alphabet (RFC 4648) ──────────────────────────────
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    // ─── Generate a random Base32 secret ─────────────────────────
    public static String generateSecret() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        return base32Encode(bytes);
    }

    // ─── Build the otpauth:// URI for QR code generation ────────
    public static String buildOtpAuthUrl(String secret, String username) {
        String encoded = URLEncoder.encode(ISSUER + ":" + username, StandardCharsets.UTF_8);
        String issuerEncoded = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8);
        return "otpauth://totp/" + encoded
                + "?secret=" + secret
                + "&issuer=" + issuerEncoded
                + "&digits=" + CODE_DIGITS
                + "&period=" + TIME_STEP;
    }

    // ─── Verify a 6-digit TOTP code (allows ±1 window) ─────────
    public static boolean verifyCode(String secret, String code) {
        if (secret == null || code == null || code.length() != CODE_DIGITS) {
            return false;
        }
        try {
            long currentInterval = System.currentTimeMillis() / 1000 / TIME_STEP;
            byte[] key = base32Decode(secret);

            for (int i = -WINDOW; i <= WINDOW; i++) {
                String generated = generateCode(key, currentInterval + i);
                if (generated.equals(code)) {
                    return true;
                }
            }
        } catch (Exception e) {
            // Invalid secret or code
        }
        return false;
    }

    // ─── Internal: generate a single TOTP code for a time counter ─
    private static String generateCode(byte[] key, long counter) throws Exception {
        byte[] data = new byte[8];
        for (int i = 7; i >= 0; i--) {
            data[i] = (byte) (counter & 0xFF);
            counter >>= 8;
        }

        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(key, "HmacSHA1"));
        byte[] hash = mac.doFinal(data);

        int offset = hash[hash.length - 1] & 0x0F;
        int binary = ((hash[offset] & 0x7F) << 24)
                   | ((hash[offset + 1] & 0xFF) << 16)
                   | ((hash[offset + 2] & 0xFF) << 8)
                   | (hash[offset + 3] & 0xFF);

        int otp = binary % (int) Math.pow(10, CODE_DIGITS);
        return String.format("%0" + CODE_DIGITS + "d", otp);
    }

    // ─── Base32 encoding ─────────────────────────────────────────
    private static String base32Encode(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                result.append(BASE32_CHARS.charAt(index));
                bitsLeft -= 5;
            }
        }
        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            result.append(BASE32_CHARS.charAt(index));
        }
        return result.toString();
    }

    // ─── Base32 decoding ─────────────────────────────────────────
    private static byte[] base32Decode(String encoded) {
        encoded = encoded.toUpperCase().replaceAll("[=\\s]", "");
        int outLen = encoded.length() * 5 / 8;
        byte[] result = new byte[outLen];
        int buffer = 0;
        int bitsLeft = 0;
        int idx = 0;
        for (char c : encoded.toCharArray()) {
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) throw new IllegalArgumentException("Invalid Base32 character: " + c);
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                result[idx++] = (byte) (buffer >> (bitsLeft - 8));
                bitsLeft -= 8;
            }
        }
        return result;
    }
}
