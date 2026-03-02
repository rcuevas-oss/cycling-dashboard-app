import { Profile } from "@garmin/fitsdk";
const keys = Object.keys(Profile.types).filter(k => k.toLowerCase().includes('step'));
console.log(keys);
for (const k of keys) {
    console.log(k, Profile.types[k]);
}

const wktKeys = Object.keys(Profile.types).filter(k => k.toLowerCase().includes('wkt'));
for (const k of wktKeys) {
    console.log(k, Profile.types[k]);
}
