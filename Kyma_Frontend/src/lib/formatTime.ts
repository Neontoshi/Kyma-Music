export const formatTime = (seconds: number): string => {
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const parseDuration = (duration: string): number => {
  const parts = duration.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};
