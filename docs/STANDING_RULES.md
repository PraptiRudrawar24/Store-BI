# Store BI Standing Rules

1. **Product Name:** The product is strictly called "Store BI". Never "Dukan Book", "Vyapar", or any other name.
2. **Design Adherence:** Follow `/design/DESIGN.md` strictly. Use the provided Tailwind theme tokens, Inter font, sentence case, 8px radius, no shadows/gradients, 48x48px min touch targets, outline icons. Where screens and DESIGN.md disagree, DESIGN.md wins.
3. **ZERO-START RULE:** The app ships with NO sample or seed data. Every KPI, chart, and table starts at 0 or empty, driven only by user inputs. Never hardcode demo numbers in the UI. Every screen must have a designed empty state that explains what to do next and links to the relevant upload action. Percent-change values show "–" when the previous period is 0 (no divide-by-zero).
4. **Responsive Design:** Mobile first at 360px viewport, and scale up to a desktop sidebar layout like the reference screens.
