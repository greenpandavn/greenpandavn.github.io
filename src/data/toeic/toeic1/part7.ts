import type { ToeicGroup } from '../../../lib/toeic';

const single: ToeicGroup[] = [
  {
    text: [
      'NOTICE',
      'The staff parking lot behind Building C will be repainted on Saturday, 18 May.',
      'All vehicles must be removed by 6 p.m. on Friday. Cars left in the lot will be towed at the owner’s expense.',
      'Temporary parking is available at the visitor lot on Elm Street.',
    ],
    qs: [
      { q: 'What is the purpose of the notice?', options: ['To announce work in a parking lot', 'To advertise a car wash', 'To report a stolen vehicle', 'To introduce a new building'], explain: 'Thông báo cho biết bãi xe “will be repainted on Saturday”.' },
      { q: 'What will happen to cars left in the lot?', options: ['They will be towed.', 'They will be painted.', 'They will be washed.', 'They will be sold.'], explain: '“Cars left in the lot will be towed at the owner’s expense.”' },
    ],
  },
  {
    text: [
      'Carla (9:02): Hi Ben, I am stuck in traffic. Can you start the client call without me?',
      'Ben (9:03): Sure. Do you want me to share the price list?',
      'Carla (9:04): Yes, but do not mention the discount until I join. I should be there in fifteen minutes.',
      'Ben (9:05): Got it.',
    ],
    qs: [
      { q: 'Why will Carla be late?', options: ['She is stuck in traffic.', 'She missed her train.', 'She is with another client.', 'She forgot the meeting.'], explain: '“I am stuck in traffic.”' },
      { q: 'What does Carla ask Ben NOT to do yet?', options: ['Mention the discount', 'Share the price list', 'Start the call', 'Contact the client'], explain: '“do not mention the discount until I join”.' },
    ],
  },
  {
    text: [
      'Sunrise Cleaning Services',
      'Professional office cleaning at prices you can afford.',
      'Daily, weekly or monthly plans · Environmentally friendly products · Fully insured staff',
      'Book before 30 April and receive your first cleaning free. Call 555 0127 for a free estimate.',
    ],
    qs: [
      { q: 'What is being advertised?', options: ['An office cleaning service', 'A cleaning product', 'An insurance plan', 'A job vacancy'], explain: '“Professional office cleaning at prices you can afford.”' },
      { q: 'How can customers receive a free cleaning?', options: ['By booking before 30 April', 'By choosing a daily plan', 'By paying in cash', 'By calling after May'], explain: '“Book before 30 April and receive your first cleaning free.”' },
    ],
  },
  {
    text: [
      'To: Customer Service <help@novaprint.com>',
      'From: Peter Lang',
      'Subject: Order 7741',
      'I ordered 500 business cards last week, and they arrived this morning. Unfortunately, my phone number is printed incorrectly on every card: the last two digits are reversed.',
      'I checked my order form, and the number I entered there is correct. I need the cards for a trade show on 2 June.',
      'Could you please reprint them and send them by express delivery? Thank you.',
    ],
    qs: [
      { q: 'What is the problem with the order?', options: ['A phone number is printed incorrectly.', 'The cards arrived late.', 'The wrong quantity was sent.', 'The paper is damaged.'], explain: '“my phone number is printed incorrectly on every card”.' },
      { q: 'Why does Mr. Lang need the cards soon?', options: ['He is attending a trade show.', 'He is starting a new job.', 'He is moving his office.', 'He is meeting an investor.'], explain: '“I need the cards for a trade show on 2 June.”' },
      { q: 'What does Mr. Lang request?', options: ['A reprint sent by express delivery', 'A full refund', 'A discount on his next order', 'A phone call from the manager'], explain: '“Could you please reprint them and send them by express delivery?”' },
    ],
  },
  {
    text: [
      'MEMO',
      'To: Sales team · From: Olivia Grant, Sales Director',
      'Starting 1 July, all travel requests must be submitted through the new online portal at least ten days before departure.',
      'Requests sent by email will no longer be accepted. The portal automatically compares hotel prices and selects the lowest rate within one kilometer of your meeting.',
      'A thirty-minute online tutorial is available on the intranet. Please complete it by 25 June.',
    ],
    qs: [
      { q: 'What is changing on 1 July?', options: ['How travel requests are submitted', 'The size of the travel budget', 'The sales director', 'The hotel used by the company'], explain: '“all travel requests must be submitted through the new online portal”.' },
      { q: 'What does the portal do automatically?', options: ['It selects the lowest hotel rate nearby.', 'It books flights in business class.', 'It sends emails to clients.', 'It approves every request.'], explain: '“automatically compares hotel prices and selects the lowest rate”.' },
      { q: 'What are employees asked to do by 25 June?', options: ['Complete an online tutorial', 'Submit all travel requests', 'Meet the director', 'Cancel their trips'], explain: '“A thirty-minute online tutorial … Please complete it by 25 June.”' },
    ],
  },
  {
    text: [
      'Brookside Business Park – Shuttle Bus Schedule (Monday to Friday)',
      'Central Station → Business Park: 7:30, 8:00, 8:30, 9:00',
      'Business Park → Central Station: 17:00, 17:30, 18:00, 18:30',
      'The ride takes about twenty minutes. The shuttle is free for employees showing a company badge; visitors pay two dollars.',
      'There is no service on public holidays.',
    ],
    qs: [
      { q: 'When does the last morning shuttle leave Central Station?', options: ['At 9:00', 'At 7:30', 'At 8:30', 'At 17:00'], explain: 'Chuyến cuối buổi sáng từ Central Station là 9:00.' },
      { q: 'Who must pay for the shuttle?', options: ['Visitors', 'Employees with a badge', 'Bus drivers', 'Nobody'], explain: '“free for employees showing a company badge; visitors pay two dollars”.' },
      { q: 'When does the shuttle NOT run?', options: ['On public holidays', 'On Mondays', 'In the evening', 'In the morning'], explain: '“There is no service on public holidays.”' },
    ],
  },
  {
    text: [
      'Review: Lakeview Conference Hotel ★★★★☆',
      'I organized a two-day sales workshop here for forty people. The meeting rooms were bright and well equipped, and the technical staff solved a microphone problem within minutes.',
      'Lunch was excellent, although the coffee breaks started late on both days.',
      'The only real disadvantage is the location: it is forty minutes from the airport, and taxis are expensive. I would still recommend it for groups arriving by car.',
      '– Meera S., event planner',
    ],
    qs: [
      { q: 'What kind of event did the reviewer organize?', options: ['A sales workshop', 'A wedding', 'A product launch', 'A job fair'], explain: '“I organized a two-day sales workshop here for forty people.”' },
      { q: 'What was the reviewer unhappy about?', options: ['The coffee breaks started late.', 'The rooms were dark.', 'The lunch was poor.', 'The staff were unhelpful.'], explain: '“the coffee breaks started late on both days”.' },
      { q: 'For whom does the reviewer recommend the hotel?', options: ['Groups arriving by car', 'Travelers without luggage', 'Guests flying in late', 'Small families'], explain: '“I would still recommend it for groups arriving by car.”' },
    ],
  },
  {
    text: [
      'Local Bakery Wins National Award',
      'Golden Crust Bakery, a family business founded in 1998, has been named Small Business of the Year by the National Retail Association.',
      'The bakery started with three employees and now runs six shops with a staff of ninety. Owner Linh Dao says the secret is simple: fresh ingredients from local farms and a training program that lets employees become shop managers within three years.',
      'The company donates unsold bread to food banks every evening.',
      'Ms. Dao plans to use the prize money of twenty thousand dollars to open a baking school for young people next spring.',
    ],
    qs: [
      { q: 'What is the article mainly about?', options: ['A bakery that received an award', 'A new food bank', 'A farm that sells bread', 'A cooking competition on television'], explain: 'Tiêu đề và đoạn đầu: tiệm bánh được trao giải “Small Business of the Year”.' },
      { q: 'How many shops does the bakery have now?', options: ['Six', 'Three', 'Ninety', 'Twenty'], explain: '“now runs six shops with a staff of ninety”.' },
      { q: 'What happens to unsold bread?', options: ['It is donated to food banks.', 'It is sold at half price.', 'It is returned to farms.', 'It is thrown away.'], explain: '“The company donates unsold bread to food banks every evening.”' },
      { q: 'What does Ms. Dao plan to do with the prize money?', options: ['Open a baking school', 'Buy a seventh shop', 'Raise salaries', 'Take a holiday'], explain: '“to open a baking school for young people next spring”.' },
    ],
  },
  {
    text: [
      'Job Opening: Logistics Coordinator – Pacific Freight, Hai Phong',
      'Responsibilities: plan daily shipments, communicate with drivers and customs agents, and prepare weekly reports for the operations manager.',
      'Requirements: a degree in business or a related field, at least two years of experience in logistics, and good spoken English. Knowledge of Japanese is an advantage but not required.',
      'We offer a competitive salary, health insurance and fifteen days of paid leave per year.',
      'Send your résumé and a cover letter to jobs@pacificfreight.example by 31 August. Only shortlisted candidates will be contacted.',
    ],
    qs: [
      { q: 'What is one duty of the logistics coordinator?', options: ['Preparing weekly reports', 'Driving delivery trucks', 'Teaching English', 'Selling insurance'], explain: '“prepare weekly reports for the operations manager”.' },
      { q: 'What is required for the position?', options: ['Two years of logistics experience', 'Knowledge of Japanese', 'A truck license', 'A master’s degree'], explain: '“at least two years of experience in logistics”; tiếng Nhật chỉ là lợi thế.' },
      { q: 'What benefit is mentioned?', options: ['Health insurance', 'A company car', 'Free housing', 'Stock options'], explain: '“a competitive salary, health insurance and fifteen days of paid leave”.' },
      { q: 'Who will be contacted by the company?', options: ['Only shortlisted candidates', 'Every applicant', 'Only Japanese speakers', 'Former employees'], explain: '“Only shortlisted candidates will be contacted.”' },
    ],
  },
  {
    text: [
      'INVOICE 2051 – Delta Office Supplies',
      'Bill to: Kenwood Architects, 14 Park Lane',
      '10 boxes of printer paper – $80 · 4 ink cartridges – $120 · 1 office chair – $150',
      'Subtotal: $350 · Delivery: free for orders over $300 · Total due: $350',
      'Payment is due within 30 days of the invoice date (3 March). A late fee of 2% per month applies to overdue balances.',
    ],
    qs: [
      { q: 'Who is the customer?', options: ['Kenwood Architects', 'Delta Office Supplies', 'A printing company', 'A furniture factory'], explain: '“Bill to: Kenwood Architects”.' },
      { q: 'Why is delivery free?', options: ['The order is over $300.', 'The customer is new.', 'The office is nearby.', 'The chair was on sale.'], explain: '“Delivery: free for orders over $300”; đơn hàng là $350.' },
      { q: 'What happens if the invoice is paid late?', options: ['A 2% monthly fee is charged.', 'The order is canceled.', 'Delivery is no longer free.', 'The chair must be returned.'], explain: '“A late fee of 2% per month applies to overdue balances.”' },
    ],
  },
];
