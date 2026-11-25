// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Markdown } from '@/components/markdown'

describe('Markdown', () => {
  it('renders inline maths with KaTeX', () => {
    const { container } = render(<Markdown source={'Area is $x^2$.'} />)
    expect(container.querySelector('.katex')).not.toBeNull()
  })

  it('turns a blockquote that starts with bold into a callout', () => {
    const { container } = render(<Markdown source={'> **Example**\n> Fifteen percent of 240 is 36.'} />)
    const callout = container.querySelector('[data-callout]')
    expect(callout?.getAttribute('data-callout')).toBe('example')
  })

  it('marks a Trap callout so it can be styled as a warning', () => {
    const { container } = render(<Markdown source={'> **Trap**\n> Different base.'} />)
    expect(container.querySelector('[data-callout="trap"]')).not.toBeNull()
  })

  it('wraps display maths so it scrolls on its own', () => {
    const { container } = render(<Markdown source={'$$\n\\frac{a}{b}\n$$'} />)
    expect(container.querySelector('[data-math-display]')).not.toBeNull()
  })

  it('marks Hindi study text with lang="hi" and the Devanagari face', () => {
    const { container } = render(<Markdown variant="reading" lang="hi" source={'यह 1498 में Calicut था।'} />)
    const root = container.firstElementChild
    expect(root?.getAttribute('lang')).toBe('hi')
    expect(root?.className).toContain('font-hindi')
  })

  it('keeps English study text in the default face', () => {
    const { container } = render(<Markdown variant="reading" lang="en" source={'In 1498.'} />)
    expect(container.firstElementChild?.getAttribute('lang')).toBe('en')
    expect(container.firstElementChild?.className).not.toContain('font-hindi')
  })

  it('wraps a study table in its own scroll box', () => {
    const { container } = render(<Markdown variant="reading" lang="hi" source={'| a | b |\n| --- | --- |\n| 1 | 2 |'} />)
    const box = container.querySelector('[data-table-scroll]')
    expect(box?.className).toContain('overflow-x-auto')
    expect(box?.querySelector('thead th')).not.toBeNull()
  })

  it('renders the याद रखें blockquote as a callout and a plain blockquote as a blockquote', () => {
    const source = '> **याद रखें**\n>\n> - पहला बिंदु\n> - दूसरा बिंदु\n\n> साधारण उद्धरण'
    const { container } = render(<Markdown variant="reading" lang="hi" source={source} />)
    const callout = container.querySelector('aside[data-callout]')
    expect(callout?.getAttribute('data-callout')).toBe('याद-रखें')
    expect(callout?.getAttribute('aria-label')).toBe('याद रखें')
    expect(callout?.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('blockquote')?.textContent).toContain('साधारण उद्धरण')
  })

  it('marks a Hindi question stem with lang="hi" and the reading body size, without being told the language', () => {
    const { container } = render(<Markdown variant="question" source={'विद्युत-चुम्बकीय तरंगों का वेग होता है'} />)
    const root = container.firstElementChild
    expect(root?.getAttribute('lang')).toBe('hi')
    expect(root?.className).toContain('font-hindi')
    expect(root?.className).toContain('text-[17px]')
    expect(root?.className).toContain('md:text-[18px]')
  })

  it('leaves an English question without a lang attribute', () => {
    const { container } = render(<Markdown variant="question" source={'Which of the above is correct?'} />)
    expect(container.firstElementChild?.hasAttribute('lang')).toBe(false)
  })

  it('never styles a callout title in a question or explanation as tracked uppercase mono', () => {
    const { container } = render(<Markdown variant="explanation" source={'> **याद रखें**\n> पहला बिंदु'} />)
    const callout = container.querySelector('[data-callout]')
    expect(callout?.className).not.toMatch(/uppercase|tracking-|figures/)
  })

  it('renders an option inline, without a paragraph', () => {
    const { container } = render(<Markdown variant="option" source={'$25\\%$'} />)
    expect(container.querySelector('p')).toBeNull()
    expect(container.querySelector('.katex')).not.toBeNull()
  })
})
