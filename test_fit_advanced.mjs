import { Encoder, Decoder, Profile, Stream } from "@garmin/fitsdk";
import * as fs from "fs";

function generateTestFitWorkout() {
    const encoder = new Encoder();

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.FILE_ID,
        type: Profile.types.file.workout,
        manufacturer: Profile.types.manufacturer.development,
        product: 1,
        timeCreated: new Date(),
        serialNumber: 123456
    });

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.WORKOUT,
        wktName: "TestWkt",
        sport: Profile.types.sport.cycling,
        numValidSteps: 1
    });

    encoder.writeMesg({
        mesgNum: Profile.MesgNum.WORKOUT_STEP,
        messageIndex: 0,
        workoutStepName: "Z1",
        wktStepType: Profile.types.wktStep.active,
        durationValue: 60000, // 1 min
        durationType: Profile.types.wktStepDuration.time,
        targetType: Profile.types.wktStepTarget.power,
        targetValue: 0,
        customTargetValueLow: 150 + 1000,
        customTargetValueHigh: 200 + 1000,
        intensity: Profile.types.intensity.active
    });

    const fileBytes = encoder.close();
    fs.writeFileSync("test.fit", fileBytes);

    // Now decode to test
    const buf = fs.readFileSync("test.fit");
    const stream = Stream.fromBuffer(buf);
    const decoder = new Decoder(stream);
    const { messages, errors } = decoder.read();
    console.log("Errors: ", errors);
    console.log("Messages FileId: ", messages.fileIdMesgs);
    console.log("Messages Workout: ", messages.workoutMesgs);
    console.log("Messages WorkoutStep: ", messages.workoutStepMesgs);
}

generateTestFitWorkout();
