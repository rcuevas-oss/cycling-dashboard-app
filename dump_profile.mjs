import { Profile } from "@garmin/fitsdk";
import * as fs from "fs";

const step = Profile.messages.workoutStep;
fs.writeFileSync("step_profile.json", JSON.stringify(step, null, 2));

const wkType = Profile.types.wktStepType || "missing";
fs.writeFileSync("wktStepType_enum.json", JSON.stringify(wkType, null, 2));
