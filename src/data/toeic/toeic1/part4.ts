import type { ToeicGroup } from "../../../lib/toeic";

export const part4: ToeicGroup[] = [
  {
    text: [
      "Hello, this is Jason Park from Bright Office Furniture, calling for Ms. Alvarez.",
      "The twenty chairs you ordered have arrived at our warehouse, but the conference table will not be ready until next Wednesday.",
      "We can deliver the chairs this Friday morning, or deliver everything together next week.",
      "Please call me back at 555 0142 and let me know which option you prefer.",
    ],
    qs: [
      {
        q: "Why is the speaker calling?",
        options: [
          "To discuss a delivery",
          "To cancel an order",
          "To ask for payment",
          "To offer a discount",
        ],
        explain:
          "Người nói thông báo ghế đã về kho và hỏi cách giao hàng → gọi về việc giao hàng.",
      },
      {
        q: "What item is delayed?",
        options: [
          "A conference table",
          "Twenty chairs",
          "A bookshelf",
          "A desk lamp",
        ],
        explain:
          "“the conference table will not be ready until next Wednesday”.",
      },
      {
        q: "What is the listener asked to do?",
        options: [
          "Return the call",
          "Visit the warehouse",
          "Sign a contract",
          "Pay a deposit",
        ],
        explain:
          "“Please call me back … and let me know which option you prefer.”",
      },
    ],
  },
  {
    text: [
      "Attention passengers on flight 318 to Singapore.",
      "Because of heavy rain, the departure has been delayed by about forty minutes.",
      "The new boarding time is three fifteen, and the gate has changed from gate twelve to gate twenty.",
      "Passengers with connecting flights should speak to the staff at the service desk next to gate twenty.",
      "We apologize for the inconvenience.",
    ],
    qs: [
      {
        q: "Where is the announcement being made?",
        options: [
          "At an airport",
          "At a train station",
          "On a ferry",
          "At a bus terminal",
        ],
        explain: "Thông báo cho “passengers on flight 318” → sân bay.",
      },
      {
        q: "What caused the delay?",
        options: [
          "Heavy rain",
          "A technical problem",
          "A late crew",
          "A security check",
        ],
        explain: "“Because of heavy rain, the departure has been delayed.”",
      },
      {
        q: "What should passengers with connecting flights do?",
        options: [
          "Speak to staff at the service desk",
          "Go to gate twelve",
          "Collect their baggage",
          "Buy a new ticket",
        ],
        explain:
          "“should speak to the staff at the service desk next to gate twenty”.",
      },
    ],
  },
  {
    text: [
      "Good afternoon, shoppers, and welcome to Greenfield Market.",
      "Today only, all fresh fruit and vegetables are twenty percent off.",
      "Members of our loyalty program receive an additional five percent discount at the register.",
      "If you are not a member yet, you can sign up for free at the customer service counter near the entrance.",
      "The store will close at nine tonight. Thank you for shopping with us.",
    ],
    qs: [
      {
        q: "What is on sale today?",
        options: [
          "Fresh fruit and vegetables",
          "Frozen food",
          "Kitchen equipment",
          "Bakery items",
        ],
        explain: "“all fresh fruit and vegetables are twenty percent off”.",
      },
      {
        q: "Who receives an extra discount?",
        options: [
          "Loyalty program members",
          "Customers paying in cash",
          "New employees",
          "Shoppers before noon",
        ],
        explain:
          "“Members of our loyalty program receive an additional five percent discount.”",
      },
      {
        q: "Where can listeners sign up for the program?",
        options: [
          "At the customer service counter",
          "At the register",
          "On the second floor",
          "In the parking lot",
        ],
        explain:
          "“sign up for free at the customer service counter near the entrance”.",
      },
    ],
  },
  {
    text: [
      "Are you tired of slow internet at your office?",
      "Switch to Speedline Business today and enjoy connections up to ten times faster.",
      "Our technicians will install everything within forty-eight hours, and support is available around the clock.",
      "Sign a one-year contract before the end of June and get the first two months free.",
      "Visit our website to request a quote.",
    ],
    qs: [
      {
        q: "What is being advertised?",
        options: [
          "An internet service",
          "A computer store",
          "A phone repair shop",
          "An office building",
        ],
        explain:
          "Quảng cáo nói về “slow internet” và “connections up to ten times faster”.",
      },
      {
        q: "How soon can the service be installed?",
        options: [
          "Within forty-eight hours",
          "Within one week",
          "On the same day",
          "Within a month",
        ],
        explain: "“install everything within forty-eight hours”.",
      },
      {
        q: "How can customers get two free months?",
        options: [
          "By signing a one-year contract before the end of June",
          "By paying in advance",
          "By recommending a friend",
          "By visiting a store",
        ],
        explain:
          "“Sign a one-year contract before the end of June and get the first two months free.”",
      },
    ],
  },
  {
    text: [
      "This is your morning traffic update.",
      "An accident on Highway 9 near the river bridge has closed two lanes, and traffic is backed up for five kilometers.",
      "Drivers heading downtown should use Lake Road instead.",
      "Crews expect to clear the road by ten.",
      "The city also reminds drivers that Central Street will be closed all weekend for a marathon.",
      "Stay tuned for the weather after this short break.",
    ],
    qs: [
      {
        q: "What is the main cause of the traffic problem?",
        options: [
          "An accident on the highway",
          "Road construction",
          "A broken traffic light",
          "A snowstorm",
        ],
        explain: "“An accident on Highway 9 … has closed two lanes.”",
      },
      {
        q: "What are drivers advised to do?",
        options: [
          "Use Lake Road",
          "Take the subway",
          "Leave after ten",
          "Cross the river bridge",
        ],
        explain: "“Drivers heading downtown should use Lake Road instead.”",
      },
      {
        q: "Why will Central Street be closed this weekend?",
        options: [
          "For a marathon",
          "For repairs",
          "For a parade",
          "For a street market",
        ],
        explain: "“Central Street will be closed all weekend for a marathon.”",
      },
    ],
  },
  {
    text: [
      "Thanks for joining this meeting, everyone.",
      "As you know, customer complaints about late deliveries rose by fifteen percent last quarter.",
      "To fix this, we are introducing a new tracking system on the first of next month.",
      "Every driver will receive a tablet, and training sessions will be held next Tuesday and Wednesday.",
      "Please sign up for one of the sessions on the sheet by the door before you leave today.",
    ],
    qs: [
      {
        q: "What problem does the speaker mention?",
        options: [
          "More complaints about late deliveries",
          "A drop in sales",
          "A shortage of drivers",
          "Rising fuel costs",
        ],
        explain:
          "“customer complaints about late deliveries rose by fifteen percent”.",
      },
      {
        q: "What will be introduced next month?",
        options: [
          "A new tracking system",
          "A new delivery fee",
          "A larger warehouse",
          "A different uniform",
        ],
        explain:
          "“we are introducing a new tracking system on the first of next month”.",
      },
      {
        q: "What are the listeners asked to do before leaving?",
        options: [
          "Sign up for a training session",
          "Return their tablets",
          "Fill in a complaint form",
          "Meet a customer",
        ],
        explain:
          "“Please sign up for one of the sessions on the sheet by the door.”",
      },
    ],
  },
  {
    text: [
      "Welcome to the Harbor City Museum of Industry. My name is Elena, and I will be your guide for the next ninety minutes.",
      "We will begin on the ground floor with the steam engine collection and then move upstairs to the textile hall.",
      "Please note that photography is allowed everywhere except in the special exhibition on the third floor.",
      "At the end of the tour, you can use your ticket to get ten percent off in the gift shop.",
    ],
    qs: [
      {
        q: "Who most likely is the speaker?",
        options: [
          "A tour guide",
          "A shop assistant",
          "An engineer",
          "A photographer",
        ],
        explain: "“I will be your guide for the next ninety minutes.”",
      },
      {
        q: "Where will the tour begin?",
        options: [
          "With the steam engine collection",
          "In the textile hall",
          "In the gift shop",
          "On the third floor",
        ],
        explain:
          "“We will begin on the ground floor with the steam engine collection.”",
      },
      {
        q: "What is not allowed in the special exhibition?",
        options: [
          "Taking photographs",
          "Using a ticket",
          "Asking questions",
          "Bringing children",
        ],
        explain:
          "“photography is allowed everywhere except in the special exhibition”.",
      },
    ],
  },
  {
    text: [
      "Good morning, and welcome to your first day at Norton Logistics.",
      "This morning you will complete some paperwork and receive your employee badge.",
      "After lunch, the safety officer will show you how to use the equipment in the warehouse.",
      "Remember that safety shoes must be worn at all times on the warehouse floor.",
      "If you have any questions during the day, please ask me or your team leader.",
    ],
    qs: [
      {
        q: "Who is the speaker addressing?",
        options: [
          "New employees",
          "Regular customers",
          "Company directors",
          "Truck drivers from another firm",
        ],
        explain:
          "“welcome to your first day at Norton Logistics” → nhân viên mới.",
      },
      {
        q: "What will the listeners receive this morning?",
        options: [
          "An employee badge",
          "A pair of safety shoes",
          "A company car",
          "A pay slip",
        ],
        explain: "“receive your employee badge”.",
      },
      {
        q: "What will happen after lunch?",
        options: [
          "A safety officer will give a demonstration.",
          "The listeners will go home.",
          "A test will be given.",
          "The warehouse will be closed.",
        ],
        explain: "“the safety officer will show you how to use the equipment”.",
      },
    ],
  },
  {
    text: [
      "In business news, the clothing company Maple and Stone announced today that it will open thirty new stores across Southeast Asia over the next two years.",
      "The first store will open in Ho Chi Minh City this December.",
      "The chief executive said the expansion will create about nine hundred jobs.",
      "The company also plans to launch an online shop in Vietnamese early next year.",
    ],
    qs: [
      {
        q: "What did the company announce?",
        options: [
          "An expansion plan",
          "A price increase",
          "A factory closure",
          "A change of chief executive",
        ],
        explain:
          "Công ty sẽ “open thirty new stores across Southeast Asia” → kế hoạch mở rộng.",
      },
      {
        q: "When will the first store open?",
        options: [
          "This December",
          "Early next year",
          "In two years",
          "Next month",
        ],
        explain:
          "“The first store will open in Ho Chi Minh City this December.”",
      },
      {
        q: "How many jobs will be created?",
        options: [
          "About nine hundred",
          "About thirty",
          "About two hundred",
          "About three thousand",
        ],
        explain: "“the expansion will create about nine hundred jobs”.",
      },
    ],
  },
  {
    text: [
      "Thank you all. I am honored to receive the Employee of the Year award.",
      "When I joined this company eight years ago as a junior engineer, I never imagined standing here tonight.",
      "I want to thank my team, who worked many late nights to finish the bridge project two months ahead of schedule.",
      "I would also like to thank my manager, Ms. Okafor, for trusting me to lead it.",
      "Please enjoy the rest of the evening.",
    ],
    qs: [
      {
        q: "What is the purpose of the speech?",
        options: [
          "To accept an award",
          "To announce a retirement",
          "To introduce a new product",
          "To welcome a new manager",
        ],
        explain: "“I am honored to receive the Employee of the Year award.”",
      },
      {
        q: "How long has the speaker worked at the company?",
        options: ["Eight years", "Two months", "One year", "Twenty years"],
        explain: "“I joined this company eight years ago.”",
      },
      {
        q: "What does the speaker say about the bridge project?",
        options: [
          "It was finished ahead of schedule.",
          "It went over budget.",
          "It was canceled.",
          "It will start next year.",
        ],
        explain: "“finish the bridge project two months ahead of schedule”.",
      },
    ],
  },
];
