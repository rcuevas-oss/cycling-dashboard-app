import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";
let out = "FILE_ID FIELDS MAP:\n";
const fields = Profile.messages[Profile.MesgNum.FILE_ID].fields;
for (const key in fields) out += `${fields[key].num}: ${fields[key].name}\n`;
fs.writeFileSync("fileid_keys.txt", out);
