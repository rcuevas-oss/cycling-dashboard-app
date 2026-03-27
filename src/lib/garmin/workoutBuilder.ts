import { Encoder, Profile } from "@garmin/fitsdk";

export type GarminTrainingBlock = {
  id: string;
  title: string;
  zone: string;
  d: string;
  color?: string;
  description?: string;
  status?: "planned" | "completed_full" | "completed_partial" | "missed";
  completionNotes?: string;
};

const GARMIN_TEXT_LIMIT = 15;

function truncateGarminText(value: string) {
  return value.trim().slice(0, GARMIN_TEXT_LIMIT);
}

function parseDurationToMilliseconds(durationLabel: string) {
  const normalized = durationLabel.toLowerCase();

  if (normalized.includes("min")) {
    const minutes = parseInt(normalized, 10);
    return Number.isFinite(minutes) ? minutes * 60 * 1000 : 60 * 60 * 1000;
  }

  if (normalized.includes("hr") || normalized.includes("hora")) {
    const match = normalized.match(/([\d.]+)/);
    if (match) {
      return parseFloat(match[1]) * 60 * 60 * 1000;
    }
  }

  return 60 * 60 * 1000;
}

function getPowerTargetsForZone(zone: string) {
  switch (zone) {
    case "Z1":
      return {
        lowPower: 50,
        highPower: 130,
        intensity: Profile.types.intensity.recovery,
      };
    case "Z2":
      return {
        lowPower: 130,
        highPower: 180,
        intensity: Profile.types.intensity.active,
      };
    case "Z3":
      return {
        lowPower: 180,
        highPower: 220,
        intensity: Profile.types.intensity.active,
      };
    case "Z4":
      return {
        lowPower: 220,
        highPower: 260,
        intensity: Profile.types.intensity.active,
      };
    case "Z5":
      return {
        lowPower: 260,
        highPower: 400,
        intensity: Profile.types.intensity.active,
      };
    default:
      return {
        lowPower: 100,
        highPower: 150,
        intensity: Profile.types.intensity.active,
      };
  }
}

export function generateGarminFitWorkout(workoutName: string, blocks: GarminTrainingBlock[]) {
  const encoder = new Encoder();

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.FILE_ID,
    type: Profile.types.file.workout,
    manufacturer: Profile.types.manufacturer.development,
    product: 1,
    timeCreated: new Date(),
    serialNumber: Math.floor(Math.random() * 100000),
  });

  encoder.writeMesg({
    mesgNum: Profile.MesgNum.WORKOUT,
    wktName: truncateGarminText(workoutName),
    sport: Profile.types.sport.cycling,
    numValidSteps: blocks.length,
  });

  blocks.forEach((block, index) => {
    const { lowPower, highPower, intensity } = getPowerTargetsForZone(block.zone);

    encoder.writeMesg({
      mesgNum: Profile.MesgNum.WORKOUT_STEP,
      messageIndex: index,
      wktStepName: truncateGarminText(block.title),
      durationValue: parseDurationToMilliseconds(block.d),
      durationType: Profile.types.wktStepDuration.time,
      targetType: Profile.types.wktStepTarget.power,
      targetValue: 0,
      customTargetValueLow: lowPower + 1000,
      customTargetValueHigh: highPower + 1000,
      intensity,
    });
  });

  const fileBytes = encoder.close();
  const blob = new Blob([fileBytes], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${workoutName.replace(/\s+/g, "_")}.fit`;
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export type TrainingBlock = GarminTrainingBlock;
export const generateFitWorkout = generateGarminFitWorkout;
