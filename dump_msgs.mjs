import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";
const msgs = Object.keys(Profile.messages);
fs.writeFileSync("msgs.txt", msgs.join("\n"));
const types = Object.keys(Profile.types);
fs.writeFileSync("all_types.txt", types.join("\n"));
