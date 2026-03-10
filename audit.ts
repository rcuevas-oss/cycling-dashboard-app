import { calculatePMC, getDailyLoads, getLocalYYYYMMDD } from './src/lib/metricsUtils';
import fs from 'fs';

const rawData = fs.readFileSync('C:/Users/pc/.gemini/antigravity/brain/e366e166-6a3b-4c48-a0ba-59e307f6ec8c/.system_generated/steps/676/output.txt', 'utf-8');
const wrapped = JSON.parse(rawData);
const innerString = wrapped.result;
const startIdx = innerString.indexOf('[');
const endIdx = innerString.lastIndexOf(']');
const activities = JSON.parse(innerString.substring(startIdx, endIdx + 1));
const dailyLoads = getDailyLoads(activities);

const pmc = calculatePMC(dailyLoads);

const activityCounts: Record<string, number> = {};
activities.forEach((act: any) => {
    if (!act.activity_date) return;
    const dateStr = getLocalYYYYMMDD(new Date(act.activity_date));
    activityCounts[dateStr] = (activityCounts[dateStr] || 0) + 1;
});

let mdOut = "# PMC Audit Results\n\n";
mdOut += "| date       | activitiesCountThatDay | dailyTSS | ctlRaw   | atlRaw   | tsbRaw   | ctlDisplayed | atlDisplayed | tsbDisplayed |\n";
mdOut += "|------------|------------------------|----------|----------|----------|----------|--------------|--------------|--------------|\n";

const lastElements = pmc.results.slice(-35);

lastElements.forEach(r => {
    const count = activityCounts[r.date] || 0;
    mdOut += `| ${r.date} | ${String(count).padStart(22)} | ${String(r.tss).padStart(8)} | ${r.ctlRaw.toFixed(4).padStart(8)} | ${r.atlRaw.toFixed(4).padStart(8)} | ${r.tsbRaw.toFixed(4).padStart(8)} | ${String(r.ctlDisplayed).padStart(12)} | ${String(r.atlDisplayed).padStart(12)} | ${String(r.tsbDisplayed).padStart(12)} |\n`;
});

const dates = Object.keys(dailyLoads).sort();
const firstAvailableDate = dates[0];
const lastAvailableDate = dates[dates.length - 1];

mdOut += "\n## Summary\n\n";
mdOut += `- **sessionCount:** ${activities.length}\n`;
mdOut += `- **trainingDays:** ${pmc.trainingDays}\n`;
mdOut += `- **daysAvailable:** ${pmc.daysAvailable}\n`;
mdOut += `- **firstAvailableDate:** ${firstAvailableDate}\n`;
mdOut += `- **lastAvailableDate:** ${lastAvailableDate}\n`;
mdOut += `- **metricsStatus:** ${pmc.status}\n`;

fs.writeFileSync('C:/Users/pc/.gemini/antigravity/brain/e366e166-6a3b-4c48-a0ba-59e307f6ec8c/audit_results.md', mdOut);
console.log("Audit complete. Results written to audit_results.md");
