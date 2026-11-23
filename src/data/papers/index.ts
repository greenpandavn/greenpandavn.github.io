import type { PaperMeta } from "../../lib/paper";

/**
 * English papers written by hand (not generated from the vocabulary). The texts are lazily loaded chunks.
 * The counts below are checked against the texts by a unit test.
 */
const cefr = (lv: string, desc: string, minutes: number): PaperMeta => ({
  id: `cefr-${lv.toLowerCase()}`,
  group: "cefr",
  title: `CEFR ${lv}`,
  desc,
  minutes,
  pass: 180,
  counts: [
    ["vocab", 15],
    ["grammar", 15],
    ["reading", 10],
  ],
});
const partTest = (n: number, name: string): PaperMeta => ({
  id: `pt${n}`,
  group: "part",
  title: `Kiểm tra Phần ${n}`,
  desc: `Từ vựng và ngữ pháp của Phần ${n}: ${name}`,
  part: `Sơ cấp · Phần ${n}`,
  minutes: 15,
  pass: 160,
  counts: [
    ["vocab", 10],
    ["grammar", 10],
  ],
});

export const PLACEMENT: PaperMeta = {
  id: "placement",
  group: "placement",
  title: "Kiểm tra trình độ đầu vào",
  desc: "Câu hỏi từ dễ đến khó, xếp trình độ A1–C1 để bạn biết nên bắt đầu từ cấp nào.",
  minutes: 35,
  pass: 150,
  counts: [
    ["vocab", 14],
    ["grammar", 18],
    ["reading", 10],
  ],
  bands: [
    [0, "A1"],
    [12, "A2"],
    [20, "B1"],
    [29, "B2"],
    [37, "C1"],
  ],
};
/** Where to start in the course for each placement result. */
export const BAND_ADVICE: Record<string, string> = {
  A1: "Hãy bắt đầu từ cấp Sơ cấp, Phần 1.",
  A2: "Bạn có thể học nhanh cấp Sơ cấp rồi sang Trung cấp.",
  B1: "Cấp Trung cấp và Nâng cao phù hợp với bạn.",
  B2: "Cấp Nâng cao và Thành thạo phù hợp với bạn.",
  C1: "Cấp Thành thạo và Chuyên sâu phù hợp với bạn.",
};

export const CEFR_PAPERS: PaperMeta[] = [
  cefr("A1", "Người mới bắt đầu", 40),
  cefr("A2", "Sơ cấp", 45),
  cefr("B1", "Trung cấp", 50),
  cefr("B2", "Trung cao cấp", 55),
  cefr("C1", "Cao cấp", 60),
];
export const PART_TESTS: PaperMeta[] = [
  partTest(1, "Làm quen"),
  partTest(2, "Cuộc sống hằng ngày"),
  partTest(3, "Thế giới quanh ta"),
];

const texts = (m: PaperMeta) =>
  m.group === "cefr"
    ? import("./cefr").then((x) => x.PAPERS)
    : import("./tests").then((x) => x.PAPERS);
export const loadPaper = (m: PaperMeta) => texts(m).then((t) => t[m.id]);

/** Listening practice: every lesson is a short paper with one "Nghe" section. */
export async function loadListening(): Promise<{ meta: PaperMeta; src: string }[]> {
  const { LISTENING } = await import("./listening");
  return LISTENING.split(/^= /m)
    .slice(1)
    .map((block, i) => {
      const [head, ...rest] = block.split("\n");
      const [title, part] = head.split("|").map((x) => x.trim());
      const src = `# listening\n${rest.join("\n")}`;
      return {
        meta: {
          id: `ls${String(i + 1).padStart(2, "0")}`,
          group: "listening" as const,
          title,
          desc: "",
          part,
          minutes: 5,
          pass: 60,
          counts: [["listening", src.split("\n").filter((l) => l.includes("|")).length]],
        },
        src,
      };
    });
}
export const LISTENING_COUNT = 25;
