import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";

fs.writeFileSync("intensity_enum.json", JSON.stringify(Profile.types.intensity, null, 2));

fs.writeFileSync("workout_fields.json", JSON.stringify(Profile.messages.workout, null, 2));
