import { useState } from "react";
import { consumeSaveFeedback } from "../data/save-feedback";

export function SaveFeedback() {
  const [message] = useState(consumeSaveFeedback);
  return message ? <p className="save-feedback" role="status">{message}</p> : null;
}