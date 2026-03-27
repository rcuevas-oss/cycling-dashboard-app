import { ActivitySummary } from "./activityTypes";
import { calculatePMC, getDailyLoads } from "./metricsUtils";

type CoachActivity = ActivitySummary & {
  start_date: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate: number;
  max_heartrate: number;
  training_stress_score: number;
  intensity_factor?: number;
  average_watts: number;
  max_watts: number;
  average_cadence: number;
  raw_data: ActivitySummary;
};

function getActivityDate(activity: ActivitySummary) {
  return activity.activity_date || activity.start_date || activity.date || new Date().toISOString();
}

function getDurationSeconds(activity: ActivitySummary) {
  const directSeconds = Number(activity.moving_time || activity.elapsed_time || 0);
  if (directSeconds > 0) return directSeconds;

  const minutes = Number(activity.duration_minutes || activity.duration || 0);
  return minutes > 0 ? minutes * 60 : 0;
}

export function buildCoachActivityDataset(recentActivitiesData: ActivitySummary[] = []) {
  const today = new Date();
  let tss7d = 0;
  let mins7d = 0;

  const recentActivities: CoachActivity[] = recentActivitiesData.map((activity) => {
    const activityDate = getActivityDate(activity);
    const diffTime = Math.abs(today.getTime() - new Date(activityDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const durationSeconds = getDurationSeconds(activity);
    const durationMinutes = Number(activity.duration_minutes || activity.duration || durationSeconds / 60 || 0);
    const tss = Number(activity.training_stress_score || activity.tss || 0);

    if (diffDays <= 7) {
      tss7d += tss;
      mins7d += durationMinutes;
    }

    return {
      ...activity,
      activity_date: activityDate,
      duration_minutes: durationMinutes,
      start_date: activityDate,
      type: activity.type || activity.sport || "Ride",
      distance: Number(activity.distance || 0) || Number(activity.distance_km || 0) * 1000,
      moving_time: durationSeconds,
      elapsed_time: Number(activity.elapsed_time || 0) || durationSeconds,
      total_elevation_gain: Number(activity.total_elevation_gain || activity.ascenso_total || 0),
      average_speed: Number(activity.average_speed || 0),
      max_speed: Number(activity.max_speed || 0),
      average_heartrate: Number(activity.average_heartrate || activity.fc_media || 0),
      max_heartrate: Number(activity.max_heartrate || activity.fc_maxima || 0),
      training_stress_score: tss,
      intensity_factor: Number(activity.intensity_factor || activity.if || 0) || undefined,
      normalized_power: Number(activity.normalized_power || activity.np || 0),
      average_watts: Number(activity.average_watts || activity.average_power || activity.potencia_media || 0),
      max_watts: Number(activity.max_watts || activity.potencia_maxima || 0),
      average_cadence: Number(activity.cadencia_media || 0),
      raw_data: activity,
    };
  });

  const dailyLoads = getDailyLoads(recentActivities);
  const pmcData = calculatePMC(dailyLoads);
  const todayPMC = pmcData.results[pmcData.results.length - 1] || {
    ctlDisplayed: 0,
    atlDisplayed: 0,
    tsbDisplayed: 0,
  };

  return {
    recentActivities,
    loadSummary: {
      tss7d,
      volumenPromedio7dMins: Number((mins7d / 7).toFixed(0)),
      ctl: todayPMC.ctlDisplayed,
      atl: todayPMC.atlDisplayed,
      tsb: todayPMC.tsbDisplayed,
    },
  };
}
