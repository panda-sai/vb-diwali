# vb-diwali — Diwali Dhamaka 🪔

A browser app that opens your camera, tracks your **face** and **hands**, and sets off Diwali crackers based on your expressions and gestures. **Wink** for the grand finale: "Happy Diwali" drawn in fireworks, read out loud.

Everything runs in your browser with [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker). No video is uploaded anywhere. All sounds are generated with the Web Audio API.

## Run

The camera only works on `localhost` or HTTPS, and ES modules need a server, so don't open the file directly:

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173 and click **Start camera**.

## Controls

| You do | Cracker | Demo key |
|---|---|---|
| 😁 Smile | Anar fountains (they keep going while you smile) | `1` |
| 😮 Open mouth | Sky rockets | `2` |
| 🤨 Raise eyebrows | Chakri spinners | `3` |
| 😗 Pucker / kiss | Heart rocket launched from your lips | `4` |
| ☝️ Point up | Phuljhadi sparkler on your fingertip (you can draw in the air) | mouse drag |
| ✌️ Victory | Twin rockets | `5` |
| ✊ Fist | Atom bomb (flash + screen shake) | `6` |
| 👍 Thumbs up | Ladi (a string of crackers) | `7` |
| ✋ Open palm | Sky shot burst at your hand | `8` |
| 🤟 I love you | Rainbow ring | `9` |
| 👎 Thumbs down | Golden willow | `0` |
| 😉 **Wink** | **Grand finale: "Happy Diwali!"** | `W` |

No camera? Click **Try demo mode** and use the keys, or click anywhere to launch a rocket.

The guide panel shows live meters for each face expression, so you can see how close you are to setting one off.

## Files

- `index.html`, `style.css`: UI
- `src/main.js`: camera, face and hand tracking, mapping expressions and gestures to crackers
- `src/fireworks.js`: canvas particle engine (rockets, bursts, anar, chakri, ladi, bomb, sparkler, text finale)
- `src/sound.js`: synthesized booms, crackles, whistles, chimes and the spoken greeting
