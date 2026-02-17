export const seedData = {
  households: [
    { id: 'h1', name: 'David', address: '' },
    { id: 'h2', name: 'The Smiths', address: '' },
    { id: 'h3', name: 'The Joneses', address: '' },
  ],
  persons: [
    {
      id: 'p1', name: 'David', dob: '1953-06-15', relationship: 'Self',
      householdId: 'h1', phone: '', email: '', photo: null,
      lastContactDate: null,
    },
    {
      id: 'p2', name: 'Sarah', dob: '1980-03-22', relationship: 'Daughter',
      householdId: 'h2', phone: '', email: '', photo: null,
      lastContactDate: '2026-02-10',
    },
    {
      id: 'p3', name: 'James', dob: '1979-08-04', relationship: 'Son-in-law',
      householdId: 'h2', phone: '', email: '', photo: null,
      lastContactDate: '2026-02-10',
    },
    {
      id: 'p4', name: 'Eli', dob: '2022-02-19', relationship: 'Grandchild',
      householdId: 'h2', phone: '', email: '', photo: null,
      lastContactDate: '2026-02-10', isGrandchild: true,
    },
    {
      id: 'p5', name: 'Rosie', dob: '2019-09-12', relationship: 'Grandchild',
      householdId: 'h2', phone: '', email: '', photo: null,
      lastContactDate: '2026-02-10', isGrandchild: true,
    },
    {
      id: 'p6', name: 'Tom', dob: '1982-11-30', relationship: 'Son',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-01-28',
    },
    {
      id: 'p7', name: 'Claire', dob: '1984-05-14', relationship: 'Daughter-in-law',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-01-28',
    },
    {
      id: 'p8', name: 'Alfie', dob: '2018-04-03', relationship: 'Grandchild',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-01-28', isGrandchild: true,
    },
    {
      id: 'p9', name: 'Maisie', dob: '2020-12-25', relationship: 'Grandchild',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-01-28', isGrandchild: true,
    },
    {
      id: 'p10', name: 'Freddie', dob: '2023-07-08', relationship: 'Grandchild',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-01-28', isGrandchild: true,
    },
    {
      id: 'p11', name: 'Lucy', dob: '1985-01-19', relationship: 'Daughter',
      householdId: 'h3', phone: '', email: '', photo: null,
      lastContactDate: '2026-02-02',
    },
  ],
  journalEntries: [
    {
      id: 'j1', childId: 'p4', submittedBy: 'p2', date: '2026-02-14',
      type: 'quote', content: '"Grandpa, when I grow up I want to be a doctor like you!"',
      mediaUrl: null,
    },
    {
      id: 'j2', childId: 'p5', submittedBy: 'p2', date: '2026-02-12',
      type: 'milestone', content: 'Rosie lost her first tooth today!',
      mediaUrl: null,
    },
    {
      id: 'j3', childId: 'p8', submittedBy: 'p7', date: '2026-02-10',
      type: 'photo', content: 'Alfie scored his first goal at football practice!',
      mediaUrl: null,
    },
    {
      id: 'j4', childId: 'p9', submittedBy: 'p7', date: '2026-02-08',
      type: 'text', content: 'Maisie started reading chapter books this week. She finished "The Magic Faraway Tree" all by herself.',
      mediaUrl: null,
    },
    {
      id: 'j5', childId: 'p10', submittedBy: 'p6', date: '2026-02-05',
      type: 'milestone', content: 'Freddie took his first steps today! Very wobbly but so proud.',
      mediaUrl: null,
    },
    {
      id: 'j6', childId: 'p4', submittedBy: 'p3', date: '2026-02-01',
      type: 'text', content: 'Eli has been obsessed with dinosaurs. He can name about 20 different species now.',
      mediaUrl: null,
    },
  ],
  memoryRecordings: [
    {
      id: 'm1', title: 'How I Met Your Grandmother', date: '2026-01-15',
      duration: 342, audioUrl: null,
      transcript: 'It was the summer of 1975, and I had just started my first posting at St Thomas\'s Hospital...',
      tags: ['family history', 'love story'],
    },
    {
      id: 'm2', title: 'My First Day as a Doctor', date: '2026-01-20',
      duration: 285, audioUrl: null,
      transcript: 'I remember walking through those hospital doors, white coat freshly pressed, stethoscope round my neck...',
      tags: ['career', 'medicine'],
    },
    {
      id: 'm3', title: 'The Day Sarah Was Born', date: '2026-02-01',
      duration: 198, audioUrl: null,
      transcript: 'Your mum arrived three weeks early. I was in the middle of a night shift when the call came...',
      tags: ['family history', 'children'],
    },
  ],
  events: [
    { id: 'e1', title: "Eli's Birthday", date: '2026-02-19', type: 'birthday', personIds: ['p4'], recurring: true },
    { id: 'e2', title: "Rosie's School Play", date: '2026-02-25', type: 'school', personIds: ['p5'], recurring: false },
    { id: 'e3', title: "Sarah's Birthday", date: '2026-03-22', type: 'birthday', personIds: ['p2'], recurring: true },
    { id: 'e4', title: "Alfie's Football Match", date: '2026-02-22', type: 'school', personIds: ['p8'], recurring: false },
    { id: 'e5', title: "Maisie's Birthday", date: '2026-12-25', type: 'birthday', personIds: ['p9'], recurring: true },
    { id: 'e6', title: "Surgery Session", date: '2026-02-17', type: 'medical', personIds: ['p1'], recurring: true },
    { id: 'e7', title: "ME Session", date: '2026-02-19', type: 'medical', personIds: ['p1'], recurring: true },
  ],
  contactLogs: [
    { id: 'c1', personId: 'p2', date: '2026-02-10', method: 'visit', notes: 'Sunday lunch at Sarah\'s' },
    { id: 'c2', personId: 'p3', date: '2026-02-10', method: 'visit', notes: 'Sunday lunch' },
    { id: 'c3', personId: 'p4', date: '2026-02-10', method: 'visit', notes: 'Sunday lunch - Eli showed me his dinosaur collection' },
    { id: 'c4', personId: 'p5', date: '2026-02-10', method: 'visit', notes: 'Sunday lunch' },
    { id: 'c5', personId: 'p6', date: '2026-01-28', method: 'call', notes: 'Caught up on the phone for 20 mins' },
    { id: 'c6', personId: 'p7', date: '2026-01-28', method: 'call', notes: '' },
    { id: 'c7', personId: 'p11', date: '2026-02-02', method: 'text', notes: 'WhatsApp messages about weekend plans' },
  ],
};
