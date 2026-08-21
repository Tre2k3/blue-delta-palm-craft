# Basketball

901 Court uses projectile + rim logic. Makes are not awarded from animation alone.

## States (logical)

NO_BALL → POSSESSION / DRIBBLE → CHARGE → RELEASE → BALL_FLIGHT → MAKE / MISS → REBOUND → RESET → EXIT_COURT

## Controls

- Move: WASD / stick
- Tap / press shoot: gather
- Hold: charge (power meter, green window)
- Release in green: better make chance
- Miss: rebound, try again
- Leave court: button / back

Target for Chapter 1: **8 points**. Court OG is on the fence. Spectators live in the court crowd sprites.

## QA

`window.__gameTest.setBallScore(8)` credits the mission only if the basketball step is active and not already done.
