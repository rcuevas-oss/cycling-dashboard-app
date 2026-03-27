import { Decoder, Stream } from "@garmin/fitsdk";
import { buildGarminFitPreview } from "./fitNormalizer.ts";
import { GarminFitDecodedMessages, GarminFitPreviewData } from "./fitTypes.ts";

export function decodeGarminFitMessagesWithOfficialSdk(arrayBuffer: ArrayBuffer): GarminFitDecodedMessages {
  const stream = Stream.fromBuffer(new Uint8Array(arrayBuffer));
  const decoder = new Decoder(stream);
  const { messages } = decoder.read();

  return messages as GarminFitDecodedMessages;
}

export function parseGarminFitPreviewWithOfficialSdk(
  arrayBuffer: ArrayBuffer,
  originalFilename: string,
): GarminFitPreviewData {
  const messages = decodeGarminFitMessagesWithOfficialSdk(arrayBuffer);
  return buildGarminFitPreview(messages, originalFilename);
}
