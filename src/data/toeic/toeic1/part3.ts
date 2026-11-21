import type { ToeicGroup } from '../../../lib/toeic';

export const part3: ToeicGroup[] = [
  {
    text: [
      'W: Hi, Daniel. Did you get my message about the client visit on Thursday?',
      'M: I did. I have already booked the large meeting room from two to four.',
      'W: Great. Could you also ask the cafeteria to prepare coffee and snacks for eight people?',
      'M: Sure. I will call them right after lunch.',
    ],
    qs: [
      { q: 'What are the speakers preparing for?', options: ['A client visit', 'A job interview', 'A staff party', 'A training course'], explain: 'Người phụ nữ nhắc đến “the client visit on Thursday”.' },
      { q: 'What has the man already done?', options: ['Booked a meeting room', 'Ordered snacks', 'Called the client', 'Printed the agenda'], explain: 'Người đàn ông nói: “I have already booked the large meeting room”.' },
      { q: 'What will the man do after lunch?', options: ['Call the cafeteria', 'Visit the client', 'Clean the room', 'Send a message'], explain: 'Anh ấy nói: “I will call them right after lunch” – “them” là căng tin.' },
    ],
  },
  {
    text: [
      'M: Good morning. I bought this printer here last week, but it keeps jamming.',
      'W: I am sorry to hear that. Do you have your receipt with you?',
      'M: Yes, here it is. I would prefer a replacement rather than a refund.',
      'W: No problem. We have the same model in stock. Let me get one from the back.',
    ],
    qs: [
      { q: 'Where does the conversation most likely take place?', options: ['At an electronics store', 'At a post office', 'At a library', 'At a bank'], explain: 'Người đàn ông mang trả máy in đã mua “here last week” → cửa hàng điện máy.' },
      { q: 'What is the problem with the printer?', options: ['It keeps jamming.', 'It is too slow.', 'It is the wrong color.', 'It makes a loud noise.'], explain: 'Anh ấy nói: “it keeps jamming” (liên tục kẹt giấy).' },
      { q: 'What does the man want?', options: ['A replacement', 'A refund', 'A discount', 'A repair'], explain: '“I would prefer a replacement rather than a refund.”' },
    ],
  },
  {
    text: [
      'W: Kevin, the quarterly report is due tomorrow, and I am still waiting for the sales figures.',
      'M: Sorry about that. The regional offices sent their numbers late. I can have everything ready by three this afternoon.',
      'W: That works. Please send the file directly to me and copy the finance team.',
      'M: Will do. I will also add a short summary on the first page.',
    ],
    qs: [
      { q: 'What is the woman waiting for?', options: ['Sales figures', 'A travel ticket', 'A job application', 'A price list'], explain: '“I am still waiting for the sales figures.”' },
      { q: 'Why is the man late?', options: ['The regional offices sent their numbers late.', 'His computer broke down.', 'He was on vacation.', 'He forgot the deadline.'], explain: '“The regional offices sent their numbers late.”' },
      { q: 'What does the man offer to add?', options: ['A short summary', 'A new chart', 'A price quotation', 'A cover letter'], explain: '“I will also add a short summary on the first page.”' },
    ],
  },
  {
    text: [
      'M: Hello, I would like to reserve a table for a business dinner this Friday. There will be twelve of us.',
      'W: Certainly. For a group that size, I recommend our private dining room. It is available from seven.',
      'M: Perfect. Two of my guests are vegetarian. Is that a problem?',
      'W: Not at all. Our chef can prepare a special menu. May I have your name and phone number?',
    ],
    qs: [
      { q: 'Why is the man calling?', options: ['To reserve a table', 'To cancel an order', 'To apply for a job', 'To complain about a meal'], explain: '“I would like to reserve a table for a business dinner.”' },
      { q: 'What does the woman recommend?', options: ['The private dining room', 'A table by the window', 'An earlier time', 'A different restaurant'], explain: '“I recommend our private dining room.”' },
      { q: 'What does the man mention about his guests?', options: ['Two of them are vegetarian.', 'They will arrive late.', 'They are from overseas.', 'They need parking spaces.'], explain: '“Two of my guests are vegetarian.”' },
    ],
  },
  {
    text: [
      'W: Have you heard that the company is moving to a new office downtown?',
      'M: Yes, in September. I am a bit worried because my commute will be much longer.',
      'W: The good news is that the building is right next to the subway station.',
      'M: Really? Then I might stop driving and take the train instead.',
    ],
    qs: [
      { q: 'What are the speakers discussing?', options: ['An office relocation', 'A new company car', 'A subway accident', 'A holiday schedule'], explain: 'Họ nói về việc công ty “moving to a new office downtown”.' },
      { q: 'Why is the man worried?', options: ['His commute will be longer.', 'His rent will go up.', 'He may lose his job.', 'The office is too small.'], explain: '“my commute will be much longer”.' },
      { q: 'What will the man probably do?', options: ['Take the train', 'Buy a new car', 'Work from home', 'Move downtown'], explain: '“I might stop driving and take the train instead.”' },
    ],
  },
  {
    text: [
      'M: Thank you for coming in today, Ms. Nguyen. Can you tell me about your experience in customer service?',
      'W: Of course. I worked at a call center for four years, and for the last two I led a team of ten agents.',
      'M: Impressive. This position requires some weekend shifts. Would that be a problem?',
      'W: Not at all. My schedule is quite flexible.',
    ],
    qs: [
      { q: 'What type of conversation is this?', options: ['A job interview', 'A sales call', 'A performance review', 'A customer complaint'], explain: 'Người đàn ông hỏi về kinh nghiệm và yêu cầu của “this position” → phỏng vấn xin việc.' },
      { q: 'How long did the woman work at a call center?', options: ['Four years', 'Two years', 'Ten years', 'Six months'], explain: '“I worked at a call center for four years.”' },
      { q: 'What does the position require?', options: ['Some weekend shifts', 'A driving license', 'Frequent travel abroad', 'A foreign language'], explain: '“This position requires some weekend shifts.”' },
    ],
  },
  {
    text: [
      'W: Excuse me, I am trying to get to the convention center. Does this bus go there?',
      'M: No, this one goes to the airport. You need bus number fifteen across the street.',
      'W: Thanks. Do you know how long the ride takes?',
      'M: About twenty minutes, but buses come only every half hour, so you may want to take a taxi if you are in a hurry.',
    ],
    qs: [
      { q: 'Where does the woman want to go?', options: ['To the convention center', 'To the airport', 'To a taxi stand', 'To a hotel'], explain: '“I am trying to get to the convention center.”' },
      { q: 'Which bus should the woman take?', options: ['Number fifteen', 'Number five', 'Number twenty', 'Number thirty'], explain: '“You need bus number fifteen across the street.”' },
      { q: 'Why does the man suggest a taxi?', options: ['Buses come only every half hour.', 'The bus is too expensive.', 'The road is closed.', 'The bus stop is far away.'], explain: '“buses come only every half hour, so you may want to take a taxi if you are in a hurry”.' },
    ],
  },
  {
    text: [
      'M: Linda, the projector in room B is not working again, and I have a presentation in fifteen minutes.',
      'W: The technician is out until this afternoon. Why don’t you use room D? It has a large screen.',
      'M: Is it free right now?',
      'W: Let me check the booking system. Yes, it is available until eleven. I will reserve it for you.',
    ],
    qs: [
      { q: 'What is the man’s problem?', options: ['A projector is not working.', 'He lost his presentation.', 'He is late for a meeting.', 'A room is locked.'], explain: '“the projector in room B is not working again”.' },
      { q: 'What does the woman suggest?', options: ['Using a different room', 'Calling the technician', 'Postponing the presentation', 'Buying a new projector'], explain: '“Why don’t you use room D?”' },
      { q: 'What will the woman do next?', options: ['Reserve a room', 'Repair the projector', 'Attend the presentation', 'Send an email'], explain: '“I will reserve it for you.”' },
    ],
  },
  {
    text: [
      'W: I am calling about the order I placed online three days ago. The tracking page says it has not shipped yet.',
      'M: Let me look that up. I see. One of the items, the desk lamp, is out of stock until next week.',
      'W: I need the other items urgently. Can you send them separately?',
      'M: Yes, I can ship them today at no extra charge, and the lamp will follow when it arrives.',
    ],
    qs: [
      { q: 'Why is the woman calling?', options: ['Her order has not shipped.', 'She received the wrong item.', 'She wants to return a lamp.', 'She forgot her password.'], explain: '“The tracking page says it has not shipped yet.”' },
      { q: 'What caused the delay?', options: ['An item is out of stock.', 'The address was wrong.', 'The payment failed.', 'The warehouse was closed.'], explain: '“the desk lamp, is out of stock until next week”.' },
      { q: 'What does the man offer to do?', options: ['Ship the other items today', 'Give a full refund', 'Cancel the order', 'Deliver the lamp in person'], explain: '“I can ship them today at no extra charge.”' },
    ],
  },
  {
    text: [
      'M: Sarah, do you have a minute? I would like your opinion on these two designs for the new brochure.',
      'W: Sure. I like the blue one. The layout is cleaner, and the photos stand out more.',
      'M: I agree, but the printing cost is ten percent higher.',
      'W: Then let us ask the printer for a discount if we order five thousand copies instead of three thousand.',
    ],
    qs: [
      { q: 'What does the man ask the woman for?', options: ['Her opinion on two designs', 'Help with a photo shoot', 'A list of printers', 'A copy of the budget'], explain: '“I would like your opinion on these two designs.”' },
      { q: 'Why does the woman prefer the blue design?', options: ['The layout is cleaner.', 'It is cheaper to print.', 'It has more text.', 'It was her idea.'], explain: '“The layout is cleaner, and the photos stand out more.”' },
      { q: 'What does the woman suggest?', options: ['Asking for a discount on a larger order', 'Choosing the cheaper design', 'Printing fewer copies', 'Hiring another designer'], explain: '“let us ask the printer for a discount if we order five thousand copies”.' },
    ],
  },
  {
    text: [
      'W: Good afternoon. I would like to open a business account for my bakery.',
      'M: Certainly. I will need your business license and a photo ID.',
      'W: I have both here. Is there a monthly fee?',
      'M: There is no fee as long as you keep at least one thousand dollars in the account. You will also receive a free debit card within a week.',
    ],
    qs: [
      { q: 'Where is the conversation taking place?', options: ['At a bank', 'At a bakery', 'At a city office', 'At a law firm'], explain: 'Người phụ nữ muốn “open a business account” → ngân hàng.' },
      { q: 'What does the man ask the woman to provide?', options: ['A business license and a photo ID', 'A bank statement', 'A letter from her landlord', 'A list of employees'], explain: '“I will need your business license and a photo ID.”' },
      { q: 'How can the woman avoid the monthly fee?', options: ['By keeping a minimum balance', 'By using the debit card', 'By opening two accounts', 'By paying in advance'], explain: '“no fee as long as you keep at least one thousand dollars in the account”.' },
    ],
  },
  {
    text: [
      'M: The annual conference is only a month away. How many people have registered so far?',
      'W: Two hundred and forty, which is fewer than last year. I think the registration fee is too high.',
      'M: What if we offer a group rate for companies sending three or more employees?',
      'W: That could help. I will draft an announcement and post it on our website tomorrow.',
    ],
    qs: [
      { q: 'What event are the speakers discussing?', options: ['An annual conference', 'A product launch', 'A company picnic', 'A board meeting'], explain: '“The annual conference is only a month away.”' },
      { q: 'According to the woman, why is registration low?', options: ['The fee is too high.', 'The date is inconvenient.', 'The venue is too far.', 'The website is down.'], explain: '“I think the registration fee is too high.”' },
      { q: 'What will the woman do tomorrow?', options: ['Post an announcement', 'Call the venue', 'Refund some fees', 'Visit a client'], explain: '“I will draft an announcement and post it on our website tomorrow.”' },
    ],
  },
  {
    text: [
      'W: Hi, Tom. I noticed you have been staying late every day this week. Is everything all right?',
      'M: We are short of staff since Maria left, and I am covering her accounts as well as mine.',
      'W: That is not sustainable. I will talk to human resources about hiring a temporary worker.',
      'M: I would really appreciate that. In the meantime, could we push the Hudson deadline back a few days?',
      'W: I will ask the client this afternoon.',
    ],
    qs: [
      { q: 'Why has the man been staying late?', options: ['He is covering a former colleague’s accounts.', 'He is preparing for an exam.', 'His computer is slow.', 'He arrives late in the morning.'], explain: '“I am covering her accounts as well as mine” – Maria đã nghỉ việc.' },
      { q: 'What does the woman say she will do?', options: ['Talk to human resources', 'Take over his accounts', 'Call Maria', 'Give him a day off'], explain: '“I will talk to human resources about hiring a temporary worker.”' },
      { q: 'What does the man ask for?', options: ['A later deadline', 'A higher salary', 'A new computer', 'A different client'], explain: '“could we push the Hudson deadline back a few days?”' },
    ],
  },
];
