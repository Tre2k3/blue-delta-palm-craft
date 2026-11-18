# Building a Last Dragon game from SackReligious · Memphis 901

This guide is for whoever builds a new game, by hand or with an AI, using this project as the
reference. The new game is an open-world martial-arts game in the spirit of *The Last Dragon*
(1985): Bruce Leroy, a young martial artist in Harlem looking for the Master and "the Glow", with
Sho'nuff, the Shogun of Harlem, calling him out across the city.

It says what this game is made of, what to keep, what to change, what has to be built new, and in
what order.

**Use this branch:** `claude/festive-bardeen-anqfxk` of
https://github.com/Tre2k3/blue-delta-palm-craft. The main branch is out of date.

---

## 1. What this game is, in one paragraph

A browser game, no download, that runs on phones and computers. A 3D city built in code (Three.js),
with flat drawn characters ("cards") that turn to face the camera and swap drawings for front,
back, side, walking and poses. You walk, drive, talk to people and play a dozen mini-games. A story
of three chapters sends you round the city, a reputation ladder grows with every job, and the music
is made live by the game rather than played from recordings. The whole thing is React for the
screens and menus, and one big game loop for everything in the world.

---

## 2. Where everything is

Everything that matters is in `src/game-v2/`. Art is in `public/game-v2/`.

| Folder / file | What it does | For the Last Dragon game |
| --- | --- | --- |
| `game.ts` | The heart. The game loop, walking, the camera, driving, who you can talk to, the spots you can interact with, the story's events, money and reputation, saving. | **Keep the shape**, rewrite the content. This is where the new city's spots, characters and missions are wired up. |
| `world/` | Builds the city in code: streets, buildings, signs, neon, landmarks, rooms you walk into. `kit.ts` has the building blocks (walls, neon, lamps, trees, signs). `map.ts` holds where everything is. `rooms.ts` holds the indoor places. | **Keep `kit.ts`, `collide.ts`, `ground.ts`.** Replace the Memphis layout with Harlem: avenues, brownstones, stoops, the theater, the pizza parlor, the dojo, the TV studio. |
| `actors/card.ts` | The drawn characters: front, back, sides, strides, poses, shadow, facing. | **Keep as is.** Every character in the new game is a card. |
| `actors/people.ts`, `crowd.ts` | People who walk the streets and do things at stops (watch, eat, queue, dance). | **Keep.** Fill them with Harlem locals. |
| `actors/traffic.ts`, `vehicle.ts` | Cars on a signal clock, and the car you drive. | **Keep** if the new game has driving; swap the car models for 1980s ones. |
| `play/` | One file per mini-game or system: `hoops.ts`, `bowling.ts`, `fishing.ts`, `race.ts`, `lasertag.ts`, `jook.ts` (a rhythm dance game), `story.ts` (the chapters), `chatter.ts` (what people say), `garage.ts`, `store.ts`. | **Keep `story.ts` and `chatter.ts`** as the pattern; rewrite their content. **`jook.ts` is the closest thing to a fight game here** (see section 5). Drop what doesn't fit. |
| `core/` | Input (keyboard, gamepad, touch), audio, the live band (`band.ts`), shared types and maths. | **Keep all of it.** `audio.ts` plays a recording wherever one is filed under a tune's name, so the game's existing music drops straight in (see the soundtrack row in section 4). |
| `gfx/` | Rendering: sky and time of day, water, rain, fireworks and confetti, graphics levels for slow phones. | **Keep all of it.** |
| `ui/` | The screens: HUD, menus, map, photo mode, the dance game's lanes, the first-person view. | **Keep the pieces**, restyle to the new look. |
| `net/` | Accounts, cloud saves, playing with friends, the "get in the game" requests. | **Optional.** Keep accounts and friends if wanted; drop the business requests. |
| `scripts/memphis-smoke.mjs` | ~180 automated checks that play the game and confirm each feature works. | **Copy the approach.** Write the same kind of checks for every new feature. |

---

## 3. How a mini-game plugs in

Every mini-game is an `Activity` (defined at the top of `game.ts`):

```ts
export interface Activity {
  hints: [string, string][];   // the control hints shown on screen
  update(dt: number): void;    // runs every frame while it is on
  hud(h: HudState): void;      // fills in what the screen shows
  quit(): void;                // the player backed out
  tap?(nx: number, ny: number): void; // a tap or click on the scene
}
```

The game starts one with `game.begin(activity, mode)`. A spot in the world starts it:

```ts
this.spot("street", x, z, radius, "Spar with the class", () => this.begin(this.dojo, "dojo"));
```

and the story hears about results through `game.emit("event", value)`. To add a mini-game: write a
file in `play/` that implements `Activity`, create it in `game.ts`, add a spot for it, and emit an
event when something worth counting happens. `play/jook.ts` and `play/hoops.ts` are good models.

---

## 4. Mapping the film onto this game

| Last Dragon idea | Built from | Notes |
| --- | --- | --- |
| **Bruce Leroy**, the player | Benji's card and walking (`actors/card.ts`, `updateWalk` in `game.ts`) | Bruce's existing sprites go in Benji's place: front, back and side, strides, and fight poses, listed in the card's `CardArt`. |
| **Harlem, mid-1980s** | `world/` (Memphis city) | Avenues and cross streets on the same grid; brownstones from `facade()`/`storefront()`; neon from `neon()`. Landmarks: a movie theater, a pizza parlor, a dojo, a video dance club, a TV studio, a rooftop. |
| **Sho'nuff and his gang** | The rivals in `hoops.ts` / `race.ts`, plus `story.ts` | A gang that turns up on the street and calls him out; bosses at the end of each chapter. |
| **Laura Charles and her video show** | The live band and stage (`actors/stageband.ts`, `world/club.ts`) and the TV screen on Beale | A dance club with a big video wall; her show plays on screens around the city. |
| **Eddie Arkadian and his heavies** | The story's errands and rivals | The second villain line: he wants Laura's show to play his girlfriend's videos. |
| **Johnny and Sophia, the pizza parlor** | The food trucks and their windows | Buy a slice to heal; Johnny is a quest giver. |
| **Searching for the Master** | The story chapters (`play/story.ts`) | Each chapter sends him to a different place looking for the Master. |
| **The Glow** | The "on fire" streak in `hoops.ts` and the win effects in `gfx/fx.ts` | A meter that fills with clean, on-time moves. Full, Bruce glows gold and his moves land harder. The final fight is won by finding it. |
| **Kung fu movie nights at the theater** | Photo mode and the arcade cabinets (`ui/Photo.tsx`, `ui/WebCabinet.tsx`) | Bruce watching martial-arts films: a place to learn new moves. |
| **Reputation on the street** | The Respect ladder (`RANKS` in `story.ts`) | New names, from "New in Harlem" up to "The Last Dragon". |
| **The soundtrack** | `core/audio.ts` and `scripts/audio-install.mjs` | Use the music you already have. Name each track after the place or moment it is for (the city by day and by night, the club, the dojo, a fight, the title screen), put the files in `public/game-v2/audio/music/`, and run `scripts/audio-install.mjs` to trim, level and loop them. A recording filed under a tune's name plays instead of the made-up band; `core/band.ts` lists the names. |

---

## 5. What has to be built new: the fighting

This game has no fight system. It is the one big piece to build. Two good ways in, both from parts
already here:

**A. Rhythm combat, from `jook.ts`.** The jookin game already shows moves coming down lanes on a
beat and grades each one perfect, good or miss. Turn the lanes into strikes (punch, kick, block,
sweep), have the opponent's attacks come down the same lanes as things to block, and drive the
Glow meter from the timing grades. This is the fastest way to a fight that feels good on a phone.

**B. Real-time combat, from the laser tag and hoops code.** `lasertag.ts` has opponents that move
with purpose, aim, hit and take hits; `hoops.ts` has a rival that reads what the player does
(blocks, fakes). Build a close-range version: light and heavy attacks, block, dodge, a stamina bar,
enemies that circle and wait for openings. More work, more depth.

Whichever you choose:

- **A sprite for every move**, front and back at least, hooked up through the card's `poses`.
- **Hit feedback:** a flash, a short pause on contact, a shake, a sound. `gfx/fx.ts` has the
  slow-motion and burst effects to borrow.
- **Difficulty that rises** as the story goes, the way the four basketball rivals do.
- **Touch buttons** for every action, as the laser tag screen has.

---

## 6. A story in three chapters

Use the same structure as `play/story.ts`: each step has a title, what to do, where (the map
marker), who sends you on it, what they say, and what it pays. A suggested outline; write all the
lines new:

1. **The Seeker.** Bruce's master sends him into Harlem to find the one who can teach him the
   last level. Learn to walk the city, train at the dojo, eat at the pizza parlor, see a kung fu
   film at the theater, stop the first of Sho'nuff's gang shaking down a shop.
2. **The Video Queen.** Rescue Laura from Arkadian's men, get her show back on the air, win a
   dance-off at her club, take on Sho'nuff's lieutenants across the neighbourhood.
3. **The Glow.** Sho'nuff calls Bruce out in front of the whole city. Beat his crew, find the
   Master's last lesson, and face Sho'nuff where the film's finale happens: reach the Glow to win.

Between chapters: daily jobs, side fights, postcards of the city, collectables, the reputation ladder.

---

## 7. The order to build it in

1. **Copy the project**, rename it, and get it running unchanged.
2. **Strip out** the SackReligious content: brand, products, real businesses, the store bridge,
   the "get in the game" screen, the Memphis landmarks.
3. **Lay out Harlem** in `world/` with the same kit: streets first, then the five key places
   (dojo, pizza parlor, theater, club, TV studio), then the dressing.
4. **Put Bruce's sprites in** for Benji's: standing, walking, then fight poses.
5. **Build the fight** (section 5) as one `Activity`, against one opponent, until it feels right.
6. **Add Sho'nuff and the gang**, the Glow meter, and the first boss fight.
7. **Write chapter one** in `story.ts` and its lines in `chatter.ts`; wire the cast so each one
   talks about the job in hand (see "The job in hand comes first" below).
8. **Put the music in**: file the tracks under the tune names (section 4) and run `scripts/audio-install.mjs`.
9. **Chapters two and three**, then side content.
10. **Checks for every feature** in a copy of `scripts/memphis-smoke.mjs`, then put it live.

---

## 8. Lessons this game learned the hard way

- **The job in hand comes first.** When a character is part of the current mission, talking to
  them must be about the mission, with one prompt and one action, never small talk alongside it.
  See `errand()` in `game.ts`.
- **One button, one thing.** Where two things are in reach, the nearest wins and only it is shown.
- **Characters stand on the ground.** Size each drawing by the body, not the head, or poses look
  squashed or float. See `scale` in `CardArt`.
- **Phones first.** Every action needs a touch button; every screen has to fit a phone held
  sideways; graphics drop a level by themselves when the frame rate falls.
- **Keep the city's random layout stable.** New places are built from their own random numbers so
  adding one does not move everything else.
- **Write a check for every feature** and run the whole set before going live.

---

## 9. Quick start for an AI builder

Paste this to the AI that will build the new game:

> Build an open-world browser game in the spirit of *The Last Dragon* (1985): Bruce Leroy in
> mid-80s Harlem, the search for the Master and the Glow, Sho'nuff as the rival. Use this project
> as the reference for how to build it: https://github.com/Tre2k3/blue-delta-palm-craft/tree/claude/festive-bardeen-anqfxk
> (work from that branch). Read `docs/LAST-DRAGON-GUIDE.md` there first. Reuse the engine in
> `src/game-v2/` (`game.ts`, `actors/card.ts`, `world/kit.ts`, `core/`, `gfx/`, `ui/`), replace
> all SackReligious and Memphis content, and build the fight system described in section 5 of
> the guide. Bruce and the cast already have sprites: use them.
