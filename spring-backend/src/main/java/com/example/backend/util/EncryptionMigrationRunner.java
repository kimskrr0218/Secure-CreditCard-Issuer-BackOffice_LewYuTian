package com.example.backend.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.*;

/**
 * One-time startup migration that encrypts any existing cleartext sensitive fields
 * already stored in the database.
 *
 * How it works:
 * - On startup, reads raw column values directly via JDBC (bypassing JPA converters).
 * - If a value does NOT look like a valid encrypted blob (i.e. it's still cleartext),
 *   it encrypts the value and writes it back via JDBC.
 * - Rows that are already encrypted are skipped (idempotent).
 *
 * This runner uses @Order(1) so it executes before normal application traffic.
 * After the first successful run, this is essentially a no-op (all values are already encrypted).
 */
@Component
@Order(1)
public class EncryptionMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(EncryptionMigrationRunner.class);

    private final DataSource dataSource;
    private final String aesKey;

    public EncryptionMigrationRunner(
            DataSource dataSource,
            @Value("${encryption.aes.key}") String aesKey) {
        this.dataSource = dataSource;
        this.aesKey = aesKey;
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("=== Encryption Migration: checking for cleartext sensitive fields ===");

        try (Connection conn = dataSource.getConnection()) {
            int customerCount = migrateCustomers(conn);
            int cardCount = migrateCards(conn);

            if (customerCount == 0 && cardCount == 0) {
                log.info("=== Encryption Migration: all fields already encrypted — nothing to do ===");
            } else {
                log.info("=== Encryption Migration complete: {} customers, {} cards encrypted ===",
                        customerCount, cardCount);
            }
        } catch (SQLException e) {
            log.error("Encryption migration failed", e);
        }
    }

    private int migrateCustomers(Connection conn) throws SQLException {
        int migrated = 0;

        // Read raw values bypassing JPA converters
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT id, id_number, phone_number FROM customers")) {

            while (rs.next()) {
                long id = rs.getLong("id");
                String idNumber = rs.getString("id_number");
                String phoneNumber = rs.getString("phone_number");

                boolean needsUpdate = false;
                String encIdNumber = idNumber;
                String encPhoneNumber = phoneNumber;

                if (isLikelyCleartext(idNumber)) {
                    encIdNumber = EncryptionUtil.encrypt(idNumber, aesKey);
                    needsUpdate = true;
                }
                if (isLikelyCleartext(phoneNumber)) {
                    encPhoneNumber = EncryptionUtil.encrypt(phoneNumber, aesKey);
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE customers SET id_number = ?, phone_number = ? WHERE id = ?")) {
                        ps.setString(1, encIdNumber);
                        ps.setString(2, encPhoneNumber);
                        ps.setLong(3, id);
                        ps.executeUpdate();
                        migrated++;
                    }
                }
            }
        }
        return migrated;
    }

    private int migrateCards(Connection conn) throws SQLException {
        int migrated = 0;

        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                     "SELECT id, card_number, cvv FROM cards")) {

            while (rs.next()) {
                long id = rs.getLong("id");
                String cardNumber = rs.getString("card_number");
                String cvv = rs.getString("cvv");

                boolean needsUpdate = false;
                String encCardNumber = cardNumber;
                String encCvv = cvv;

                if (isLikelyCleartext(cardNumber)) {
                    encCardNumber = EncryptionUtil.encrypt(cardNumber, aesKey);
                    needsUpdate = true;
                }
                if (isLikelyCleartext(cvv)) {
                    encCvv = EncryptionUtil.encrypt(cvv, aesKey);
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    try (PreparedStatement ps = conn.prepareStatement(
                            "UPDATE cards SET card_number = ?, cvv = ? WHERE id = ?")) {
                        ps.setString(1, encCardNumber);
                        ps.setString(2, encCvv);
                        ps.setLong(3, id);
                        ps.executeUpdate();
                        migrated++;
                    }
                }
            }
        }
        return migrated;
    }

    /**
     * Determines if a value is likely still in cleartext (i.e. not yet encrypted).
     * Encrypted values are Base64-encoded and at least ~40 chars for even short inputs.
     */
    private boolean isLikelyCleartext(String value) {
        if (value == null || value.isEmpty()) return false;
        return !EncryptionUtil.isEncrypted(value);
    }
}
