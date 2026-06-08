"use client";
//Page should Ideally be to allow users to customize the AI to their Use cases
import Image from "next/image";
import { Montserrat } from "next/font/google";
const montHeading = Montserrat({ subsets: ["latin"], weight: ["600","700"] });

import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";

export default function App() {
  return (
    <ConversationProvider>
      <Agent />
    </ConversationProvider>
  );
}

function Agent() {
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  if (status === "connected") {
    return <button onClick={endSession}>End</button>;
  }

  return (
    <button onClick={() => startSession({ agentId: "agent_5901ktg9mv8cfswb15kjt9q5rpey" })}>
      Start
    </button>
  );
}
