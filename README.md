# Newton's Cradle

A simple interactive Newton's Cradle simulation in plain HTML, CSS and JavaScript. No libraries needed.

## Features

- Drag any ball and let go. The balls on that side swing together.
- Throw the balls: the faster you move your mouse, the harder they go.
- Change the number of balls with the slider (2 to 12).
- Click sounds on every collision.
- Infinite mode: the balls never lose energy.
- Reset button to stop everything.

## Controls

| Action | Button | Key |
|---|---|---|
| Reset | Reset | `R` |
| Sound on/off | Geluid | `S` |
| Infinite mode | Infinite | `I` |

## How to run

1. Put `index.html`, `script.js` and `ball.png` in the same folder.
2. Open `index.html` in your browser.

## Settings

You can change these at the top of `script.js`:

| Setting | What it does |
|---|---|
| `ballSize` | Size of the balls |
| `length` | Length of the strings |
| `damping` | Energy loss per second (1 = none) |
| `bounce` | How much speed is kept at the swing limit |
| `swingLimit` | Maximum swing angle (radians) |
| `FORCE` | How hard a throw is |
| `maxSpeed` | Maximum speed of the balls |
| `BALL_IMAGE` | Image used for the balls |

## How it works

Each ball is a pendulum. When two balls touch while moving towards each other, they swap velocities, which creates the classic Newton's Cradle effect. The physics runs in small time steps so fast collisions stay accurate.
