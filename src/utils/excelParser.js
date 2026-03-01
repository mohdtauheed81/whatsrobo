const ExcelJS = require('exceljs');
const logger = require('../config/logger');

class ExcelParser {
  /**
   * Parse Excel file and extract contacts and messages
   */
  static async parseContactsFromFile(filePath) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        throw new Error('No worksheet found in Excel file');
      }

      const contacts = [];
      const errors = [];
      let rowNumber = 1;

      worksheet.eachRow((row, rowIndex) => {
        try {
          rowNumber = rowIndex;

          // Skip header row
          if (rowIndex === 1) {
            return;
          }

          const phoneNumber = row.getCell(1).value;
          const message = row.getCell(2).value;
          const name = row.getCell(3).value;

          // Validate required fields
          if (!phoneNumber) {
            errors.push({
              row: rowIndex,
              error: 'Phone number is required'
            });
            return;
          }

          if (!message) {
            errors.push({
              row: rowIndex,
              error: 'Message is required'
            });
            return;
          }

          // Validate phone number format (basic validation)
          const cleanedNumber = this.cleanPhoneNumber(phoneNumber.toString());
          if (!cleanedNumber) {
            errors.push({
              row: rowIndex,
              error: `Invalid phone number format: ${phoneNumber}`
            });
            return;
          }

          contacts.push({
            phoneNumber: cleanedNumber,
            message: message.toString().trim(),
            name: name ? name.toString().trim() : null
          });
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: error.message
          });
        }
      });

      if (contacts.length === 0 && errors.length === 0) {
        throw new Error('No valid contacts found in Excel file');
      }

      logger.info('Excel file parsed', {
        totalRows: worksheet.rowCount - 1,
        validContacts: contacts.length,
        errors: errors.length
      });

      return {
        success: contacts.length > 0,
        contacts,
        errors,
        summary: {
          totalRows: worksheet.rowCount - 1,
          validContacts: contacts.length,
          invalidRows: errors.length
        }
      };
    } catch (error) {
      logger.error('Failed to parse Excel file', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate and clean phone number
   */
  static cleanPhoneNumber(phoneNumber) {
    try {
      // Remove special characters
      let cleaned = phoneNumber.toString().replace(/[^\d+]/g, '');

      // Check if starts with + or country code
      if (!cleaned.startsWith('+')) {
        // Assume it's a valid number starting with country code (e.g., 91 for India)
        if (cleaned.length >= 10) {
          // Looks valid
          return cleaned;
        }
      }

      // Validate minimum length (typically 10-15 digits)
      if (cleaned.length < 10 || cleaned.length > 15) {
        return null;
      }

      return cleaned;
    } catch (error) {
      logger.error('Error cleaning phone number', { error: error.message });
      return null;
    }
  }

  /**
   * Create template Excel file
   */
  static async createTemplateFile(outputPath) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Contacts');

      // Add headers
      worksheet.addRow(['Phone Number', 'Message', 'Name']);

      // Add sample data
      worksheet.addRow(['919876543210', 'Hello! This is a test message', 'John Doe']);
      worksheet.addRow(['919876543211', 'Hi there! How are you?', 'Jane Smith']);

      // Style headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      // Set column widths
      worksheet.getColumn(1).width = 20;
      worksheet.getColumn(2).width = 40;
      worksheet.getColumn(3).width = 20;

      // Freeze header row
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      // Save file
      await workbook.xlsx.writeFile(outputPath);

      logger.info('Excel template created', { path: outputPath });
      return true;
    } catch (error) {
      logger.error('Failed to create Excel template', { error: error.message });
      throw error;
    }
  }

  /**
   * Validate Excel file structure before parsing
   */
  static async validateExcelStructure(filePath) {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        return { valid: false, error: 'No worksheet found' };
      }

      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString().toLowerCase() || '');
      });

      // Check for required columns
      const hasPhoneColumn = headers.some(h => h.includes('phone') || h.includes('number'));
      const hasMessageColumn = headers.some(h => h.includes('message') || h.includes('text'));

      if (!hasPhoneColumn || !hasMessageColumn) {
        return {
          valid: false,
          error: 'Excel file must contain "Phone Number" and "Message" columns'
        };
      }

      const rowCount = worksheet.rowCount - 1; // Exclude header
      if (rowCount === 0) {
        return { valid: false, error: 'No data rows found in Excel file' };
      }

      return {
        valid: true,
        headers,
        rowCount
      };
    } catch (error) {
      logger.error('Failed to validate Excel structure', { error: error.message });
      return { valid: false, error: error.message };
    }
  }
}

module.exports = ExcelParser;
