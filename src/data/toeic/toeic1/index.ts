import type { ToeicTest } from "../../../lib/toeic";
import { part1, part2 } from "./part1-2";
import { part3 } from "./part3";
import { part4 } from "./part4";
import { part5, part6 } from "./part5-6";
import { part7 } from "./part7";

/** TOEIC 1 – original questions written for GreenPanda (not taken from any real TOEIC paper). */
const test: ToeicTest = {
  id: "toeic1",
  title: "TOEIC 1",
  part1,
  part2,
  part3,
  part4,
  part5,
  part6,
  part7,
};
export default test;
