let saveFeedback: string | null = null;

export function setSaveFeedback(message: string) {
  saveFeedback = message;
}

export function consumeSaveFeedback() {
  const message = saveFeedback;
  saveFeedback = null;
  return message;
}