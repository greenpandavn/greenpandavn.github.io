import { parseToeic } from "../../../lib/toeicText";
import { listening } from "./listening";
import { reading } from "./reading";

/** TOEIC 2 – original questions written for GreenPanda (not taken from any real TOEIC paper). */
export default parseToeic("toeic2", "TOEIC 2", listening + reading);
