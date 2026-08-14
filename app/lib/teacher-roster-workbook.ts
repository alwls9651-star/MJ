import ExcelJS from "exceljs";
import type { TeacherCourseRoster } from "./teacher-applications";

export const TEACHER_ROSTER_COLUMNS = ["연번", "학년", "학과", "번호", "이름", "신청과목", "신청시각"] as const;

function toSeoulExcelDate(iso: string) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
}

export function sanitizeExcelFilename(subject: string, academicYear: number) {
  const safeSubject = subject.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, "").slice(0, 60) || "강좌";
  return `${academicYear}_방과후_${safeSubject}_신청자명단.xlsx`;
}

export async function createTeacherRosterWorkbook(roster: TeacherCourseRoster, academicYear: number) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "방과후 신청";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("신청자 명단", {
    views: [{ state: "frozen", ySplit: 7 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  sheet.properties.defaultRowHeight = 20;
  sheet.mergeCells("A1:G1");
  sheet.getCell("A1").value = `${academicYear}학년도 방과후 수강신청 명단`;
  sheet.getCell("A1").font = { name: "맑은 고딕", size: 16, bold: true, color: { argb: "FF102A43" } };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  const info = [
    ["과목", roster.course.subject, "담당교사", roster.course.teacherName],
    ["정원", `${roster.course.capacity}명`, "신청인원", `${roster.appliedCount}명`],
  ];
  for (let index = 0; index < info.length; index += 1) {
    const row = sheet.getRow(index + 3);
    row.values = [info[index][0], info[index][1], info[index][2], info[index][3]];
    for (const column of [1, 3]) {
      row.getCell(column).font = { name: "맑은 고딕", bold: true, color: { argb: "FFFFFFFF" } };
      row.getCell(column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    }
  }

  const rows = roster.applicants.map((student, index) => [
    index + 1,
    student.grade,
    student.department,
    student.studentNumber,
    student.name,
    roster.course.subject,
    toSeoulExcelDate(student.appliedAt),
  ]);
  sheet.addTable({
    name: "TeacherRosterTable",
    ref: "A7",
    headerRow: true,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: TEACHER_ROSTER_COLUMNS.map((name) => ({ name })),
    rows,
  });

  sheet.columns = [
    { width: 8 },
    { width: 10 },
    { width: 20 },
    { width: 10 },
    { width: 14 },
    { width: 28 },
    { width: 24 },
  ];
  sheet.getColumn(7).numFmt = "yyyy-mm-dd hh:mm:ss";
  sheet.getColumn(1).alignment = { horizontal: "center" };
  sheet.getColumn(2).alignment = { horizontal: "center" };
  sheet.getColumn(4).alignment = { horizontal: "center" };
  sheet.getColumn(7).alignment = { horizontal: "center" };
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => { cell.font = { ...cell.font, name: "맑은 고딕" }; });
    if (rowNumber >= 7) row.alignment = { ...row.alignment, vertical: "middle" };
  });
  sheet.autoFilter = { from: "A7", to: `G${Math.max(7 + rows.length, 7)}` };
  sheet.headerFooter.oddFooter = "&C방과후 신청 · &P / &N";

  return workbook.xlsx.writeBuffer();
}

export function excelContentDisposition(filename: string, academicYear: number) {
  const encoded = encodeURIComponent(filename).replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `attachment; filename="${academicYear}_after_school_roster.xlsx"; filename*=UTF-8''${encoded}`;
}
