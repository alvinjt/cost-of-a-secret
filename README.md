# The cost of a secret

A static browser lab for two course ideas: how operation counts grow with input size, and how a timing side channel appears when an operation count depends on a secret.

Open `index.html` in a browser. That is the whole app. It is one page, with a slider, a number field, a dropdown, buttons, and toggles. Nothing is installed, and the strings you type stay in the tab.

## Run it

Double-click `index.html`, or from this folder:

```bash
python3 -m http.server 8765
```

Then visit `http://localhost:8765`.

To recheck the arithmetic of the model:

```bash
node test/model.test.js
```

## How to use it

1. In **How work grows**, move **n** and switch the algorithm. The table is the count at that one size. The chart is the same count for every size from 1 to 32. Turn on **Zoom the vertical scale** when the smaller curves sit on the axis. **Count the work** replays the counter. The thin meter is that count as a share of an all-pairs loop at the same n.
2. In **When the cost depends on a secret**, start from `CATS` and `CARS` or type your own strings (up to 12 characters). **Play the walk** marks the characters that get examined. **Step one character** pauses after each one. Switch **Stop early** and **Check every character**.
3. The staircase under the walk is the punchline. Each column is a longer shared prefix. Stop-early rises, then levels off at the width. Check-every is flat. The marked column is the guess you typed. **Plot a noisy fictional clock** scatters invented dots around the rising bars.

The three guess buttons fill in a first-character miss, a last-character miss, and an exact match, using the secret you can already see.

## Counts you can check by hand

| Setup | Result in the model |
| --- | --- |
| Secret `CATS`, guess `CARS` | Shared prefix 2. Stop-early examines 3 characters. Check-every examines 4. |
| n = 32, binary search | 6 probes |
| n = 32, mergesort estimate | 160 comparisons |
| n = 32, all pairs | 1,024 operations |

## What gets counted

- **Constant lookup:** 1 read, at every n.
- **Binary search:** floor(log₂ n) + 1 probes, the worst-case count.
- **Linear scan:** n probes.
- **Merge sort:** about n log₂ n comparisons, and 0 when n is 1. The curve is that estimate. The page does not run a sort.
- **All pairs:** n × n visits.
- **String compare:** one step per character examined. The width is the secret’s length. A short guess is padded with missing characters, and a missing character is a difference. Guess characters past the width are ignored.

Stop-early returns at the first difference. A failing guess whose shared prefix has length k takes k + 1 steps, unless that difference sits at the last position, in which case the walk has already covered the width. An exact match also takes the full width, because the routine returns early only on a difference. Check-every always takes width steps.

Check-every is still **O(n) in the public width**. What it removes is dependence on the secret’s characters. That is a different claim from O(1). The page says this next to the walk, because the two ideas are easy to fold together.

The noisy dots are a fictional clock: ten ticks per step, plus jitter between −9 and +9. They are seeded from the secret so the picture stays still. They are not measurements from your computer.

## What this page leaves alone

It does not time a real program, talk to a network, or recover a hidden secret. The secret stays visible so the cost function can be read off the screen.

On a real machine, a branch or a memory lookup that depends on a secret can leak even after the iteration count is fixed. The lab names that limit and stops at the iteration count. Variable-time code is still the right tool for search and sorting, where the data is not a secret. Passwords, keys, and tokens want a step count that does not move when the secret’s value moves.
