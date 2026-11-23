import type { ToeicGroup, ToeicItem, ToeicPhoto, ToeicTest } from "./toeic";

/**
 * Compact source format of a TOEIC paper (TOEIC 2 onwards); the result has the same shape as TOEIC 1.
 *   # 1 … # 7            starts a part
 *   @ line // line        Parts 3, 4, 6, 7: the conversation / talk / text for the questions that follow
 *   question|right answer|wrong|wrong|(wrong|)explanation
 * Part 1: the "question" is the photo described in Vietnamese. Part 6: the question is left empty.
 */
export function parseToeic(id: string, title: string, src: string): ToeicTest {
  const t: ToeicTest = { id, title, part1: [], part2: [], part3: [], part4: [], part5: [], part6: [], part7: [] };
  let part = 0;
  let group: ToeicGroup | null = null;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line[0] === "#") {
      part = Number(line.slice(1));
      group = null;
      continue;
    }
    if (line[0] === "@") {
      group = { text: line.slice(1).split(" // ").map((x) => x.trim()), qs: [] };
      (t[`part${part}` as "part3"] as ToeicGroup[]).push(group);
      continue;
    }
    const f = line.split("|").map((x) => x.trim());
    if (f.length < 5) throw new Error(`toeic: bad line "${line}"`);
    const options = f.slice(1, -1);
    const explain = f[f.length - 1];
    if (part === 1) (t.part1 as ToeicPhoto[]).push({ scene: f[0], options, explain });
    else {
      const item: ToeicItem = f[0] ? { q: f[0], options, explain } : { options, explain };
      if (part === 2) t.part2.push(item);
      else if (part === 5) t.part5.push(item);
      else if (group) group.qs.push(item);
      else throw new Error(`toeic: question without a text: "${line}"`);
    }
  }
  return t;
}
