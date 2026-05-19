export function buildDiceBearAvatarUrl(seed: string, gender?: string | null) {
  const encodedSeed = encodeURIComponent(seed.trim() || "Admin");
  const normalizedGender = gender?.toUpperCase();
  const genderOptions =
    normalizedGender === "PEREMPUAN"
      ? "hair=full,pixie&earrings=stud,hoop&earringsProbability=70"
      : "hair=full,dougFunny,dannyPhantom,fonze&earringsProbability=0";

  return `https://api.dicebear.com/7.x/micah/svg?seed=${encodedSeed}&backgroundColor=f1f5f9&baseColor=f9c9b6,ecad80&${genderOptions}&hairProbability=100&hairColor=000000&eyesColor=000000&eyebrowsColor=000000&facialHairProbability=0`;
}
