import { parse } from "csv-parse/sync";

export interface ParsedEmailRow {
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: Date;
}

export interface CsvParseResult {
  validRows: ParsedEmailRow[];
  errors: { rowNumber: number; error: string }[];
}

export function parseAndValidateEmailCsv(buffer: Buffer): CsvParseResult {
  const result: CsvParseResult = {
    validRows: [],
    errors: [],
  };

  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    records.forEach((record: any, index: number) => {
      const rowNumber = index + 2; // +1 for 0-index, +1 for header row

      const { recipient, subject, body, scheduledAt } = record;

      if (!recipient || !subject || !body || !scheduledAt) {
        result.errors.push({ rowNumber, error: "Missing required columns (recipient, subject, body, scheduledAt)" });
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        result.errors.push({ rowNumber, error: "Invalid recipient email address" });
        return;
      }

      // Date validation
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        result.errors.push({ rowNumber, error: "Invalid scheduledAt format, must be ISO-8601" });
        return;
      }

      if (scheduledDate <= new Date()) {
        result.errors.push({ rowNumber, error: "scheduledAt must be a future date/time" });
        return;
      }

      result.validRows.push({
        recipient,
        subject,
        body,
        scheduledAt: scheduledDate,
      });
    });
  } catch (err: any) {
    result.errors.push({ rowNumber: 0, error: `CSV Parsing Error: ${err.message}` });
  }

  return result;
}
