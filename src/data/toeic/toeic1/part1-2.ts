import type { ToeicItem, ToeicPhoto } from '../../../lib/toeic';

export const part1: ToeicPhoto[] = [
  {
    scene: 'Một người phụ nữ ngồi ở bàn làm việc, đang gõ bàn phím máy tính xách tay. Bên cạnh có một cốc cà phê.',
    options: ['A woman is typing on a laptop.', 'A woman is pouring a cup of coffee.', 'A woman is closing a window.', 'A woman is carrying a desk.'],
    explain: 'Người phụ nữ đang gõ máy tính xách tay (typing on a laptop). Không ai rót cà phê, đóng cửa sổ hay khiêng bàn.',
  },
  {
    scene: 'Hai người đàn ông mặc vest đang bắt tay nhau trong một phòng họp. Trên bàn có vài tập tài liệu.',
    options: ['Two men are shaking hands.', 'Two men are signing a document.', 'Two men are leaving the building.', 'Two men are arranging chairs.'],
    explain: 'Hai người đàn ông đang bắt tay (shaking hands). Tài liệu nằm trên bàn nhưng không ai đang ký.',
  },
  {
    scene: 'Một nhân viên kho đang dùng xe nâng để chuyển các thùng hàng lên kệ cao.',
    options: ['A worker is operating a forklift.', 'A worker is opening a box with a knife.', 'A worker is sweeping the floor.', 'A worker is loading a truck by hand.'],
    explain: 'Nhân viên đang điều khiển xe nâng (operating a forklift) để xếp thùng lên kệ.',
  },
  {
    scene: 'Một nhóm người ngồi quanh bàn, cùng nhìn lên màn hình chiếu có biểu đồ. Một người phụ nữ đứng cạnh màn hình và chỉ vào biểu đồ.',
    options: ['A woman is pointing at a chart.', 'A woman is handing out brochures.', 'The screen is being taken down.', 'The people are standing in line.'],
    explain: 'Người phụ nữ đang chỉ vào biểu đồ (pointing at a chart). Mọi người đang ngồi, không xếp hàng.',
  },
  {
    scene: 'Một quầy lễ tân khách sạn. Một vị khách kéo vali đang đưa thẻ cho nhân viên lễ tân.',
    options: ['A guest is handing a card to a receptionist.', 'A guest is unpacking a suitcase.', 'A receptionist is cleaning the counter.', 'A guest is waiting for an elevator.'],
    explain: 'Vị khách đang đưa thẻ cho lễ tân (handing a card to a receptionist).',
  },
  {
    scene: 'Một văn phòng không có người. Nhiều ghế được xếp ngay ngắn dưới các bàn làm việc, và một máy in đặt ở góc phòng.',
    options: ['Chairs have been pushed under the desks.', 'A printer is being repaired.', 'Some employees are having lunch.', 'Papers are scattered on the floor.'],
    explain: 'Ghế đã được đẩy vào dưới bàn (have been pushed under the desks). Phòng không có người và máy in không được sửa.',
  },
];

export const part2: ToeicItem[] = [
  { q: 'When does the staff meeting start?', options: ['At ten thirty.', 'In the conference room.', 'About the new budget.'], explain: 'Câu hỏi “When” hỏi thời gian → “At ten thirty”.' },
  { q: 'Where should I put these invoices?', options: ['On the shelf behind my desk.', 'By the end of the week.', 'Yes, they have been paid.'], explain: 'Câu hỏi “Where” hỏi vị trí → “On the shelf behind my desk”.' },
  { q: 'Who is in charge of the marketing campaign?', options: ['Ms. Tran from the Hanoi office.', 'It starts next quarter.', 'A very large budget.'], explain: 'Câu hỏi “Who” hỏi người phụ trách → nêu tên một người.' },
  { q: 'Why was the shipment delayed?', options: ['Because of a storm at the port.', 'By express delivery.', 'Three boxes of paper.'], explain: 'Câu hỏi “Why” hỏi lý do → “Because of a storm at the port”.' },
  { q: 'How often do you back up the files?', options: ['Once a day.', 'On the main server.', 'For two hours.'], explain: '“How often” hỏi tần suất → “Once a day”.' },
  { q: 'Would you like me to print the agenda?', options: ['Yes, ten copies, please.', 'The printer is on the second floor.', 'I liked the presentation.'], explain: 'Lời đề nghị giúp đỡ → nhận lời và nói rõ số bản cần in.' },
  { q: 'Have you met the new accountant yet?', options: ['No, not yet.', 'She counts very fast.', 'In the accounting software.'], explain: 'Câu hỏi Yes/No với “yet” → “No, not yet”.' },
  { q: 'Could you send me the sales report?', options: ['Sure, I will email it right away.', 'It was sent last year.', 'Sales went up in March.'], explain: 'Lời nhờ “Could you …?” → đồng ý và nói sẽ làm ngay.' },
  { q: 'Which supplier offers the lowest price?', options: ['The one in Da Nang.', 'About twenty dollars.', 'Yes, they supply paper.'], explain: '“Which supplier” hỏi lựa chọn nhà cung cấp → “The one in Da Nang”.' },
  { q: 'How long will the training session last?', options: ['About three hours.', 'In room four.', 'Every Monday.'], explain: '“How long” hỏi khoảng thời gian → “About three hours”.' },
  { q: 'Is the manager in his office or in a meeting?', options: ['He is in a meeting until noon.', 'Yes, he is.', 'The office is on the left.'], explain: 'Câu hỏi lựa chọn (A or B) không trả lời Yes/No → chọn một trong hai.' },
  { q: 'Do you mind if I open the window?', options: ['Not at all, go ahead.', 'Yes, it is a window seat.', 'The store opens at nine.'], explain: '“Do you mind if …?” → “Not at all” = không phiền, cứ tự nhiên.' },
  { q: 'What time does the bank close on Saturdays?', options: ['At noon, I think.', 'Next to the post office.', 'A savings account.'], explain: '“What time” hỏi giờ → “At noon, I think”.' },
  { q: 'Whose laptop is this on the table?', options: ['It belongs to Mr. Lee.', 'It is a new model.', 'On the table.'], explain: '“Whose” hỏi chủ sở hữu → “It belongs to Mr. Lee”.' },
  { q: 'Why don’t we take a short break?', options: ['Good idea, I need some coffee.', 'Because it broke yesterday.', 'It was very short.'], explain: '“Why don’t we …?” là lời gợi ý → tán thành “Good idea”.' },
  { q: 'The copier on this floor is out of order.', options: ['You can use the one upstairs.', 'I ordered ten copies.', 'On the third floor.'], explain: 'Câu trần thuật nêu vấn đề → đưa ra giải pháp: dùng máy ở tầng trên.' },
  { q: 'How much does the annual membership cost?', options: ['Two hundred dollars.', 'Once a year.', 'At the front desk.'], explain: '“How much … cost” hỏi giá → nêu số tiền.' },
  { q: 'When is the deadline for the proposal?', options: ['This Friday at five.', 'To the client.', 'It is quite long.'], explain: '“When is the deadline” → nêu thời điểm “This Friday at five”.' },
  { q: 'You are attending the trade fair, aren’t you?', options: ['Yes, I leave on Tuesday.', 'It was fair enough.', 'A trade agreement.'], explain: 'Câu hỏi đuôi xác nhận → “Yes” kèm thông tin thêm.' },
  { q: 'Where can I find the visitor parking lot?', options: ['Behind the main building.', 'For two hours only.', 'A parking ticket.'], explain: '“Where” hỏi địa điểm → “Behind the main building”.' },
  { q: 'Who approved the travel expenses?', options: ['The finance director did.', 'By credit card.', 'To Singapore.'], explain: '“Who approved” → nêu người phê duyệt.' },
  { q: 'Should we order more office supplies now or wait until next month?', options: ['Let us order them now.', 'Yes, we should.', 'In the supply room.'], explain: 'Câu hỏi lựa chọn → chọn một phương án: đặt ngay bây giờ.' },
  { q: 'Did the client like the new design?', options: ['Yes, she was very pleased.', 'A graphic designer.', 'It is signed already.'], explain: 'Câu hỏi Yes/No → “Yes, she was very pleased”.' },
  { q: 'How do I reset my password?', options: ['Click the link on the login page.', 'It is a strong password.', 'Yesterday afternoon.'], explain: '“How do I …?” hỏi cách làm → hướng dẫn bấm vào đường dẫn.' },
  { q: 'I think we should hire another assistant.', options: ['I agree, the workload is too heavy.', 'She is on the third floor.', 'A higher salary.'], explain: 'Câu nêu ý kiến → tán thành và nêu lý do.' },
];
