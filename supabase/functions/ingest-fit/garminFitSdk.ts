import { Decoder, Stream } from "npm:@garmin/fitsdk";
import { buildGarminFitIngestPayload } from "../../../src/lib/garmin/fitNormalizer.ts";
import { GarminFitDecodedMessages, GarminFitFileDescriptor, GarminFitIngestPayload } from "../../../src/lib/garmin/fitTypes.ts";

export function decodeGarminFitMessagesWithOfficialSdk(arrayBuffer: ArrayBuffer): GarminFitDecodedMessages {
  const stream = Stream.fromBuffer(new Uint8Array(arrayBuffer));
  const decoder = new Decoder(stream);
  const { messages } = decoder.read();

  return messages as GarminFitDecodedMessages;
}

export function buildGarminFitIngestPayloadWithOfficialSdk(
  arrayBuffer: ArrayBuffer,
  descriptor: GarminFitFileDescriptor,
): GarminFitIngestPayload {
  const messages = decodeGarminFitMessagesWithOfficialSdk(arrayBuffer);
  return buildGarminFitIngestPayload(messages, descriptor);
}
