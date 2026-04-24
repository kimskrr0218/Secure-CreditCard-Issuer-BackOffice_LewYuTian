package com.example.backend.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class ReportService {

    private static final float MARGIN = 40;
    private static final float ROW_HEIGHT = 18;
    private static final float HEADER_FONT_SIZE = 16;
    private static final float SUB_FONT_SIZE = 10;
    private static final float TABLE_FONT_SIZE = 8;
    private static final float TABLE_HEADER_FONT_SIZE = 8.5f;

    /**
     * Generate a PDF report with a title, filter info, and a data table.
     */
    public byte[] generatePdf(String title, String[] headers, String[][] rows,
                              int totalRecords, String statusFilter,
                              LocalDate fromDate, LocalDate toDate) {
        try (PDDocument doc = new PDDocument()) {

            float pageWidth = PDRectangle.A4.getWidth();
            float pageHeight = PDRectangle.A4.getHeight();
            float tableWidth = pageWidth - 2 * MARGIN;

            // Calculate column widths proportionally
            float[] colWidths = calculateColumnWidths(headers, rows, tableWidth);

            int rowIndex = 0;
            boolean isFirstPage = true;

            while (rowIndex <= rows.length) { // <= to handle header-only page
                PDPage page = new PDPage(PDRectangle.A4);
                doc.addPage(page);
                PDPageContentStream cs = new PDPageContentStream(doc, page);

                float y = pageHeight - MARGIN;

                if (isFirstPage) {
                    // ─── Title ───
                    cs.setFont(PDType1Font.HELVETICA_BOLD, HEADER_FONT_SIZE);
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText(title);
                    cs.endText();
                    y -= 22;

                    // ─── Generated date ───
                    cs.setFont(PDType1Font.HELVETICA, SUB_FONT_SIZE);
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText("Generated: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                    cs.endText();
                    y -= 15;

                    // ─── Filter info ───
                    String filterText = "Filters: ";
                    if (statusFilter != null && !statusFilter.isBlank()) {
                        filterText += "Status = " + statusFilter + "  ";
                    }
                    if (fromDate != null) {
                        filterText += "From = " + fromDate + "  ";
                    }
                    if (toDate != null) {
                        filterText += "To = " + toDate + "  ";
                    }
                    if (filterText.equals("Filters: ")) {
                        filterText += "None (all records)";
                    }
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText(filterText);
                    cs.endText();
                    y -= 15;

                    // ─── Total records ───
                    cs.beginText();
                    cs.newLineAtOffset(MARGIN, y);
                    cs.showText("Total Records: " + totalRecords);
                    cs.endText();
                    y -= 20;

                    isFirstPage = false;
                }

                // ─── Table Header ───
                drawTableHeader(cs, MARGIN, y, colWidths, headers);
                y -= ROW_HEIGHT;

                // ─── Table Rows ───
                float bottomLimit = MARGIN + 30;
                while (rowIndex < rows.length && y > bottomLimit) {
                    // Alternate row background
                    if (rowIndex % 2 == 0) {
                        cs.setNonStrokingColor(245, 247, 250);
                        cs.addRect(MARGIN, y - ROW_HEIGHT + 4, tableWidth, ROW_HEIGHT);
                        cs.fill();
                        cs.setNonStrokingColor(0, 0, 0);
                    }

                    drawRow(cs, MARGIN, y, colWidths, rows[rowIndex]);
                    y -= ROW_HEIGHT;
                    rowIndex++;
                }

                // ─── Footer ───
                cs.setFont(PDType1Font.HELVETICA, 7);
                cs.setNonStrokingColor(150, 150, 150);
                cs.beginText();
                cs.newLineAtOffset(MARGIN, MARGIN - 10);
                cs.showText("Credit Card Issuer Back-Office System — Confidential");
                cs.endText();
                cs.setNonStrokingColor(0, 0, 0);

                cs.close();

                if (rowIndex >= rows.length) break;
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    // ─── Draw table header row with dark background ───
    private void drawTableHeader(PDPageContentStream cs, float x, float y,
                                  float[] colWidths, String[] headers) throws Exception {
        float tableWidth = 0;
        for (float w : colWidths) tableWidth += w;

        // Dark header background
        cs.setNonStrokingColor(30, 41, 59); // #1e293b
        cs.addRect(x, y - ROW_HEIGHT + 4, tableWidth, ROW_HEIGHT);
        cs.fill();

        // White text
        cs.setNonStrokingColor(255, 255, 255);
        cs.setFont(PDType1Font.HELVETICA_BOLD, TABLE_HEADER_FONT_SIZE);

        float cellX = x;
        for (int i = 0; i < headers.length; i++) {
            cs.beginText();
            cs.newLineAtOffset(cellX + 4, y - 10);
            cs.showText(truncate(headers[i], colWidths[i], TABLE_HEADER_FONT_SIZE));
            cs.endText();
            cellX += colWidths[i];
        }

        cs.setNonStrokingColor(0, 0, 0);
    }

    // ─── Draw a data row ───
    private void drawRow(PDPageContentStream cs, float x, float y,
                         float[] colWidths, String[] cells) throws Exception {
        cs.setFont(PDType1Font.HELVETICA, TABLE_FONT_SIZE);

        float cellX = x;
        for (int i = 0; i < cells.length && i < colWidths.length; i++) {
            cs.beginText();
            cs.newLineAtOffset(cellX + 4, y - 10);
            cs.showText(truncate(cells[i] != null ? cells[i] : "-", colWidths[i], TABLE_FONT_SIZE));
            cs.endText();
            cellX += colWidths[i];
        }
    }

    // ─── Calculate proportional column widths ───
    private float[] calculateColumnWidths(String[] headers, String[][] rows, float tableWidth) {
        float[] widths = new float[headers.length];
        for (int i = 0; i < headers.length; i++) {
            widths[i] = headers[i].length();
        }
        // Check data for wider columns
        for (String[] row : rows) {
            for (int i = 0; i < row.length && i < widths.length; i++) {
                if (row[i] != null && row[i].length() > widths[i]) {
                    widths[i] = Math.min(row[i].length(), 30); // cap at 30 chars
                }
            }
        }
        // First column (No.) is narrow
        widths[0] = Math.max(widths[0], 3);

        float total = 0;
        for (float w : widths) total += w;
        for (int i = 0; i < widths.length; i++) {
            widths[i] = (widths[i] / total) * tableWidth;
        }
        return widths;
    }

    // ─── Truncate text to fit column ───
    private String truncate(String text, float colWidth, float fontSize) {
        int maxChars = (int) (colWidth / (fontSize * 0.45));
        if (text.length() > maxChars) {
            return text.substring(0, Math.max(maxChars - 2, 1)) + "..";
        }
        return text;
    }
}
