import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";
const keys = Object.keys(Profile.types);
fs.writeFileSync("types.txt", keys.join("\n"));
