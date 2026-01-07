# frontend-ux-product-spec.md

# Neokta — Graphical & UX Specification  
**Version:** v1.3  
**Theme:** Digital Amusement Park with Korean Playground Vibes  
**Audience:** Product, UX/UI designers, frontend developers

---

## 0. Product Vision

Neokta is a **digital amusement park**.

Visitors enter the park to:
- explore playful attractions
- try simple games of chance
- enjoy a moment of excitement
- leave freely at any time

The experience should evoke:
- childhood amusement parks
- playground games
- local festivals
- safety and trust

This is **not** a casino.  
This is **not** a crypto dashboard.  
This is a **friendly park with clear, fair rules**.

---

## 1. Core Design Principles

### 1.1 Accessibility Above All
The interface must be understandable by:
- non-technical users
- older users
- first-time visitors
- experienced users

**Hard rule:**  
If a concept cannot be explained without technical words, it must be redesigned.

---

### 1.2 Emotional Tone
The experience should feel:
- welcoming
- calm
- playful
- nostalgic
- reassuring

It must never feel:
- aggressive
- urgent
- stressful
- predatory

---

### 1.3 UX Ethics (Non-Negotiable)
- No fake activity
- No fake urgency
- No deceptive wording
- No pressure-based mechanics

Fun is allowed.  
Manipulation is not.

---

## 2. Visual & Cultural Inspiration  
### (Korean Playground & Festival Vibes)

The park should subtly evoke **modern Korean childhood memories**.

This inspiration is **atmospheric and emotional**, not literal.

Designers should think of:
- school playgrounds
- neighborhood festivals
- simple games after school
- amusement park snacks and stands
- warm, familiar textures

Avoid:
- violent themes
- elimination imagery
- dark or threatening symbols
- direct references to Squid Game or any specific IP

The goal is a feeling of:
> “This reminds me of being a kid, but I can’t quite explain why.”

---

### 2.1 Childhood Motifs & Micro-Details (Important)

To reinforce the amusement park feeling, the UI may include **small, tasteful visual details** inspired by Korean childhood experiences.

These elements must remain:
- subtle
- decorative
- non-intrusive
- lightweight (performance-friendly)

They should **never affect gameplay logic** or block interactions.

---

#### A. Snack & Treat Inspirations (Visual Only)

Designers may draw inspiration from:
- **달고나 (Dalgona candy)**  
  - honeycomb textures  
  - warm caramel colors  
  - simple geometric cut-out shapes  
- **솜사탕 (Cotton candy)**  
  - soft gradients  
  - fluffy, cloud-like backgrounds  
- **아이스바 / 슬러시**  
  - refreshing pastel tones  
- **축제 간식 노점** (festival snack stands)  
  - striped patterns  
  - signage-style labels  

Usage examples:
- background textures
- empty-state illustrations
- section dividers
- loading visuals
- helper / park staff illustrations

---

#### B. Schoolyard & Playground Cues

Optional inspiration:
- chalk-like outlines
- simple line drawings
- hopscotch / playground markings (abstract)
- rounded, toy-like shapes

These should feel:
- playful
- innocent
- familiar

Never competitive or aggressive.

---

#### C. Important Constraints
- These elements are **supporting details**, not the main focus
- No food metaphors for money
- No “consuming” language tied to spending
- No overload — subtlety is key

---

## 3. Language & Vocabulary (Sticky Language)

### 3.1 Absolute Rule
The UI must **never** expose technical wording.

Avoid entirely:
- blockchain
- transaction
- gas
- approve
- smart contract
- oracle
- entropy

---

### 3.2 Amusement Park Vocabulary

| Technical Concept | User-facing Language |
|------------------|----------------------|
| Connect Wallet | **Enter the Park** |
| Disconnect | **Leave the Park** |
| Dashboard | **Park Entrance** |
| Lottery / Game | **Attraction** |
| Buy Tickets | **Play** |
| Pending Action | **Getting things ready…** |
| Winner | **Winner 🎉** |
| Loser | **Thanks for playing!** |
| Jackpot | **Prize** |
| Activity Feed | **Park Announcements** |

---

## 4. Entry Coins & Energy Coins (USDC & XTZ)

### 4.1 Purpose
Explain **what visitors need**, **why they need it**, and **how to get it**,  
without technical explanations or intimidation.

---

### 4.2 Park Staff / Cashier Concept

A friendly **Park Staff** element:
- welcomes visitors
- explains requirements
- checks readiness
- guides users to get what’s missing

The staff feels like:
> “Someone working at the park, here to help.”

---

### 4.3 Entry Coins (USDC)

**Primary name:**  
**Entry Coins**

**Simple explanation:**  
> “Entry Coins are used to play attractions.”

**Clear truth (secondary line):**  
> “Entry Coins are **USDC**, a digital dollar.”

**Why they exist:**  
> “They’re collected together and fairly shared when an attraction ends.”

---

### 4.4 Energy Coins (XTZ)

**Primary name:**  
**Energy Coins**

**Simple explanation:**  
> “Energy Coins keep the park running smoothly.”

**Clear truth (secondary line):**  
> “Energy Coins are **XTZ**, used on Etherlink.”

**Why they exist:**  
> “Some actions need a small amount of energy to be processed.”

---

### 4.5 Getting Coins (Transak)

When coins are missing:

**Tone:** calm and helpful

**Copy example:**  
> “You’re almost ready!  
> The park staff can help you get what you need.”

**CTA:**  
> **Get Coins**

**Behavior:**
- Opens Transak in a new tab
- Clearly marked as external
- Explains coins will be sent to the visitor’s account on Etherlink

---

## 5. Mandatory Disclaimer (First Visit)

### 5.1 Purpose
- Transparency
- Trust
- Legal clarity

---

### 5.2 Behavior
- Shown on first visit
- Blocking
- Must be explicitly accepted
- Stored locally

---

### 5.3 Copy (Recommended)

**Title:**  
> Before you enter the park

**Body:**  
> This park is **experimental**.  
>  
> The rules are enforced by code that has been carefully reviewed and tested, but it has **not been officially audited yet**.  
>  
> This means unexpected things could happen.  
>  
> Please only play with amounts you are comfortable experimenting with.

**CTA:**  
> **I understand — enter the park**

---

## 6. Page Structure (Park Layout)

### Main Pages
- **Park Entrance**
- **All Attractions**
- **Attraction Detail**
- **My Visits**
- **Help & Info**

---

## 7. Park Entrance (Dashboard)

### Purpose
Give visitors a friendly overview of **what’s happening right now**.

Sections:
- Happening Now
- Big Prizes
- Wrapping Up

Curated, calm, welcoming.

---

## 8. Park Announcements (Live Event Feed)

### Purpose
Act like **park announcements**, sharing real moments.

Events include:
- 🎉 A visitor won $X
- ✨ A new attraction opened
- 🌙 An attraction closed quietly (not enough players)

Each event shows:
- friendly icon
- short message
- timestamp (“3 min ago”, “15:42”)

Visible by default, hideable by the user.

---

## 9. Interaction & Performance Rules

- Subtle animations only
- No blocking transitions
- No sound by default
- Must feel smooth on low-end devices

---

## 10. Final Principle

> Neokta should feel like walking through a small amusement park  
> after school —  
> colorful, comforting, and safe —  
> while being honest and responsible.

If something feels noisy, aggressive, or confusing — it does not belong.

---
