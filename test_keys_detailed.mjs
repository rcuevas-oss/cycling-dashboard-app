import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";

let out = "WORKOUT FIELDS MAP:\n";
const wktFields = Profile.messages[Profile.MesgNum.WORKOUT].fields;
for (const key in wktFields) out += `${wktFields[key].num}: ${wktFields[key].name}\n`;

out += "\nWORKOUT STEP FIELDS MAP:\n";
const stepFields = Profile.messages[Profile.MesgNum.WORKOUT_STEP].fields;
for (const key in stepFields) out += `${stepFields[key].num}: ${stepFields[key].name}\n`;

fs.writeFileSync("field_keys.txt", out);
