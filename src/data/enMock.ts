/**
 * Hand-written question banks for "Thi thử tiếng Anh": grammar and reading comprehension.
 * In every item the FIRST option is the right answer; the paper shuffles the options.
 */
import { GRAMMAR_HIGH, READING_HIGH } from './enMockHigh';

export interface GrammarItem {
  q: string; // sentence with a gap (___)
  options: string[];
  explain: string;
}
export interface ReadingItem {
  text: string;
  qs: { q: string; options: string[]; explain: string }[];
}

export const GRAMMAR: Record<number, GrammarItem[]> = {
  1: [
    { q: 'I ___ a student.', options: ['am', 'is', 'are'], explain: 'Chủ ngữ “I” đi với “am”.' },
    { q: 'She ___ my sister.', options: ['is', 'am', 'are'], explain: 'Chủ ngữ số ít “she” đi với “is”.' },
    { q: 'They ___ my friends.', options: ['are', 'is', 'am'], explain: 'Chủ ngữ số nhiều “they” đi với “are”.' },
    { q: 'He ___ to school every day.', options: ['goes', 'go', 'going'], explain: 'Thì hiện tại đơn: he/she/it + động từ thêm -s/-es → “goes”.' },
    { q: 'We ___ rice for lunch.', options: ['eat', 'eats', 'eating'], explain: 'Chủ ngữ “we” dùng động từ nguyên mẫu: “eat”.' },
    { q: '___ you like coffee?', options: ['Do', 'Does', 'Are'], explain: 'Câu hỏi thì hiện tại đơn với “you” dùng trợ động từ “Do”.' },
    { q: '___ she speak English?', options: ['Does', 'Do', 'Is'], explain: 'Câu hỏi thì hiện tại đơn với “she” dùng “Does”.' },
    { q: 'I ___ not like fish.', options: ['do', 'does', 'am'], explain: 'Phủ định thì hiện tại đơn với “I”: “do not”.' },
    { q: 'He ___ not have a car.', options: ['does', 'do', 'is'], explain: 'Phủ định với “he”: “does not” + động từ nguyên mẫu.' },
    { q: 'This is ___ apple.', options: ['an', 'a', 'two'], explain: '“apple” bắt đầu bằng nguyên âm nên dùng “an”.' },
    { q: 'I have ___ dog.', options: ['a', 'an', 'many'], explain: '“dog” bắt đầu bằng phụ âm nên dùng “a”.' },
    { q: 'There are three ___ on the table.', options: ['books', 'book', 'a book'], explain: 'Sau số đếm lớn hơn một dùng danh từ số nhiều: “books”.' },
    { q: 'This is my brother. ___ name is Nam.', options: ['His', 'Her', 'Their'], explain: 'Tính từ sở hữu của “he” là “his”.' },
    { q: 'That is my mother. ___ is a teacher.', options: ['She', 'He', 'They'], explain: '“my mother” là nữ, số ít → đại từ “she”.' },
    { q: 'The cat is ___ the table.', options: ['under', 'between', 'at'], explain: '“under the table” = dưới cái bàn; “between” cần hai vật, “at the table” = ngồi ở bàn.' },
    { q: 'I get up ___ six o’clock.', options: ['at', 'in', 'on'], explain: 'Giờ cụ thể dùng giới từ “at”.' },
    { q: 'We do not go to school ___ Sunday.', options: ['on', 'at', 'in'], explain: 'Thứ trong tuần dùng giới từ “on”.' },
    { q: '___ is your name?', options: ['What', 'Where', 'Who'], explain: 'Hỏi tên dùng “What”.' },
    { q: '___ do you live?', options: ['Where', 'What', 'Who'], explain: 'Hỏi nơi chốn dùng “Where”.' },
    { q: '___ old are you?', options: ['How', 'What', 'Why'], explain: 'Hỏi tuổi: “How old are you?”' },
    { q: 'How ___ brothers do you have?', options: ['many', 'much', 'old'], explain: 'Danh từ đếm được số nhiều dùng “How many”.' },
    { q: 'How ___ is this shirt?', options: ['much', 'many', 'long'], explain: 'Hỏi giá tiền dùng “How much”.' },
    { q: 'I ___ swim, but I cannot dance.', options: ['can', 'am', 'do'], explain: '“can” + động từ nguyên mẫu chỉ khả năng.' },
    { q: 'She ___ gets up early. She is never late.', options: ['always', 'never', 'sometimes'], explain: '“never late” (không bao giờ muộn) → cô ấy “always” (luôn luôn) dậy sớm.' },
    { q: 'I like tea, ___ I do not like coffee.', options: ['but', 'because', 'or'], explain: 'Hai ý trái ngược nối bằng “but”.' },
    { q: 'I am tired ___ I work a lot.', options: ['because', 'but', 'or'], explain: 'Nêu lý do dùng “because”.' },
    { q: '___ are my shoes.', options: ['These', 'This', 'That'], explain: 'Danh từ số nhiều “shoes” dùng “These”.' },
    { q: 'My father ___ a new phone.', options: ['has', 'have', 'is'], explain: 'Chủ ngữ số ít “my father” dùng “has”.' },
    { q: 'They ___ in Hanoi.', options: ['live', 'lives', 'living'], explain: 'Chủ ngữ “they” dùng động từ nguyên mẫu: “live”.' },
    { q: 'The book is ___ the bag.', options: ['in', 'at', 'to'], explain: '“in the bag” = ở trong túi.' },
  ],
  2: [
    { q: 'I ___ to the beach last weekend.', options: ['went', 'go', 'have gone'], explain: '“last weekend” là thời điểm quá khứ xác định → thì quá khứ đơn “went”.' },
    { q: 'She ___ a cake yesterday.', options: ['made', 'makes', 'has made'], explain: '“yesterday” → thì quá khứ đơn “made”.' },
    { q: '___ you see the movie last night?', options: ['Did', 'Do', 'Have'], explain: 'Câu hỏi thì quá khứ đơn dùng trợ động từ “Did”.' },
    { q: 'He did not ___ to the party.', options: ['come', 'came', 'comes'], explain: 'Sau “did not” dùng động từ nguyên mẫu: “come”.' },
    { q: 'I have ___ to Hue twice.', options: ['been', 'went', 'be'], explain: 'Thì hiện tại hoàn thành: have + phân từ hai → “been”.' },
    { q: 'Have you ___ seen snow?', options: ['ever', 'yet', 'ago'], explain: '“Have you ever …?” hỏi về trải nghiệm.' },
    { q: 'She has not finished her homework ___.', options: ['yet', 'already', 'ago'], explain: '“yet” đứng cuối câu phủ định của thì hiện tại hoàn thành.' },
    { q: 'I have lived here ___ 2020.', options: ['since', 'for', 'ago'], explain: '“since” + mốc thời gian (2020); “for” + khoảng thời gian.' },
    { q: 'We met two years ___.', options: ['ago', 'since', 'last'], explain: 'Khoảng thời gian + “ago” = cách đây.' },
    { q: 'I ___ call you tomorrow.', options: ['will', 'did', 'was'], explain: '“tomorrow” → thì tương lai với “will”.' },
    { q: 'Look at the clouds! It is ___ rain.', options: ['going to', 'will to', 'go to'], explain: 'Dự đoán có căn cứ ở hiện tại dùng “be going to”.' },
    { q: 'My brother is ___ than me.', options: ['taller', 'tall', 'tallest'], explain: 'So sánh hơn của tính từ ngắn: tính từ + -er + than.' },
    { q: 'This bag is ___ expensive than that one.', options: ['more', 'most', 'much'], explain: 'So sánh hơn của tính từ dài: more + tính từ + than.' },
    { q: 'She is the ___ student in the class.', options: ['best', 'better', 'good'], explain: 'So sánh nhất của “good” là “the best”.' },
    { q: 'Today the weather is ___ than yesterday.', options: ['worse', 'bad', 'worst'], explain: 'So sánh hơn của “bad” là “worse”.' },
    { q: 'You ___ see a doctor. You look sick.', options: ['should', 'might not', 'would'], explain: 'Đưa ra lời khuyên dùng “should”.' },
    { q: 'You ___ wear a helmet on a motorbike. It is the law.', options: ['must', 'might', 'could'], explain: 'Điều bắt buộc theo luật dùng “must”.' },
    { q: '___ you open the window, please?', options: ['Could', 'Should', 'Must'], explain: 'Lời nhờ lịch sự dùng “Could you …?”' },
    { q: 'It ___ rain later, so take an umbrella.', options: ['might', 'must not', 'did'], explain: '“might” diễn tả khả năng có thể xảy ra.' },
    { q: 'If it rains, we ___ stay at home.', options: ['will', 'did', 'were'], explain: 'Câu điều kiện loại 1: If + hiện tại đơn, will + động từ.' },
    { q: 'I will go ___ it rains.', options: ['unless', 'so', 'because'], explain: '“unless” = trừ khi.' },
    { q: '___ it rained, we went out.', options: ['Although', 'Because', 'So'], explain: 'Hai ý tương phản trong một câu dùng “Although”.' },
    { q: 'I was tired, ___ I went to bed early.', options: ['so', 'although', 'unless'], explain: '“so” nối nguyên nhân với kết quả.' },
    { q: 'She sings ___ she cooks.', options: ['while', 'unless', 'however'], explain: '“while” = trong khi, hai việc diễn ra cùng lúc.' },
    { q: 'I would like ___ a cup of tea.', options: ['to have', 'have', 'having'], explain: '“would like” + to + động từ nguyên mẫu.' },
    { q: 'He is good ___ basketball.', options: ['at', 'in', 'on'], explain: 'Cụm cố định: “be good at”.' },
    { q: 'They ___ very happy at the party last night.', options: ['were', 'was', 'are'], explain: 'Quá khứ của “are” là “were”; “last night” là quá khứ.' },
    { q: 'I ___ at home yesterday.', options: ['was', 'were', 'am'], explain: 'Quá khứ của “am” là “was”.' },
    { q: 'We have ___ food for everyone.', options: ['enough', 'quite', 'almost'], explain: '“enough” + danh từ = đủ.' },
    { q: '___ of my parents are teachers.', options: ['Both', 'Either', 'Neither'], explain: 'Động từ số nhiều “are” → “Both of …” (cả hai).' },
    { q: 'I prefer tea ___ coffee.', options: ['to', 'than', 'from'], explain: 'Cấu trúc: prefer A to B.' },
    { q: 'She has ___ left. You can still see her car.', options: ['just', 'yet', 'ever'], explain: '“just” = vừa mới, đứng giữa have/has và phân từ hai.' },
    { q: 'I have to ___ up early tomorrow.', options: ['get', 'got', 'getting'], explain: '“have to” + động từ nguyên mẫu.' },
    { q: 'My parents do not allow me ___ out late.', options: ['to go', 'go', 'going'], explain: 'Cấu trúc: allow someone to do something.' },
    { q: 'What ___ you do if you fail the exam?', options: ['will', 'did', 'have'], explain: 'Câu điều kiện loại 1: mệnh đề chính dùng “will”.' },
  ],
  ...GRAMMAR_HIGH,
};

export const READING: Record<number, ReadingItem[]> = {
  1: [
    {
      text: 'My name is Lan. I am ten years old. I live in Hanoi with my father, my mother and my brother. My father is a doctor and my mother is a teacher. I have a small cat. It is white.',
      qs: [
        { q: 'How old is Lan?', options: ['Ten years old', 'Nine years old', 'Twelve years old'], explain: 'Trong bài: “I am ten years old.”' },
        { q: 'What is her mother’s job?', options: ['A teacher', 'A doctor', 'A nurse'], explain: 'Trong bài: “my mother is a teacher”; bố mới là bác sĩ.' },
        { q: 'What color is the cat?', options: ['White', 'Black', 'Brown'], explain: 'Trong bài: “It is white.”' },
      ],
    },
    {
      text: 'Every day Nam gets up at six. He eats bread and eggs for breakfast. He goes to school by bike. School starts at seven. In the afternoon he plays football with his friends. He does his homework in the evening.',
      qs: [
        { q: 'What time does Nam get up?', options: ['At six', 'At seven', 'At five'], explain: 'Trong bài: “Nam gets up at six.” Bảy giờ là giờ vào học.' },
        { q: 'How does he go to school?', options: ['By bike', 'By bus', 'By car'], explain: 'Trong bài: “He goes to school by bike.”' },
        { q: 'When does he do his homework?', options: ['In the evening', 'In the morning', 'In the afternoon'], explain: 'Trong bài: “He does his homework in the evening.” Buổi chiều cậu ấy đá bóng.' },
      ],
    },
    {
      text: 'This is my house. It is small but beautiful. There are two bedrooms, a kitchen and a bathroom. There is a garden behind the house. My mother loves flowers, so there are many flowers in the garden. We often eat dinner there in summer.',
      qs: [
        { q: 'How many bedrooms are there?', options: ['Two', 'Three', 'One'], explain: 'Trong bài: “There are two bedrooms.”' },
        { q: 'Where is the garden?', options: ['Behind the house', 'In front of the house', 'Next to the kitchen'], explain: 'Trong bài: “There is a garden behind the house.”' },
        { q: 'Why are there many flowers?', options: ['Because the mother loves flowers', 'Because the house is small', 'Because it is summer'], explain: 'Trong bài: “My mother loves flowers, so there are many flowers.”' },
      ],
    },
    {
      text: 'Today is Sunday. The weather is hot and sunny. Mai and her sister go to the market. They buy fish, vegetables and some fruit. The apples are cheap, but the oranges are expensive. They do not buy oranges. They go home at ten.',
      qs: [
        { q: 'What is the weather like?', options: ['Hot and sunny', 'Cold and rainy', 'Warm and windy'], explain: 'Trong bài: “The weather is hot and sunny.”' },
        { q: 'Who goes to the market with Mai?', options: ['Her sister', 'Her mother', 'Her friend'], explain: 'Trong bài: “Mai and her sister go to the market.”' },
        { q: 'Why do they not buy oranges?', options: ['Because the oranges are expensive', 'Because they do not like oranges', 'Because there are no oranges'], explain: 'Trong bài: “the oranges are expensive. They do not buy oranges.”' },
      ],
    },
    {
      text: 'Tom is from England. He is a student in Vietnam. He likes Vietnamese food very much. He eats rice every day and he loves chicken soup. He can speak Vietnamese, but he cannot write it. On the weekend he swims and listens to music.',
      qs: [
        { q: 'Where is Tom from?', options: ['England', 'Vietnam', 'America'], explain: 'Trong bài: “Tom is from England.” Anh ấy đang học ở Việt Nam.' },
        { q: 'What can Tom NOT do?', options: ['Write Vietnamese', 'Speak Vietnamese', 'Swim'], explain: 'Trong bài: “He can speak Vietnamese, but he cannot write it.”' },
        { q: 'What does he do on the weekend?', options: ['He swims and listens to music', 'He cooks chicken soup', 'He plays football'], explain: 'Trong bài: “On the weekend he swims and listens to music.”' },
      ],
    },
    {
      text: 'My school is near my house. I walk to school every morning. My class has thirty students. Our English teacher is Mr. Binh. He is tall and very kind. We have English on Monday and Thursday. I like English because it is easy for me.',
      qs: [
        { q: 'How does the writer go to school?', options: ['On foot', 'By bus', 'By bike'], explain: 'Trong bài: “I walk to school every morning.”' },
        { q: 'How many students are in the class?', options: ['Thirty', 'Thirteen', 'Twenty'], explain: 'Trong bài: “My class has thirty students.”' },
        { q: 'When do they have English?', options: ['On Monday and Thursday', 'On Tuesday and Friday', 'Every day'], explain: 'Trong bài: “We have English on Monday and Thursday.”' },
      ],
    },
  ],
  2: [
    {
      text: 'Last summer my family traveled to Da Nang. We took an early flight and arrived at nine in the morning. We stayed at a small hotel near the beach for five days. The weather was hot, so we swam every afternoon. On the last day we visited a museum and bought some gifts. It was the best trip I have ever had.',
      qs: [
        { q: 'How did the family travel to Da Nang?', options: ['By plane', 'By train', 'By car'], explain: 'Trong bài: “We took an early flight.”' },
        { q: 'How long did they stay?', options: ['Five days', 'Nine days', 'A week'], explain: 'Trong bài: “We stayed … for five days.” Chín giờ là giờ đến nơi.' },
        { q: 'Why did they swim every afternoon?', options: ['Because the weather was hot', 'Because the hotel was small', 'Because the museum was closed'], explain: 'Trong bài: “The weather was hot, so we swam every afternoon.”' },
        { q: 'What did they do on the last day?', options: ['They visited a museum and bought gifts', 'They swam in the sea', 'They took an early flight'], explain: 'Trong bài: “On the last day we visited a museum and bought some gifts.”' },
      ],
    },
    {
      text: 'Hoa works for a big company in the city. She is a manager and has a lot of experience. She usually starts work at eight, but today she had an important meeting at seven. The traffic was terrible, so she left her motorbike at home and took a taxi instead. Although she was nervous, the meeting went well and her boss was proud of her.',
      qs: [
        { q: 'What is Hoa’s job?', options: ['A manager', 'A taxi driver', 'An engineer'], explain: 'Trong bài: “She is a manager.”' },
        { q: 'Why was today different?', options: ['She had a meeting at seven', 'She started work at eight', 'She changed her job'], explain: 'Trong bài: “today she had an important meeting at seven.”' },
        { q: 'How did she get to work today?', options: ['By taxi', 'By motorbike', 'By bus'], explain: 'Trong bài: “she left her motorbike at home and took a taxi instead.”' },
        { q: 'How did the meeting go?', options: ['It went well', 'It was cancelled', 'It went badly because she was nervous'], explain: 'Trong bài: “Although she was nervous, the meeting went well.”' },
      ],
    },
    {
      text: 'Many people want to protect the environment, but they do not know where to start. Small changes can help. First, use less plastic: bring your own bag when you go shopping. Second, save energy by turning off lights and computers. Third, recycle paper and bottles instead of throwing them in the trash. If everyone makes an effort, our cities will be cleaner and the air will be fresher.',
      qs: [
        { q: 'What is the main idea of the text?', options: ['Small changes can help the environment', 'Shopping is bad for the environment', 'Cities are cleaner than before'], explain: 'Ý chính: “Small changes can help.” Bài nêu ba việc nhỏ ai cũng làm được.' },
        { q: 'What should you bring when you go shopping?', options: ['Your own bag', 'A plastic bottle', 'Some paper'], explain: 'Trong bài: “bring your own bag when you go shopping.”' },
        { q: 'How can you save energy?', options: ['By turning off lights and computers', 'By recycling bottles', 'By using less plastic'], explain: 'Trong bài: “save energy by turning off lights and computers.”' },
        { q: 'What will happen if everyone makes an effort?', options: ['Cities will be cleaner', 'There will be more trash', 'People will shop more'], explain: 'Trong bài: “our cities will be cleaner and the air will be fresher.”' },
      ],
    },
    {
      text: 'Minh has studied English for three years. At first he was shy and afraid of making mistakes, so he almost never spoke in class. Then his teacher gave him some advice: “Practice a little every day and do not worry about mistakes.” Minh began to watch English videos and talk with friends online. His speaking has improved a lot. Next year he hopes to pass an important exam and study at a university abroad.',
      qs: [
        { q: 'Why did Minh almost never speak in class at first?', options: ['He was afraid of making mistakes', 'He did not like his teacher', 'He had no time to practice'], explain: 'Trong bài: “he was shy and afraid of making mistakes, so he almost never spoke in class.”' },
        { q: 'What advice did the teacher give?', options: ['Practice a little every day', 'Study only before exams', 'Stop watching videos'], explain: 'Trong bài: “Practice a little every day and do not worry about mistakes.”' },
        { q: 'How did Minh practice?', options: ['He watched videos and talked with friends online', 'He read newspapers every day', 'He traveled abroad'], explain: 'Trong bài: “Minh began to watch English videos and talk with friends online.”' },
        { q: 'What does Minh hope to do next year?', options: ['Pass an exam and study abroad', 'Become an English teacher', 'Study English for three more years'], explain: 'Trong bài: “he hopes to pass an important exam and study at a university abroad.”' },
      ],
    },
    {
      text: 'Shopping online is becoming more popular than going to the store. It is fast, and customers can compare prices easily. Many websites also give a discount if you order a lot. However, there are some problems. You cannot try on clothes, and sometimes the quality is worse than in the photo. If you are not happy, you may have to pay to return the product. Therefore, it is a good idea to read other customers’ opinions before you buy.',
      qs: [
        { q: 'What is one advantage of shopping online?', options: ['You can compare prices easily', 'You can try on clothes', 'Returning products is always free'], explain: 'Trong bài: “customers can compare prices easily.”' },
        { q: 'When do many websites give a discount?', options: ['When you order a lot', 'When you return a product', 'When you pay in cash'], explain: 'Trong bài: “Many websites also give a discount if you order a lot.”' },
        { q: 'What problem does the writer mention?', options: ['The quality can be worse than in the photo', 'The websites are slow', 'The prices are always higher'], explain: 'Trong bài: “sometimes the quality is worse than in the photo.”' },
        { q: 'What does the writer suggest?', options: ['Read other customers’ opinions before buying', 'Never shop online', 'Always buy the cheapest product'], explain: 'Trong bài: “it is a good idea to read other customers’ opinions before you buy.”' },
      ],
    },
    {
      text: 'My grandfather is seventy, but he is healthier than many young people. He gets up at five and exercises in the park for an hour. He eats fresh vegetables and fish, and he never eats too much. He has not had a fever or a bad cough for years. When I asked him for his secret, he smiled and said, “Stay calm, sleep enough, and walk instead of taking the motorbike.”',
      qs: [
        { q: 'How long does the grandfather exercise every morning?', options: ['For an hour', 'For five hours', 'For half an hour'], explain: 'Trong bài: “exercises in the park for an hour.” Năm giờ là giờ ông thức dậy.' },
        { q: 'What does he eat?', options: ['Fresh vegetables and fish', 'A lot of meat', 'Sweet desserts'], explain: 'Trong bài: “He eats fresh vegetables and fish.”' },
        { q: 'Which sentence is true?', options: ['He has been healthy for years', 'He often has a fever', 'He eats too much'], explain: 'Trong bài: “He has not had a fever or a bad cough for years.”' },
        { q: 'What is NOT part of his secret?', options: ['Taking the motorbike', 'Staying calm', 'Sleeping enough'], explain: 'Ông khuyên “walk instead of taking the motorbike” – đi bộ thay vì đi xe máy.' },
      ],
    },
  ],
  ...READING_HIGH,
};
