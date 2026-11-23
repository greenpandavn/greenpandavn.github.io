import { parseToeic } from "../../../lib/toeicText";
import { listening } from "./listening";
import { reading } from "./reading";

/** TOEIC 3 – original questions written for GreenPanda (not taken from any real TOEIC paper). */
export default parseToeic("toeic3", "TOEIC 3", listening + reading);
