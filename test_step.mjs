import { Profile } from "@garmin/fitsdk";

const stepNum = Profile.MesgNum.WORKOUT_STEP;
const fields = Profile.messages[stepNum].fields;

console.log("Workout Step fields:");
for (const key in fields) {
    const f = fields[key];
    console.log(`${key} (id:${f.num}): type=${f.type}`);
}
