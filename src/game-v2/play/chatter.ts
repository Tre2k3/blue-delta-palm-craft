import type { Place } from "../core/types";

/**
 * What the people of Memphis say when Benji walks up and speaks. Nobody here is part of the
 * story: they are who is on the street, at the fence, in the queue. Each has a name that stays
 * theirs, and talks about what they are doing, where they are, the hour, the weather, Benji
 * himself, and what there is to do round the city. Spoken to again, they say something else.
 */

const WOMEN = ["Keisha", "Monique", "Tiana", "Shay", "Bri", "Miss Pearl", "Jada", "Kiara", "Simone", "Toya", "Aaliyah", "Ms. Gwen", "Destiny", "Nikki", "Raven", "Imani"];
const MEN = ["Marcus", "Tone", "Jay", "Deon", "Slim", "Mr. Otis", "Quan", "Terrance", "Kev", "Darius", "Lamar", "Mr. Curtis", "Dub", "Chris", "Trell", "Malik"];

/** What they are in the middle of. */
const DOING: Record<string, string[]> = {
  walk: [
    "Just getting my steps in. This city looks good on foot.",
    "Headed to the trucks. You smell them wings from here?",
    "I walk these blocks every day. Never the same day twice.",
    "You good? You look like you got somewhere to be.",
    "Watch them drivers on Riverside. They don't slow down for nobody.",
    "Can't stop long, but I always got a minute for you.",
  ],
  court: [
    "Court OG been running this floor since before you could dribble.",
    "Game to eleven. Win it and the whole fence hears about it.",
    "Ace don't miss from the corner. Get a hand up on him.",
    "Three in a row and you on fire. Next one's a dunk. I seen it.",
    "Want next? Sign up at the table outside the gate.",
    "Jump right at the top of his shot. That's how you get the block.",
  ],
  pier: [
    "They biting today. Unc J got bait at the shack.",
    "Reel when it rests, let go when it runs. That's the whole secret.",
    "Somebody pulled a ten-pounder off this pier last week.",
    "Throw it far. The big ones sit out deep.",
    "River been good to me this morning. Go on, get a line wet.",
  ],
  race: [
    "Nitro runs three laps round downtown. Ain't many beat him clean.",
    "Hit it dead on GO. That launch is half the race.",
    "Press right on them gates and you get a boost.",
    "I got money on you. Don't make me look crazy.",
    "Follow the arrows on the road. Brake before the boards.",
  ],
  karts: [
    "Them karts quicker than they look. Ease off before the hairpin.",
    "My cousin's in the red one. He drives like he stole it.",
    "Win out here and they hand you tickets inside.",
    "Best seat at the Fun House is right on this fence.",
  ],
  watch: ["I'm just watching. Go ahead, I'm not in line.", "This the best seat in the house.", "You next? I want to see this.", "I been standing here an hour. Can't look away."],
  play: ["Hold up, I'm on a streak.", "This machine owe me tickets.", "One more game. That's what I said three games ago.", "Don't jinx me now."],
  eat: [
    "These wings hitting. Veli don't play.",
    "Get the catfish plate. Trust me.",
    "I come down here every Friday for this.",
    "Don't talk to me till I finish this plate. Nah, I'm playing. What's up?",
    "Eat something before you go run around. Pays better on a full stomach.",
  ],
  // Eating indoors: the Fun House sells pizza, not wings.
  slice: ["This slice is bigger than my head.", "Pizza and tickets. That's a good day.", "Get a slice before you play. You'll thank me.", "Don't talk to me till I finish this slice. Nah, I'm playing. What's up?"],
  dance: ["That's my song! Come on, two-step with me.", "DJ been on one all night.", "You can't stand still to this. Don't even try.", "Beale taught me this one."],
  cheer: ["Let's go! You see that?", "I been yelling all day. I got no voice left.", "That's what I came out here for!"],
  throw: ["Watch this arm.", "Three balls, six bottles. Easy money.", "Take one out the bottom row and they all come down."],
  stand: ["Just taking it all in.", "I'm waiting on somebody. They always late.", "Good spot to watch the city go by."],
};

/** Where they are, indoors. */
const ROOMS: Partial<Record<Place, string[]>> = {
  hq: [
    "Everything on these racks is real. You can order it for real.",
    "That new drop hard. I'm getting two.",
    "K Blanco keep this place spotless.",
    "Fitting room's right there. You can change on the spot.",
  ],
  bowl: [
    "Strike runs the desk. She'll put you on a lane.",
    "Aim a board left of the headpin. Thank me later.",
    "Two strikes in a row and the whole alley hears it.",
    "Bowl a hundred and they start learning your name in here.",
  ],
  fun: [
    "Laser tag is a whole war. Stay with your team and hit their base.",
    "Skee-Ball pays the most tickets if you got the touch.",
    "Save your tickets for the prize counter. That 224 jersey is up there.",
    "The ball pit got prizes buried in it. For real.",
    "Air hockey table's in the corner. First to five.",
    "Them two cabinets in the row play real games. Whole browser in there.",
  ],
  club: [
    "That band been the house band since before you were born.",
    "Put five in the jar and they'll play what you ask for.",
    "Wait till the saxophone takes it. Whole room goes quiet.",
    "My daddy brought me here. His daddy brought him.",
    "Get out on that floor. Nobody in here is judging.",
    "This room used to show pictures. Now it shows you what the blues is.",
  ],
};

/** Where they are, out of doors. */
const DISTRICTS: Record<string, string[]> = {
  "On the River": ["River looks good from out here, don't it?", "They light that bridge up every night. Whole show."],
  Riverfront: [
    "River looks good at sunset, don't it?",
    "They light that bridge up every night. Whole show.",
    "The boutique's right on the plaza. Can't miss the green.",
    "Food trucks down the way got the whole block smelling right.",
    "The pier's at the end of the walk. Unc J got you on bait.",
  ],
  Downtown: [
    "Downtown moves fast. Look both ways.",
    "Street race runs right through here. Red arrows on the road.",
    "The Fun House is over that way. Lit up like a carnival.",
    "You can see the Pyramid from the corner on a clear day.",
  ],
  "Beale Street": ["Beale don't sleep. Neon comes on and so do we.", "Home of the blues, baby. Listen.", "Every door on this street got music behind it.", "Come back after dark. Whole street glows.", "They jookin inside the arch again. G-Lyde don't touch the ground.", "That's Memphis rap on that speaker. Jookin was born to it."],
  Midtown: ["Midtown's quiet in the day. Bowl's right over there though.", "901 Bowl got the cleanest lanes in the city.", "I like it out here. Room to breathe."],
  "Orange Mound": [
    "Orange Mound. This where the real ones stay.",
    "They got game tables at the park. Chess, dominoes, spades, all of it.",
    "Putt-putt and tennis down on Park Avenue now. Cornhole too.",
    "Mr. Earl been at that chess table all week. Go humble him.",
    "Nine holes at Sack Putt. Watch that paddle wheel.",
  ],
};

const HOURS = {
  night: ["City looks different at night. Better, if you ask me.", "Fireworks went up over the river when the sun went down. You catch that?", "Watch for the searchlights over the boutique.", "Bridge is showing out tonight."],
  golden: ["This that golden hour. Take a picture.", "Sun's going down. Bridge about to light up.", "Best light of the day, right now."],
  day: ["Good day to be outside.", "Look up. You might catch the blimp.", "Sun's out, everybody's out."],
};
const RAIN = ["This rain ain't stopping nothing. Memphis don't melt.", "Streets shine when it rains like this.", "You out here in the rain too? Respect.", "Wait on it. Might be a rainbow over the river after."];

/** Benji himself. `{rank}`, `{fit}` and `{ride}` are filled in. */
const NEW_FACE = ["You new around here? Go see K Blanco at the boutique.", "Ain't seen you before. Welcome to Memphis.", "First day? Everybody starts at the boutique."];
const KNOWN = ["They been calling you {rank}. I heard.", "{rank}, huh? Keep stacking that Respect.", "You the one from the boutique. I see you.", "My people told me about you. {rank}."];
const LOOKS = ["That {fit} is clean.", "Where you get that {fit}? The boutique?", "I seen you pull up in that {ride}. Wrap is crazy.", "That {ride} yours? Alright now."];

/** Things worth knowing. */
const TIPS = [
  "Pause and try Photo mode. Six spots round the city pay for a postcard.",
  "You can call a ride from the map. Ten dollars, anywhere.",
  "Check the pause menu. Today's drop pays extra, every day.",
  "Coins all over these sidewalks. Stack enough and the blue jersey is yours.",
  "Garage got six rides. That Drop Van don't stop for nothing.",
  "You can link up with your friends now. Hit Friends and start a crew.",
  "Spades at the park. Tasha needs a partner.",
  "Cornhole on Park Avenue. Mr. Willie don't lose to strangers.",
  "Go jump in that cypher in Handy Park. Land it on the beat and the floor is yours.",
  "Hold the handbrake through a turn. They score your drift.",
  "Tennis courts on Park Avenue. Coach Renee will run you.",
  "Got a full cooler? Unc J buys every fish at the bait shack.",
];

/** The ones with names in the story, for when they have no errand for him. */
const CAST_SAYS: Record<string, string[]> = {
  kBlanco: ["Everything on the racks is the real line, baby. Pick something out.", "Drop Day don't run itself. I need you out there.", "You wearing it right. Go let Memphis see it."],
  courtOg: ["Good players get buckets. Great ones lift others.", "Sign the sheet when you ready. Shootout, eleven, or practice.", "Hands up on defence. I'm watching."],
  uncJ: ["River don't rush, and neither should you.", "Bait's five for ten. Fish, I buy all day.", "Big ones bite when the light gets low."],
  mamaDee: ["You eat today, baby? Go order at the window.", "A full plate keeps you paid. Ten percent more, till it wears off.", "I been feeding this riverfront twenty years.", "Tell K Blanco I said bring me one of them aprons."],
  strike: ["Lane's open whenever you are.", "Keep your wrist straight and follow through.", "Two strikes in a row and I ring the bell myself."],
  nitro: ["Three laps round downtown. You ready, or you talking?", "I don't lose on Riverside. Ask anybody.", "Hit them gates right or eat my dust."],
};

/** What one of the named cast says the `turn`-th time he just stops to talk. */
export function castLine(id: string, turn: number) {
  const list = CAST_SAYS[id] ?? HELLO;
  return list[turn % list.length]!;
}

const HELLO = ["Hey now.", "What's good?", "Alright now, be easy.", "What up, young blood.", "Have a blessed one.", "Stay up.", "Good to see you out here."];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The name that goes with a face: always the same one for the same person. */
export function nameOf(key: string, female: boolean) {
  const list = female ? WOMEN : MEN;
  return list[hash(key) % list.length]!;
}

export type Scene = {
  /** What they are in the middle of: a key of DOING. */
  doing: string;
  district: string;
  place: Place;
  phase: "golden" | "night" | "day";
  rain: boolean;
  rank: string;
  rankIndex: number;
  fit: string;
  ride: string;
};

/**
 * What this person says on the `turn`-th time Benji speaks to them. The first thing is always
 * about what they are doing; after that they go round the place, a tip, Benji, the hour and a
 * plain hello, and each time round they pick a different one.
 */
export function chat(key: string, scene: Scene, turn: number) {
  const seed = hash(key);
  const round = Math.floor(turn / 6);
  const pick = (list: string[], salt: number) => list[(seed + salt * 7 + round) % list.length]!;
  const here = scene.place === "street" ? (DISTRICTS[scene.district] ?? DISTRICTS.Downtown!) : (ROOMS[scene.place] ?? HELLO);
  let text: string;
  switch (turn % 6) {
    case 0:
      text = pick(DOING[scene.doing === "eat" && scene.place !== "street" ? "slice" : scene.doing] ?? DOING.stand!, 1);
      break;
    case 1:
      text = pick(here, 2);
      break;
    case 2:
      text = pick(TIPS, 3);
      break;
    case 3:
      text = (seed + round) % 2 ? pick(LOOKS, 4) : pick(scene.rankIndex > 0 ? KNOWN : NEW_FACE, 4);
      break;
    case 4:
      text = scene.place !== "street" ? pick(HELLO, 5) : scene.rain ? pick(RAIN, 5) : pick(HOURS[scene.phase], 5);
      break;
    default:
      text = pick(HELLO, 6);
  }
  return text.replace("{rank}", scene.rank).replace("{fit}", scene.fit).replace("{ride}", scene.ride);
}

/** Every line there is, for the tests. */
export const ALL_LINES = [...Object.values(DOING).flat(), ...Object.values(ROOMS).flat(), ...Object.values(DISTRICTS).flat(), ...HOURS.night, ...HOURS.golden, ...HOURS.day, ...RAIN, ...NEW_FACE, ...KNOWN, ...LOOKS, ...TIPS, ...HELLO, ...Object.values(CAST_SAYS).flat()];
