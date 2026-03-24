const { parse, format, eachDayOfInterval } = require('date-fns');

const dStr = "2026-04-27";
const endStr = "2026-04-29";

const start = parse(dStr, "yyyy-MM-dd", new Date());
const end = parse(endStr, "yyyy-MM-dd", new Date());

console.log("Start parsed:", start);
console.log("End parsed:", end);

const days = eachDayOfInterval({ start, end });
const formatted = days.map(d => format(d, "yyyy-MM-dd"));

console.log("Formatted:", formatted);
