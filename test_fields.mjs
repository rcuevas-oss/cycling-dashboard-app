import { Profile } from "@garmin/fitsdk";
const wktNum = Profile.MesgNum.WORKOUT;
const stepNum = Profile.MesgNum.WORKOUT_STEP;

console.log("Workout message fields:");
const wktFields = Profile.messages[wktNum].fields;
for (const key in wktFields) {
    console.log(`${key} (id:${wktFields[key].num}): type=${wktFields[key].type}`);
}

console.log("\nWorkout step fields:");
const stepFields = Profile.messages[stepNum].fields;
for (const key in stepFields) {
    console.log(`${key} (id:${stepFields[key].num}): type=${stepFields[key].type}`);
}
