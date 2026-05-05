import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = "data/jp-aliases-template.xlsx";

const workbook = Workbook.create();
const aliases = workbook.worksheets.add("日服別名");
const help = workbook.worksheets.add("填写说明");

aliases.showGridLines = false;
help.showGridLines = false;

aliases.getRange("A1:C1").values = [["巴哈任務名", "日服任務名", "備註"]];
aliases.getRange("A2:C7").values = [
  ["商人公會的困境", "商人への転職", "基础商人转职任务：取得商人公會登錄證"],
  ["乳酪交貨", "", "这里填日服实际显示的任务名；不确定时可以留空或之后再补"],
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
  ["", "", ""]
];

aliases.getRange("A1:C1").format = {
  fill: "#126B63",
  font: { bold: true, color: "#FFFFFF" }
};
aliases.getRange("A1:C7").format = {
  font: { name: "Microsoft YaHei" },
  wrapText: true,
  verticalAlignment: "top"
};
aliases.getRange("A:A").format.columnWidthPx = 180;
aliases.getRange("B:B").format.columnWidthPx = 240;
aliases.getRange("C:C").format.columnWidthPx = 420;
aliases.getRange("A1:C7").format.rowHeightPx = 34;
aliases.freezePanes.freezeRows(1);
aliases.tables.add("A1:C7", true, "JpAliasTable");

help.getRange("A1").values = [["日服任务名别名表"]];
help.getRange("A3:B8").values = [
  ["巴哈任務名", "巴哈攻略百科里的繁中任务名，必须尽量完全一致。"],
  ["日服任務名", "游戏里看到的日文任务名。多个名字可以用 | 分隔。"],
  ["備註", "可写来源、是否已验证、版本差异等。"],
  ["保存", "填完后另存为 CSV UTF-8，或直接保留这个 Excel 表给自己维护。"],
  ["导入", "导入器读取 CSV；如果用 Excel 维护，请另存为 CSV UTF-8 后再运行导入器。"],
  ["提醒", "巴哈资料是繁中，日服精确命中依赖这一列日文别名。"]
];
help.getRange("A1:B1").merge();
help.getRange("A1").format = {
  fill: "#17211F",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  horizontalAlignment: "center"
};
help.getRange("A3:A8").format = {
  fill: "#E9F3F1",
  font: { bold: true, color: "#0B514B" }
};
help.getRange("A3:B8").format = {
  font: { name: "Microsoft YaHei" },
  wrapText: true,
  verticalAlignment: "top"
};
help.getRange("A:A").format.columnWidthPx = 130;
help.getRange("B:B").format.columnWidthPx = 620;
help.getRange("A3:B8").format.rowHeightPx = 42;

await fs.mkdir("data", { recursive: true });

await workbook.inspect({
  kind: "table",
  range: "日服別名!A1:C7",
  include: "values",
  tableMaxRows: 10,
  tableMaxCols: 4
});

await workbook.render({ sheetName: "日服別名", range: "A1:C7", scale: 1, format: "png" });
await workbook.render({ sheetName: "填写说明", range: "A1:B8", scale: 1, format: "png" });

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
