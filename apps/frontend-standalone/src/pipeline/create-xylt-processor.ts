import { GlobalState } from "~/lib/state";
import {
  createXyltProcessorService,
  XyltProcessorService,
} from "~/services/xylt_processor";

export interface XyltProcessorState {
  service: XyltProcessorService | null;
  status: "loading" | "success" | "error";
  error?: string;
}

export async function createXYLTProcessor(state: GlobalState) {
  const { setXyltProcessor } = state;

  setXyltProcessor({
    service: null,
    status: "loading",
  });

  try {
    const service = createXyltProcessorService();
    await service.initialize();
    setXyltProcessor({ service, status: "success" });
  } catch (error) {
    setXyltProcessor({
      service: null,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
