import ExcelJS from "exceljs";
import { APP_TIMEZONE, formatInZone } from "../../shared/lib/time";
import { maskProfanity } from "./feedback.profanity";

/** Файл — на армянском: получатель — мэрия (docs/architecture.md §6a). */
const LABELS = {
  summarySheet: "Ամփոփում",
  listSheet: "Դիմումներ",
  title: "Քաղաքացիների դիմումներ",
  period: "Ժամանակահատված",
  count: "Դիմումների քանակ",
  exportedAt: "Արտահանման ամսաթիվ",
  timezone: "Ժամային գոտի",
  masked: "Անպարկեշտ բառերը փոխարինված են *** նշանով։",
  number: "№",
  date: "Ամսաթիվ",
  time: "Ժամ",
  text: "Տեքստ",
};

/** «2026-09-01» → «01.09.2026» */
const dmy = (day: string) => day.split("-").reverse().join(".");

type Row = { message: string; createdAt: Date };

export async function buildFeedbackWorkbook(input: { from: string; to: string; rows: Row[]; exportedAt: Date }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ICU";
  workbook.created = input.exportedAt;

  const summary = workbook.addWorksheet(LABELS.summarySheet);
  summary.columns = [{ width: 30 }, { width: 40 }];
  summary.addRow([LABELS.title]).font = { bold: true, size: 14 };
  summary.addRow([]);
  const exported = formatInZone(input.exportedAt);
  for (const row of [
    [LABELS.period, `${dmy(input.from)} – ${dmy(input.to)}`],
    [LABELS.count, input.rows.length],
    [LABELS.exportedAt, `${exported.date} ${exported.time}`],
    [LABELS.timezone, APP_TIMEZONE],
  ]) {
    summary.addRow(row).getCell(1).font = { bold: true };
  }
  summary.addRow([]);
  summary.addRow([LABELS.masked]);

  const list = workbook.addWorksheet(LABELS.listSheet, { views: [{ state: "frozen", ySplit: 1 }] });
  list.columns = [
    { header: LABELS.number, key: "n", width: 6 },
    { header: LABELS.date, key: "date", width: 12 },
    { header: LABELS.time, key: "time", width: 8 },
    { header: LABELS.text, key: "text", width: 100 },
  ];
  list.getRow(1).font = { bold: true };
  input.rows.forEach((row, i) => {
    const { date, time } = formatInZone(row.createdAt);
    // строка ячейки — всегда текст, не формула: «=…» из обращения не выполнится
    list.addRow({ n: i + 1, date, time, text: maskProfanity(row.message) });
  });
  list.getColumn("text").alignment = { wrapText: true, vertical: "top" };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
