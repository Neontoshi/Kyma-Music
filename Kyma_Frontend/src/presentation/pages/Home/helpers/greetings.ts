// Kyma_Frontend/src/presentation/pages/Home/helpers/greetings.ts
function getGreeting(): { text: string; period: string } {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", period: "morning" };
  if (h < 17) return { text: "Good afternoon", period: "afternoon" };
  return { text: "Good evening", period: "evening" };
}

function getMood(hour: number): "energetic" | "chill" | "focus" {
  if (hour >= 6 && hour < 12) return "energetic";
  if (hour >= 20 || hour < 4) return "chill";
  return "focus";
}

export { getGreeting, getMood };
