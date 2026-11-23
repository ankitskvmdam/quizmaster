---
slug: successive-change
title: Successive percentage change
position: 2
---

## Changes multiply, they don't add

A change of $+r\%$ multiplies a value by $\left(1 + \dfrac{r}{100}\right)$. A change of $-r\%$ multiplies it by $\left(1 - \dfrac{r}{100}\right)$. Two changes in a row multiply both factors.

> **Example**
> Up $20\%$, then down $20\%$: $1.2 \times 0.8 = 0.96$. The value ends $4\%$ **lower**, not back where it started.

## The one-line formula

For two successive changes of $a\%$ and $b\%$ (use negative numbers for decreases):

$$
\text{net change \%} = a + b + \frac{ab}{100}
$$

> **Example**
> Successive discounts of $20\%$ and $10\%$: $-20 - 10 + \dfrac{(-20)(-10)}{100} = -28$. That is a single discount of $28\%$, not $30\%$.

> **Shortcut**
> Area of a rectangle when length goes up $20\%$ and breadth goes down $10\%$:
> $20 - 10 + \dfrac{20 \times (-10)}{100} = 8$, so the area rises $8\%$.

## Growth over several years

A population or amount growing $r\%$ a year for $n$ years ends at

$$
P\left(1 + \frac{r}{100}\right)^{n}
$$

> **Example**
> $50{,}000$ growing $10\%$ a year for $2$ years: $50{,}000 \times 1.1^2 = 50{,}000 \times 1.21 = 60{,}500$.

## Working backwards

If a value ended at $F$ after changes with factors $f_1, f_2, \dots$, the original is $F \div (f_1 f_2 \cdots)$.

> **Example**
> After $+12\%$ and then $+25\%$ a value is $2{,}800$. The factors give $1.12 \times 1.25 = 1.4$, so the original was $2{,}800 \div 1.4 = 2{,}000$.

## Keeping spending the same

If a price rises $r\%$, consumption must fall by

$$
\frac{r}{100 + r} \times 100\%
$$

to keep spending the same.

> **Trap**
> A $25\%$ price rise needs a $\dfrac{25}{125} = 20\%$ cut in consumption, not a $25\%$ cut.
