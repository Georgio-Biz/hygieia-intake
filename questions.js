/* HYGIEIA coaching intake: questions and strings.
   Every visible word comes from copy-deck.md v1.1 (Brand & Design, 11 Nov 2026), plus the
   creative-director's build brief (2026-11-11-hygieia-intake-build.md) where it rules on a string.
   Data model: build-spec.md section 3. 23 sections, 82 answerable items (checked by selfCheck below).
   Run `node questions.js` to check the counts and that no em-dash or en-dash appears anywhere. */
(function (root) {
  'use strict';

  var PHOTO_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.heic,.heif';
  var FILE_ACCEPT = PHOTO_ACCEPT + ',application/pdf,.pdf';

  var INTAKE = {
    version: '1.1',
    chapters: [
      { n: 1, title: 'About you', sections: [1, 3] },
      { n: 2, title: 'Health', sections: [4, 5] },
      { n: 3, title: 'Food and drink', sections: [6, 10] },
      { n: 4, title: 'Kitchen and habits', sections: [11, 17] },
      { n: 5, title: 'Life and training', sections: [18, 23] }
    ],
    sections: [
      { n: 1, t: 'Basics', lead: 'The easy bit first.', chapter: 1, q: [
        { id: '1.1', q: 'Full name', t: 'text', autocomplete: 'name' },
        { id: '1.2', q: 'Date of birth', t: 'date', autocomplete: 'bday' },
        { id: '1.3', q: 'Height', t: 'num', u: 'cm' },
        { id: '1.4', q: 'Mobile', t: 'tel', autocomplete: 'tel' }
      ] },
      { n: 2, t: 'Goals', lead: 'The why. Be as honest as you like.', chapter: 1, q: [
        { id: '2.1', q: 'What would a better standard of living actually look like for you?', t: 'area',
          hint: "Day to day: how you'd feel, what you'd be doing, what would be different." },
        { id: '2.2', q: 'Your top 3 goals', t: 'multi', rank: 3,
          hint: 'Tap your most important first. Tap again to take it off.',
          note: "Anything that's not on the list?",
          o: ['Lose body fat', 'More energy', 'Get stronger', 'Feel confident', 'Sleep better', 'Eat cleaner', 'Less stress', 'Better health markers', 'Look after my joints'] },
        { id: '2.3', q: 'Pick a date. What does success look like by then?', t: 'area',
          hint: 'e.g. 30 June 2027: down 8 kg, training 4 days a week, no afternoon slump.' },
        { id: '2.4', q: "What's got in the way when you've tried before?", t: 'area' }
      ] },
      { n: 3, t: 'Weight and measurements', lead: "Rough is fine. Skip anything you'd rather leave for now.", chapter: 1, q: [
        { id: '3.1', q: 'Current weight', t: 'num', u: 'kg', note: 'When did you weigh yourself?' },
        { id: '3.2', q: "Goal weight. Or, if the number doesn't matter, how you want to look and feel", t: 'text' },
        { id: '3.3', q: 'Your highest and lowest adult weight, and roughly when', t: 'text' },
        { id: '3.4', q: 'Waist and hips', t: 'pair', p: ['Waist (cm)', 'Hips (cm)'],
          hint: 'Waist: around your belly button. Hips: the widest part of your bum. First thing in the morning, relaxed, not sucking in.' },
        { id: '3.5', q: 'Ever had a body scan, like InBody or DEXA?', t: 'chips', o: ['Yes', 'No'],
          note: 'If yes, roughly when?',
          upload: { kind: 'file', showWhen: 'Yes', required: false, multiple: true, accept: FILE_ACCEPT,
            instruction: 'A PDF, or a photo of each page',
            slots: [{ key: 'scan', label: 'Add your scan (optional)', name: 'body scan' }] } },
        { id: '3.6', q: 'Progress photos: front, side and back', t: 'chips',
          hint: 'Same spot, same light, every time. Only I see them.',
          o: ["Yes, I'll keep them", "Yes, I'll send them to you", 'Not right now'],
          upload: { kind: 'photo', showWhen: "Yes, I'll send them to you", required: false, multiple: true, accept: PHOTO_ACCEPT,
            heading: 'Progress photos (optional)',
            instruction: "Same spot and good light. Fitted clothes you're comfortable in. Phone at chest height, or ask someone to take them.",
            privacy: 'Only I see these.',
            slots: [
              { key: 'front', label: 'Front', name: 'front' },
              { key: 'side', label: 'Side', name: 'side' },
              { key: 'back', label: 'Back', name: 'back' }
            ] } }
      ] },
      { n: 4, t: 'Health and medications', lead: "This stays between us. It's how we keep the plan safe.", chapter: 2, q: [
        { id: '4.1', q: 'Any medical conditions, diagnosed or suspected', t: 'area' },
        { id: '4.2', q: 'Any surgeries, and when', t: 'text' },
        { id: '4.3', q: 'Any injuries or pain right now, or old ones that flare up', t: 'area' },
        { id: '4.4', q: 'Medications you take, and the dose', t: 'area' },
        { id: '4.5', q: 'Supplements, vitamins or powders you take now', t: 'text' },
        { id: '4.6', q: 'When did you last have bloods done?', t: 'chips',
          o: ['Last 6 months', '6 to 12 months ago', 'Over a year ago', "Can't remember"],
          note: 'Anything your GP flagged?',
          upload: { kind: 'file', required: false, multiple: true, accept: FILE_ACCEPT,
            instruction: 'A PDF, or a photo of each page',
            slots: [{ key: 'bloods', label: 'Add your results (optional)', name: 'blood results' }] } },
        { id: '4.7', q: "Your GP's name and clinic", t: 'text' },
        { id: '4.8', q: 'Family history of heart disease, diabetes, cancer or anything else', t: 'area',
          hint: 'Who had what, e.g. Dad, type 2 diabetes in his 50s.' },
        { id: '4.9', q: 'Has your doctor told you to watch anything?', t: 'multi', note: 'Anything else',
          o: ['Cholesterol', 'Iron', 'Blood pressure', 'Blood sugar', 'Thyroid', 'Vitamin D', 'Nothing'] }
      ] },
      { n: 5, t: "Women's health", lead: "It changes the food targets, so it's worth knowing.", chapter: 2, q: [
        { id: '5.1', q: 'Is your cycle regular?', t: 'chips', o: ['Regular', 'Irregular', 'Not sure', "Doesn't apply"],
          note: 'Heavy periods, bad PMS or cravings around it?', completes: { value: "Doesn't apply" } },
        { id: '5.2', q: 'Any contraception or hormone therapy?', t: 'text' },
        { id: '5.3', q: 'Pregnant, breastfeeding, or planning a pregnancy in the next year or two?', t: 'chips',
          o: ['No', 'Pregnant', 'Breastfeeding', 'Planning in the next 1 to 2 years', 'Rather not say'] }
      ] },
      { n: 6, t: 'Food likes and limits', lead: "So the plan is full of food you'll actually eat.", chapter: 3, q: [
        { id: '6.1', q: 'Allergies or intolerances', t: 'text', hint: 'Diagnosed, or just "it doesn\'t agree with me".' },
        { id: '6.2', q: "Foods you won't eat, no matter what", t: 'text' },
        { id: '6.3', q: "Foods you love and don't want to give up", t: 'text' },
        { id: '6.4', q: 'Any religious, cultural or personal food rules', t: 'text', hint: 'Fasting, vegetarian days, anything like that.' }
      ] },
      { n: 7, t: 'Breakfast', chapter: 3, q: [
        { id: '7.1', q: 'Do you eat breakfast?', t: 'chips', o: ['Most days', 'Sometimes', 'Rarely', 'Never'], note: 'What, and what time?' },
        { id: '7.2', q: 'If you skip it, why?', t: 'chips', o: ['Not hungry', 'No time', 'On purpose', 'Forget'] }
      ] },
      { n: 8, t: 'Your eating day', lead: "The most useful section. Don't tidy it up.", chapter: 3, q: [
        { id: '8.1', q: 'Walk me through everything you ate and drank yesterday, with rough times', t: 'area', big: true,
          hint: 'e.g. 7:30 am flat white. 10 am banana bread. 1 pm chicken wrap and a Coke Zero...',
          placeholder: 'Start with when you woke up.' },
        { id: '8.2', q: "Was that a normal weekday? If not, what's a typical one? And a typical weekend day?", t: 'area' },
        { id: '8.3', q: 'Snacks: what and when?', t: 'text' },
        { id: '8.3b', q: 'Why do you snack?', t: 'multi', o: ['Hungry', 'Bored', 'Stressed', 'Tired', 'Habit', 'Social'] },
        { id: '8.4', q: "Do you eat late at night, or when you're emotional?", t: 'chips', o: ['Often', 'Sometimes', 'Rarely'],
          note: 'What usually sets it off?' }
      ] },
      { n: 9, t: 'Dinner', chapter: 3, q: [
        { id: '9.1', q: 'What time do you usually eat dinner?', t: 'time' },
        { id: '9.2', q: 'Who do you eat with?', t: 'text' },
        { id: '9.3', q: 'Where do you eat it?', t: 'multi', o: ['At the table', 'On the couch', 'In front of the TV', 'In the car', 'At my desk', 'Standing up'] }
      ] },
      { n: 10, t: 'Drinks', chapter: 3, q: [
        { id: '10.1', q: 'How much water a day, roughly?', t: 'chips', o: ['Under 1 L', '1 to 2 L', '2 to 3 L', 'Over 3 L'] },
        { id: '10.2', q: 'Coffee and tea: how many, and with what?', t: 'text', hint: 'Milk type, sugar, syrups.' },
        { id: '10.3', q: 'Soft drink, juice, cordial or energy drinks: what and how often?', t: 'text' },
        { id: '10.4', q: 'Alcohol: how often?', t: 'chips', o: ['Never', 'Monthly or less', 'Weekly', 'Few times a week', 'Most days'],
          note: 'What, and how much on a typical night?' }
      ] },
      { n: 11, t: 'Pantry and fridge', lead: "No judgement. I just need to know what's in there.", chapter: 4, q: [
        { id: '11.1', q: "What's in there right now that you'd call junk?", t: 'multi', note: 'Brands and anything else',
          o: ['Chips', 'Chocolate', 'Biscuits', 'Lollies', 'Ice cream', 'Soft drink', 'Cakes or pastries', 'Frozen meals', 'Sugary cereal', 'Sauces and dressings', 'Muesli bars', 'Instant noodles'] },
        { id: '11.2', q: "Who's it for?", t: 'multi', o: ['Me', 'My partner', 'The kids', 'Guests'] },
        { id: '11.3', q: "Show me what's in there", t: 'photos', hint: 'Doors open, nothing tidied first. One photo each is plenty.',
          upload: { kind: 'photo', required: false, multiple: true, accept: PHOTO_ACCEPT, privacy: 'Only I see these.', count: true,
            slots: [
              { key: 'pantry', label: 'Pantry', sub: 'Every shelf, top to bottom.', name: 'pantry' },
              { key: 'fridge', label: 'Fridge', sub: 'Shelves and door racks.', name: 'fridge' },
              { key: 'freezer', label: 'Freezer', sub: 'Pull the drawers out.', name: 'freezer' },
              { key: 'plate', label: 'A typical plate', sub: "Lunch or dinner, as you'd normally serve it", name: 'a typical plate' }
            ] } }
      ] },
      { n: 12, t: 'Shopping', chapter: 4, q: [
        { id: '12.1', q: 'Where do you buy your produce and meat?', t: 'multi', note: 'Anywhere else?',
          o: ['Woolworths', 'Coles', 'Aldi', 'IGA', 'Markets', 'Butcher', 'Online delivery', 'Costco'] },
        { id: '12.2', q: 'How often do you shop?', t: 'chips', o: ['Once a week', 'Twice a week', 'Every few days', 'Daily top-ups'], note: 'Who does it?' }
      ] },
      { n: 13, t: 'Cooking', chapter: 4, q: [
        { id: '13.1', q: 'How would you rate your cooking?', t: 'chips', o: ['Beginner', 'Can follow a recipe', 'Confident'] },
        { id: '13.2', q: 'How much time you realistically have to cook on a weeknight', t: 'chips', o: ['Under 15 min', '15 to 30 min', '30 to 45 min', '45 min plus'] },
        { id: '13.3', q: 'What can you cook confidently right now?', t: 'area' },
        { id: '13.4', q: "Kitchen gear you've got", t: 'multi', o: ['Air fryer', 'Slow cooker', 'Pressure cooker', 'BBQ', 'Blender', 'Good containers', 'Rice cooker', 'Food scale'] },
        { id: '13.5', q: 'Would you do a weekly meal prep?', t: 'chips', o: ['Yes', 'Maybe', 'No'], note: 'How long could you give it, and which day?' }
      ] },
      { n: 14, t: 'Household', chapter: 4, q: [
        { id: '14.1', q: 'Who do you cook for?', t: 'text', hint: 'Partner, kids and their ages, anyone else.' },
        { id: '14.2', q: 'Anyone at home with dietary needs, or very fussy eaters?', t: 'text' },
        { id: '14.3', q: 'Will the household eat the same food as you?', t: 'chips', o: ['Yes, same food', 'Mostly', 'No, separate meals'] }
      ] },
      { n: 15, t: 'Budget', lead: 'A ballpark is fine.', chapter: 4, q: [
        { id: '15.1', q: 'What you spend on groceries now, roughly', t: 'num', u: '$ / week' },
        { id: '15.2', q: "What you'd happily spend if it meant eating better", t: 'num', u: '$ / week' }
      ] },
      { n: 16, t: 'Eating out', chapter: 4, q: [
        { id: '16.1', q: 'Takeaway, delivery or eating out: how many times a week?', t: 'chips', o: ['0', '1 to 2', '3 to 4', '5 plus'],
          note: 'Your go-to orders and places' }
      ] },
      { n: 17, t: 'Past diets and digestion', chapter: 4, q: [
        { id: '17.1', q: "Diets or programs you've tried: what worked, what didn't, and why?", t: 'area' },
        { id: '17.2', q: 'Any tummy issues?', t: 'multi', o: ['Bloating', 'Reflux', 'Constipation', 'Loose stools', 'None'], note: 'With which foods?' }
      ] },
      { n: 18, t: 'Sleep', lead: 'Your usual week, not your best one.', chapter: 5, q: [
        { id: '18.1', q: 'Usual bed time and wake time', t: 'pair', time: true, p: ['Bed', 'Wake'] },
        { id: '18.2', q: 'Hours you actually sleep', t: 'num', u: 'hours', hint: 'Not time in bed. Your best guess is fine.' },
        { id: '18.3', q: 'Sleep quality', t: 'scale', ends: ['Terrible', 'Brilliant'] },
        { id: '18.4', q: 'Do you wake during the night?', t: 'chips', o: ['Rarely', 'Once', '2 or more times'] }
      ] },
      { n: 19, t: 'Stress', chapter: 5, q: [
        { id: '19.1', q: 'Your stress level most weeks', t: 'scale', ends: ['Calm', 'Flat out'] },
        { id: '19.2', q: 'The main sources', t: 'text' },
        { id: '19.3', q: 'How do you unwind?', t: 'text' }
      ] },
      { n: 20, t: 'Work', chapter: 5, q: [
        { id: '20.1', q: 'What do you do, what hours or shifts, and any regular work travel?', t: 'area' },
        { id: '20.2', q: 'Your work day is mostly', t: 'chips', o: ['Desk-based', 'On my feet', 'A mix'] },
        { id: '20.3', q: 'Do you get a proper lunch break? When?', t: 'text' }
      ] },
      { n: 21, t: 'Activity', lead: 'Now the training side.', chapter: 5, q: [
        { id: '21.1', q: 'Daily steps, if you track them', t: 'num', u: 'steps' },
        { id: '21.2', q: 'What exercise are you doing right now, and how often?', t: 'area', hint: '"Not much" is a fine answer.' },
        { id: '21.3', q: 'Training background', t: 'chips', o: ['New to weights', 'Some experience', 'Lifted regularly before', 'Train now'],
          note: 'Followed a program or had a PT?' },
        { id: '21.4', q: 'What do you enjoy, and what do you hate?', t: 'text' },
        { id: '21.5', q: 'Days a week you can realistically train', t: 'chips', o: ['2', '3', '4', '5', '6'] },
        { id: '21.6', q: 'How long per session?', t: 'chips', o: ['30 min', '45 min', '60 min', '75 min plus'] },
        { id: '21.7', q: 'Time of day that suits you', t: 'multi', o: ['Early morning', 'Mid-morning', 'Lunchtime', 'Afternoon', 'Evening'] }
      ] },
      { n: 22, t: "Where you'll train", chapter: 5, q: [
        { id: '22.1', q: 'Which gym (name and suburb), or at home?', t: 'text' },
        { id: '22.2', q: "What equipment have you got at home? And any machines or exercises you're not comfortable with yet?", t: 'area' }
      ] },
      { n: 23, t: 'Anything else', lead: 'Last one.', chapter: 5, q: [
        { id: '23.1', q: "Anything else I should know, or anything you're nervous about?", t: 'area' }
      ] }
    ]
  };

  /* Screen strings: copy-deck.md v1.1 sections 3.1 to 3.12 (build text column), and the brief's rulings. */
  var STR = {
    wordmarkLabel: 'Hygieia',
    pageTitle: "HYGIEIA · {first}'s intake",
    pageTitleNoName: 'HYGIEIA',

    // 3.1 Welcome
    from: 'From', fromName: 'Georgio',
    welcomeH: "{first}, let's get the full picture",
    welcomeHNoName: "Let's get the full picture",
    welcomeLead: 'Your food rules and training are coming. I want them built around your actual life, not a generic plan, so this comes first.',
    welcomeNote: 'I know most of this from our chat, but so I can put the whole picture together, please give it all to me again here. Pretend I know nothing.',
    facts: [
      'About 20 to 30 minutes.',
      'It saves as you go on this device, so you can do it over a few sittings.',
      "Skip anything. Come back to it later, or don't.",
      'Short answers, dot points and typos are all fine.'
    ],
    factLastBefore: 'If you only give one section real time, make it ',
    factLastName: 'Your eating day',
    factLastAfter: '.',
    start: 'Start',
    underStart: '23 short sections',
    resumeH: 'Welcome back, {first}',
    resumeHNoName: 'Welcome back',
    resumeLead: "You're up to {title}, section {n} of 23. Everything so far is saved.",
    resumeLeadReview: "You're up to the review. Everything so far is saved.",
    resumePrimary: 'Pick up where I left off',
    resumeSecondary: 'Start from the top',

    // 3.2 Chrome
    step: '{n} of 23',
    progress: 'Section {n} of 23, {title}',
    back: 'Back',
    next: 'Next',
    reviewMine: 'Review my answers',
    backToReview: 'Back to review',
    blank: 'You can leave any of this blank.',
    savedToast: 'Saved',
    savedLabel: 'Saved on this device',
    saveFailed: "This browser isn't saving your answers. Finish in one go, or use Copy my answers on the last screen.",
    hintLine: 'Press Enter for next',
    hintArea: 'Enter adds a line. Cmd + Enter for next',
    hintAreaWin: 'Enter adds a line. Ctrl + Enter for next',
    pickAny: '(pick any)',
    inOrder: '(in order)',
    rankFull: "That's 3. Take one off to swap it.",
    rankedName: '{option}, ranked {n} of 3',
    scaleName: '{n} out of 10',
    numErr: 'Numbers only here, e.g. 72.5',
    dateErr: "That date's in the future. Check the year.",

    // Sections sheet (3.12)
    sheetTitle: 'Sections',
    sheetLine: "Tap one to go there. Everything's saved.",
    done: 'Done',
    here: "You're here",
    notStarted: 'Not started',
    skipped: 'Skipped',
    aOfT: '{a} of {t}',

    // 3.4 Uploads
    addPhoto: 'Add photo', addFile: 'Add file',
    addPhotoName: 'Add photo, {slot}', addFileName: 'Add file, {slot}',
    addAnotherPhoto: 'Add another photo, {slot}',
    addAnotherPage: 'Add another page',
    countLine: '{n} of 4 added',
    uploading: 'Uploading {n}%',
    uploadingName: '{Slot} photo uploading, {n} percent',
    cancel: 'Cancel', cancelName: 'Cancel {slot} upload',
    added: 'Added',
    replace: 'Replace', replaceName: 'Replace {slot} photo',
    removeName: 'Remove {slot} photo',
    removeNameOf: 'Remove {slot} photo {i} of {n}',
    removeFileName: 'Remove {file}',
    thumbAlt: '{Slot} photo you added',
    photoRemoved: 'Photo removed', fileRemoved: 'File removed',
    undo: 'Undo', undoName: 'Undo remove',
    tooBigPhoto: "That photo's over {mb} MB. Choose a smaller one, or take a new one.",
    tooBigFile: "That file's over {mb} MB. Try a photo of each page instead.",
    wrongPhoto: "That file won't open here. Use a photo: JPG, PNG or HEIC.",
    wrongFile: "That file won't open here. Use a PDF or a photo.",
    failed: "That one didn't upload. Check your connection and try again.",
    tryAgain: 'Try again', retryName: 'Try uploading {slot} photo again',
    queuedOffline: "You're offline. It'll upload when you're back.",

    // 3.5 Review
    reviewTitle: 'Review',
    lastStep: 'Last step',
    reviewH: 'Ready to send?',
    reviewSum: '{answered} of {total} answered',
    reviewLead: 'Gaps are fine. Fill in what you can, or send it as it is.',
    photosLine: '{n} of 4 photos',
    edit: 'Edit', editName: 'Edit {title}',
    nudge: "Your eating day is the one I use most. Worth a couple of minutes if you've got them.",
    reviewPrimary: 'Next: send it',

    // 3.6 Consent (B: its own screen)
    consentH: 'Before you send',
    whatsGoing: "What's going",
    answersRow: 'Answers', photosRow: 'Photos',
    consentText: "I'm happy for Georgio to store my answers and photos and use them with his AI tools to build my plan. They won't be shared with anyone else, and I can ask for them to be deleted at any time.",
    consentText2: 'This is coaching, not medical advice.',
    safety: 'If anything here worries you, see your GP.',
    send: 'Send to Georgio',
    tickHint: 'Tick the box above to send.',

    // 3.7 Submitting
    sendingEyebrow: 'Sending',
    sendingH: 'Sending to Georgio',
    sendingBody: "Photos can take a minute. Keep this page open until it's done.",
    sendingPhotos: 'Sending {n} of {total} photos',
    leaveWarn: 'Your answers are still sending. Leave anyway?',

    // 3.8 Thank-you (brief: "[timeframe]" clause dropped; no photo; no button; no "See my answers" yet)
    thanksH: "Thanks, {first}. That's the hard part done.",
    thanksHNoName: "Thanks. That's the hard part done.",
    thanks1: "I'll read every answer and put the whole picture together.",
    thanks2: 'Your food rules come first, then the training.',
    thanks3: 'Nothing else to do. You can close this page.',
    thanksMore: 'Thought of something else? Just reply to my email.',
    signOff: 'Georgio',

    // 3.9 Errors and offline
    offlineBanner: "You're offline. Keep going: your answers are saving on this device.",
    backOnline: 'Back online',
    notSent: 'Not sent yet',
    offlineH: "You're offline",
    offlineBody: "This can't send until you're back online. Nothing's lost. Tap Try again once you're connected.",
    savedCard: 'Saved on this device: {answers} and {photos}',
    savedCardNoPhotos: 'Saved on this device: {answers}',
    nAnswers: '{n} answers', oneAnswer: '1 answer',
    nPhotos: '{n} photos', onePhoto: '1 photo',
    failedH: "That didn't send",
    failedBody: "Nothing's lost. Your answers and photos are still saved on this device. Check your connection and try again.",
    stillNot: 'Still not going? Copy your answers and paste them into a reply to my email.',
    copy: 'Copy my answers',
    copied: 'Copied. Paste it into your reply to Georgio, and attach your photos.',
    copyManual: 'Your answers are selected below. Copy them and paste them into your reply.',
    // Session too old (deck 3.9), split across heading and body, same words
    changedH: 'This link has changed since you started.',
    changedBody: 'Your answers are still here. Try again, or copy them and reply to my email.',
    // Link not working (creative-director's build brief, 11 Nov 2026)
    badH: "This link isn't working.",
    badBody: "Message Georgio and he'll send a new one.",

    // 3.10 Copy-out summary
    sumHead: "{FIRST}'S INTAKE",
    sumHeadNoName: 'INTAKE',
    sumDate: 'Filled in {date}',
    sumSkipped: 'Not answered yet: {ids}',
    sumConsent: 'Consent to store and use with AI tools: {v}',
    yes: 'Yes', notTicked: 'Not ticked',
    outOf10: '{n} out of 10'
  };

  function countItems(intake) {
    return intake.sections.reduce(function (n, s) { return n + s.q.length; }, 0);
  }

  // The unit check from build-spec 3.3 and the dash check from 9.
  function selfCheck() {
    var problems = [];
    if (INTAKE.sections.length !== 23) problems.push('sections: ' + INTAKE.sections.length + ', want 23');
    var items = countItems(INTAKE);
    if (items !== 82) problems.push('items: ' + items + ', want 82');
    var want = [4, 4, 6, 9, 3, 4, 2, 5, 3, 4, 3, 2, 5, 3, 2, 1, 2, 4, 3, 3, 7, 2, 1];
    INTAKE.sections.forEach(function (s, i) {
      if (s.n !== i + 1) problems.push('section order at ' + (i + 1));
      if (s.q.length !== want[i]) problems.push('section ' + s.n + ' has ' + s.q.length + ' items, want ' + want[i]);
    });
    var all = JSON.stringify(INTAKE) + JSON.stringify(STR);
    if (/[\u2013\u2014]|&[mn]dash;/.test(all)) problems.push('em-dash or en-dash found in strings');
    return problems;
  }

  var api = { INTAKE: INTAKE, STR: STR, selfCheck: selfCheck, countItems: countItems };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    if (typeof require !== 'undefined' && require.main === module) {
      var p = selfCheck();
      if (p.length) { console.error('FAIL\n' + p.join('\n')); process.exit(1); }
      console.log('OK: 23 sections, ' + countItems(INTAKE) + ' items, no em-dashes or en-dashes');
    }
  } else {
    root.HY = api;
  }
})(typeof window !== 'undefined' ? window : this);
