import { Profile } from "@garmin/fitsdk";

console.log("MesgNum:", Object.keys(Profile.MesgNum).filter(k => k.includes("WORKOUT")));
console.log("Workout types:", Profile.types.workoutCapabilities);

// Let's create a minimal workout FIT structure and check if Encoder complains
import { Encoder } from "@garmin/fitsdk";
import * as fs from "fs";

try {
    const encoder = new Encoder();

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.FILE_ID,
        type: Profile.types.file.workout,
        manufacturer: Profile.types.manufacturer.development,
        product: 1,
        timeCreated: new Date(),
        serialNumber: 1234
    });

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.WORKOUT,
        wktName: "Test Workout Z2",
        sport: Profile.types.sport.cycling,
        numValidSteps: 1
    });

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.WORKOUT_STEP,
        messageIndex: 0,
        workoutStepName: "Z2 Base",
        durationValue: 3600000, // 1 hour in ms?
        durationType: Profile.types.wktStepDuration.time,
        targetType: Profile.types.wktStepTarget.power,
        targetValue: 0,
        customTargetValueLow: 150,
        customTargetValueHigh: 200,
        intensity: Profile.types.intensity.active
    });

    const uint8Array = encoder.close();
    fs.writeFileSync("test.fit", uint8Array);
    console.log("Success! File saved as test.fit.");
} catch (e) {
    console.error("Error creating FIT file:", e);
}
