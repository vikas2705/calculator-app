# Prompts used

The opening prompts used to plan and design this project, in order and verbatim: understanding the problem
statement, the decisions, the build plan, the UI mock-ups (Google Stitch) and the final UI design (Claude).
The later prompts, which were testing feedback and small UI adjustments made while building, are not included.

AI tools: Claude Code (planning and coding), Google Stitch (UI mock-ups), Claude (design system).

---

## 1. Understanding the problem statement (Claude Code)

> Hi. I have got a problem statement that i need to make. But before starting to code , i want to discuss with you about the problem statement.
> I have made a folder called calculator where we will build our product. This is the problem statement - /Users/apple/Desktop/fibo/calculator/calculator-app-problem-statement.pdf
>
> Now, first of all I want you to go through it and understand every single detail  and requirement it mentions. After understanding, tell me what you understand. What we need to do, what issues we might get and all the edge cases for the product that we will need to consider and reaolve while building the product itself. keep it a bit short while you give me the summary though.
> Also, As you will gothrough this problem statement its not much challenging SO the important part is THE UI it should be modern and well developed/redable code.
> Beyond that you have also independency to add your thoughts and recommendations I will reply to those.
>
> Whatever we ar building should be aim to be clean, maintainable, unique and simple while considering all the edge cases and issues and solving that issue.

## 2. Answering the first round of questions (Claude Code)

> 1. We need more operations: add, subtract, multiply, divide along with other operations like square root, percentage and please add all the other possible mathematical operation that we can add here.
> 2. For now, we will work on local so we do not need to setup a Git repo.
> 3. All the 5 recommendations you mentioned I agree and want to incorporate in our project - these are some of the things I want and require in our project.
> 4. We will keep it Phone-style so that as the user keeps adding new operations and numbers, we should be able to see the results of the previous typed operation below in a bit faded/light color and then when they press equals to , only then that result should be more highlighted.
> 5. Keep the % Simple: 50% → 0.5
> 6. In terms of visuals I want to keep it in frosted glass theme. It should be aesthetic and unique as well as pleasing to the eyes.
> 7. Should I include the optional operations and the Dockerfile? - Yes , we need to add more operations and Dockerfile is a must because we want this product to run on any leptop easily through a link without having them setting everything up in their systems.
>
> Some other requirements and checks -
> 1. We will need to set a meaningful logical limit on how many digit number the user can type and perform operations with on the basis of how much our system can handle.
> 2. Code should be clean and maintainable with nothing extra.
> 3. We do not have to add authentication of any kind. We just need to make a simple calculator that works on all sizes - mobile, tab, laptop.
> 4. We should be able to use this with using keyboard only without a mouse.
> 5. We need to write test cases and unit tests for the product as well and test it throughly for any unknown edge case that we might have missed.
> 6. And in last we will also make a swagger document for our API

## 3. Asking for a UI mock-up prompt (Claude Code)

> Could you give me a prompt meanwhile that I can give to stich to create few few different visuals of different kinds for this calculator product based on the discussion we had so far so that we have some options for the ui as well as could have an idea on how the product gonna look like.

## 4. UI mock-ups (Google Stitch)

Main prompt:

```
Design a modern, aesthetic calculator web app in a "frosted glass" (glassmorphism) style. It must look unique and premium, not like a default phone calculator. Show it on three screen sizes: mobile (390px wide), tablet (820px), and laptop (1440px).

VISUAL STYLE
- A translucent frosted-glass calculator panel floating over a soft, colorful, blurred gradient background with slowly drifting abstract color blobs.
- Glass surfaces: background blur, subtle white inner border (1px, low opacity), soft layered shadows, slightly rounded corners (20–28px).
- Buttons are also glass, with gentle hover and pressed states and a clearly visible keyboard focus ring (accessibility matters).
- Text must stay highly readable on glass (good contrast).
- Clean geometric sans-serif font; the numbers on the display use tabular (fixed-width) digits.
- Include both a light and a dark theme, with a small sun/moon toggle in the top corner.

DISPLAY AREA (top of the calculator), three lines:
1. Small, muted line: the expression typed so far, e.g. "12 + 7 ×"
2. Large, bright line: the number currently being typed, e.g. "4"
3. Faded preview line: the live result, e.g. "= 76"
Also show a second state of the same screen AFTER pressing equals: the result "76" becomes large, bright and highlighted, and the expression moves up above it.
Also show an error state, e.g. "Can't divide by zero", styled softly (not harsh red).

KEYPAD
- Main grid: digits 0–9, decimal point, +, −, ×, ÷, =, %, ± (plus/minus), backspace, AC (clear).
- Equals button is the visual hero: a distinct accent color.
- Operators use a secondary accent; digits are neutral glass.
- A "scientific" toggle reveals an extra row/panel with: √x, ∛x, x², xʸ, ʸ√x, 1/x, |x|, n!, mod, log, ln, eˣ, 10ˣ, sin, cos, tan, π, e, and a DEG/RAD switch.
- Large tap targets on mobile.

HISTORY TAPE
- A list of past calculations (e.g. "12 + 7 × 4 = 76"), newest on top, with a small "Clear history" button.
- Laptop: a glass side panel next to the calculator.
- Tablet: beside or below the calculator.
- Mobile: a slide-up bottom sheet opened by a history icon.

EXTRAS
- A small "?" icon that opens a keyboard shortcuts overlay: 0–9 and . to type, + − * / for operators, ^ for power, % for percent, Enter or = for equals, Backspace to delete, Esc to clear, ? for help.
- No login, no accounts, no ads, no extra pages: just the calculator.
```

Style variations (sent as follow-ups):

```
Same calculator, dark theme first. Deep navy/near-black background with glowing aurora blobs in teal, violet and magenta. Equals button glows teal. Mood: calm, futuristic, night sky.
```
```
Same calculator, light theme first. Soft pastel gradient background (peach, lilac, baby blue). Milky white frosted glass, very airy. Equals button in a warm coral. Mood: friendly, soft, fresh.
```
```
Same calculator in an almost colorless style: cool grays, icy whites and a single electric-blue accent used only on the equals button and focus rings. Background is a subtle grayscale gradient with faint light refractions. Mood: minimal, precise, Apple-like restraint.
```
```
Same calculator with a warm sunset gradient background (amber, orange, rose, deep plum at the bottom). Glass tinted slightly warm. Equals button in a golden amber. Mood: warm, cozy, vibrant.
```

> Note: the mock-up prompt was written before the operation list was narrowed to the PRD set, so it still mentions a scientific panel. The final product implements only the PRD operations.

## 5. Final decisions and request for the plan (Claude Code)

> 1. Yeah I understand that people will need docker installed and setup to run the project. Lets make Docker only for now. "Install Docker, run one command, open localhost:8080.
> 2. For the operation list - lets go with the operations mentioned in the PRD for now. Addition, Subtraction, Multiplication, Division, Exponentiation, Square Root, Percentage.
> 3. Live preview timing - I should be able to see them live instantly as I type.
> 4. Install Go - yes lets download it.
> 5. One assumption to confirm: the history tape will be saved in the browser, so it survives a page refresh, and it will have a "clear" button.  - this works for us.
>
> Another thing, the PRD mentions a lot of things like what we will be using for the Frontend, Backend and other requirements. So, make sure you follow all these while building this.
>
> Now, if everything is clear and you dont have anymore questions for me , lets move on to the plan. Make it properly and clearly so that you can follow it later on without hallucinating or misunderstanding. Also, make sure to add all the PRD requirements in it where needed so that when you start writing the code, you will not miss anything.

## 6. Approving the plan (Claude Code)

> Please start

## 7. Sharing the chosen UI design (Claude Code)

> Hi. I asked in claude to make the designs. i have added the ui part here -  /Users/apple/Desktop/fibo/calculator/calculator-pastel-aurora.html
>
> Also, it created a design system artifact file. so please follow it. I have attached the link. Let me know if you are not able to access it.
> [link to the design-system artifact removed here, because it contained a private share key]
